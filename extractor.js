/**
 * M2y v2.10.2 - Content Script Extractor
 * Mantém 100% da arquitetura base + expansões:
 * - Delay aleatório (min-max configurável)
 * - Modo stealth (simulação humana)
 * - Pause/Resume
 * - Detecção de bloqueio
 * - Filtros avançados (aplicados no background)
 * - Extração de e-mails
 * - Extração de horários detalhados
 */

function resolveFirst(selectors, root = document, field = 'unknown') {
  for (const selector of selectors) { try { const node = root.querySelector(selector); if (node) return node; } catch (_) {} }
  try { logToBackground('WARNING', 'selector_failure', { field, selectors, url: location.href }); } catch (_) {}
  return null;
}
function resolveAll(selectors, root = document) {
  const nodes = []; const seen = new Set();
  for (const selector of selectors) { try { root.querySelectorAll(selector).forEach(node => { if (!seen.has(node)) { seen.add(node); nodes.push(node); } }); } catch (_) {} }
  return nodes;
}

let state = {
  isExtracting: false,
  isPaused: false,
  config: null,
  advancedConfig: null,
  executionId: null,
  count: 0,
  extractedIds: new Set(),
  globalDeduplicationCache: new Set(),
  blockingScore: 0,
  consecutiveErrors: 0
};

// ============================================================
// LISTENER DE MENSAGENS
// ============================================================
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case 'ping':
      sendResponse({ success: true });
      break;

    case 'startExtraction':
      start(message.config, message.advancedConfig, message.executionId);
      sendResponse({ success: true });
      break;

    case 'stopExtraction':
      state.isExtracting = false;
      state.isPaused = false;
      sendResponse({ success: true });
      break;

    case 'pauseExtraction':
      state.isPaused = true;
      sendResponse({ success: true });
      break;

    case 'resumeExtraction':
      state.isPaused = false;
      sendResponse({ success: true });
      break;
  }
  return true;
});

// ============================================================
// INICIAR EXTRAÇÃO
// ============================================================
async function start(config, advancedConfig, executionId) {
  state.isExtracting = true;
  state.isPaused = false;
  state.config = config || {};
  state.advancedConfig = advancedConfig || {};
  state.executionId = executionId;
  state.count = 0;
  state.extractedIds = new Set();
  // Carregar cache global de deduplicação do storage
  const stored = await chrome.storage.local.get(['globalDeduplicationCache']);
  state.globalDeduplicationCache = new Set(stored.globalDeduplicationCache || []);
  console.log(`[M2y] Cache de deduplicação carregado: ${state.globalDeduplicationCache.size} itens`);
  state.blockingScore = 0;
  state.consecutiveErrors = 0;

  console.log(`[M2y v2.10.2] Iniciando extração: ${executionId}`);
  logToBackground('INFO', 'extraction_started', { executionId, config });

  try {
    await runExtractionLoop();
  } catch (error) {
    console.error('[M2y v2.10.2] Erro fatal:', error);
    logToBackground('ERROR', 'error_occurred', { error: error.message });
  } finally {
    state.isExtracting = false;
    chrome.runtime.sendMessage({
      action: 'extractionFinished',
      executionId: state.executionId,
      total: state.count
    });
  }
}

// ============================================================
// ESPERA ROBUSTA DA PRIMEIRA CARGA DO GOOGLE MAPS
// ============================================================
async function waitForInitialResults(timeoutMs = 30000) {
  const startedAt = Date.now();
  let feed = null;
  let lastCardCount = 0;
  let stableReads = 0;

  while (state.isExtracting && Date.now() - startedAt < timeoutMs) {
    feed = resolveFirst(['[role="feed"]', 'div[role="main"]', 'div[aria-label*="Resultados"]'], document, 'feed');
    const cards = resolveAll(['a[href*="/maps/place/"]', 'a[data-item-id*="place"]', '[role="feed"] a[href*="/maps/"]']);
    const loading = resolveFirst(['[role="progressbar"]', '.whitsp', '.m6QErb[aria-busy="true"]'], document, 'loading');

    if (feed && cards.length > 0) {
      if (cards.length === lastCardCount) stableReads += 1;
      else stableReads = 0;
      lastCardCount = cards.length;
      // Duas leituras consecutivas evitam clicar enquanto o Maps ainda recompõe a lista.
      if (stableReads >= 2 || !loading) return feed;
    }
    await sleep(400);
  }

  if (!state.isExtracting) return null;
  feed = resolveFirst(['[role="feed"]', 'div[role="main"]', 'div[aria-label*="Resultados"]'], document, 'feed');
  if (!feed) throw new Error('Feed de resultados não encontrado após aguardar carregamento');
  return feed;
}

async function waitForPlaceDetails(timeoutMs = 10000) {
  const startedAt = Date.now();
  while (state.isExtracting && Date.now() - startedAt < timeoutMs) {
    const title = resolveFirst(['h1.DUwDvf', 'h1[aria-label]', 'div[role="main"] h1'], document, 'place_title');
    if (title?.textContent?.trim()) return true;
    await sleep(250);
  }
  return Boolean(resolveFirst(['h1.DUwDvf', 'h1[aria-label]', 'div[role="main"] h1'], document, 'place_title_final')?.textContent?.trim());
}

// ============================================================
// LOOP PRINCIPAL DE EXTRAÇÃO
// ============================================================
async function runExtractionLoop() {
  const feed = await waitForInitialResults();
  if (!feed) return;

  let scrollAttempts = 0;
  const maxScrolls = state.config.max_scroll_attempts || 50;
  let lastHeight = 0;
  let noNewLeadsCount = 0;

  while (state.isExtracting && state.count < (state.config.max_leads || 15)) {

    // Aguardar se pausado
    while (state.isPaused && state.isExtracting) {
      await sleep(500);
    }
    if (!state.isExtracting) break;

    const newLeads = await extractVisible(feed);

    // Scroll com comportamento humano (stealth)
    if (state.advancedConfig?.stealthMode) {
      await stealthScroll(feed);
    } else {
      feed.scrollTo(0, feed.scrollHeight);
      await sleep(500);
    }

    // Detecção de fim de lista
    const currentHeight = feed.scrollHeight;
    const endOfListEl = document.querySelector('.HlvSq');
    const heightStagnant = currentHeight === lastHeight && scrollAttempts > 12;

    if (endOfListEl || (heightStagnant && noNewLeadsCount >= 12)) {
      console.log('[M2y v2.10.2] Fim da lista detectado.');
      logToBackground('INFO', 'end_of_list_reached', { count: state.count });
      break;
    }

    if (newLeads === 0) {
      scrollAttempts++;
      noNewLeadsCount++;
      // Detectar possível bloqueio se muitos scrolls sem novos leads
      if (noNewLeadsCount >= 8) {
        state.blockingScore++;
        if (state.blockingScore >= 3) {
          logToBackground('WARNING', 'blocking_detected', { score: state.blockingScore });
          chrome.runtime.sendMessage({ action: 'blockingDetected' });
          state.blockingScore = 0;
          noNewLeadsCount = 0;
          // Espera extra anti-bloqueio
          await sleep(randomBetween(5000, 10000));
        }
      }
    } else {
      scrollAttempts = 0;
      noNewLeadsCount = 0;
      state.blockingScore = Math.max(0, state.blockingScore - 1);
    }

    if (scrollAttempts >= maxScrolls && state.count < (state.config.max_leads || 15)) {
      logToBackground('WARNING', 'max_scrolls_reached', { count: state.count, target: state.config.max_leads });
      break;
    }

    lastHeight = currentHeight;

    // Sincronizar cache periodicamente (a cada loop de scroll)
    const syncStored = await chrome.storage.local.get(['globalDeduplicationCache']);
    if (syncStored.globalDeduplicationCache) {
      syncStored.globalDeduplicationCache.forEach(id => state.globalDeduplicationCache.add(id));
    }

    chrome.runtime.sendMessage({
      action: 'progress',
      executionId: state.executionId,
      count: state.count
    });
  }
}

// ============================================================
// EXTRAIR LEADS VISÍVEIS
// ============================================================
async function extractVisible(feed) {
  const cards = document.querySelectorAll('a[href*="/maps/place/"]');
  let added = 0;

  for (const card of cards) {
    if (!state.isExtracting || state.count >= (state.config.max_leads || 15)) break;

    // Aguardar se pausado
    while (state.isPaused && state.isExtracting) {
      await sleep(900);
    }
    if (!state.isExtracting) break;

    const href = card.getAttribute('href');
    
    // Verificação rápida por URL (evita re-processar o mesmo card no mesmo scroll)
    if (state.extractedIds.has(href)) continue;

    // Extração preliminar do Place ID para deduplicação absoluta antes do clique
    const placeIdMatch = href.match(/!1s([^!]+)/);
    const placeId = placeIdMatch ? `pid_${placeIdMatch[1]}` : null;
    
    if (placeId && state.globalDeduplicationCache.has(placeId)) {
      console.log(`[M2y] Lead já extraído (Deduplicação Absoluta - PlaceID): ${placeId}`);
      state.extractedIds.add(href); // Marcar como processado para este loop
      continue;
    }

    try {
      logToBackground('INFO', 'lead_extraction_started', {
        index: state.count + 1,
        total: state.config.max_leads
      });

      // Simular comportamento humano antes do clique
      if (state.advancedConfig?.stealthMode) {
        await humanMouseMove(card);
        await sleep(randomBetween(200, 600));
      }

      card.click();
      // O primeiro resultado costuma abrir a ficha mais lentamente que os seguintes.
      const detailsReady = await waitForPlaceDetails(Math.max(10000, state.config.timeout_ms || 30000));
      if (!detailsReady) {
        state.consecutiveErrors++;
        logToBackground('WARNING', 'place_details_timeout', { href });
        continue;
      }
      await sleep(randomBetween(300, 700));

      const lead = parseFullDetails();
      if (!lead) {
        state.consecutiveErrors++;
        continue;
      }

      // --- SISTEMA DE DEDUPLICAÇÃO ABSOLUTA ---
      // Gerar ID único baseado em Place ID (da URL) + Hash (Nome, Endereço, Tel)
      const uniqueId = getUniqueLeadId(lead, href);
      
      if (state.advancedConfig?.ignoreDuplicates !== false && state.globalDeduplicationCache.has(uniqueId)) {
        console.log(`[M2y] Lead duplicado ignorado (Deduplicação Absoluta): ${lead.name} [${uniqueId}]`);
        logToBackground('INFO', 'duplicate_ignored', { name: lead.name, id: uniqueId });
        state.extractedIds.add(href);
        continue;
      }
      // ----------------------------------------

      const contextResult = validateConfiguredContext(lead);
      lead.context_score = contextResult.score;
      lead.context_match_details = contextResult.details;
      lead.requested_category = state.config?.queryContext?.category || '';
      lead.requested_city = state.config?.queryContext?.city || '';
      lead.requested_state = state.config?.queryContext?.state || '';
      lead.requested_radius = state.config?.queryContext?.radius || '';
      lead.match_category = contextResult.category;
      lead.match_location = contextResult.location;
      lead.overall_relevance_score = contextResult.score;
      const acceptScore = Number(state.advancedConfig?.contextAcceptScore ?? 80);
      const reviewScore = Number(state.advancedConfig?.contextReviewScore ?? 50);
      if (state.advancedConfig?.strictQueryMatch !== false && (contextResult.score < acceptScore || contextResult.score < reviewScore)) {
        lead.rejection_reason = contextResult.category === 'mismatch' ? 'categoria incompatível' : contextResult.location === 'mismatch' ? 'cidade ou UF incorreta' : 'score abaixo do limite';
        logToBackground('WARNING', 'query_context_mismatch', { name: lead.name, category: contextResult.category, location: contextResult.location, score: contextResult.score, acceptScore, reviewScore, reason: lead.rejection_reason });
        state.extractedIds.add(href);
        continue;
      }
      if (!passesConfiguredLeadFilters(lead)) {
        logToBackground('INFO', 'lead_filtered_before_capture', { name: lead.name });
        state.extractedIds.add(href);
        continue;
      }

      // Busca externa de redes sociais
      if (state.advancedConfig?.extractSocial !== false) {
        if (!lead.social_instagram || !lead.social_facebook) {
          try {
            const searchResponse = await chrome.runtime.sendMessage({
              action: 'externalSearch',
              query: `${lead.name} ${lead.city} instagram facebook`
            });
            if (searchResponse?.success && searchResponse.social) {
              if (!lead.social_instagram) lead.social_instagram = searchResponse.social.instagram;
              if (!lead.social_facebook)  lead.social_facebook  = searchResponse.social.facebook;
              if (searchResponse.social.linkedin) lead.social_others.push(searchResponse.social.linkedin);
              lead.digital_presence = (lead.website !== 'N/A' || lead.social_instagram || lead.social_facebook) ? 'Sim' : 'Não';
            }
          } catch (searchError) {
            console.warn('[M2y v2.10.2] Erro na busca externa:', searchError);
          }
        }
      }

      logToBackground('INFO', 'data_collected', {
        name: lead.name,
        phone: lead.phone,
        rating: lead.rating_value
      });

      // Capturar screenshot — o lead só é aceito quando a imagem foi validada.
      let screenshotUrl = null;
      let screenshotAttempts = 0;
      let screenshotError = null;
      try {
        const response = await chrome.runtime.sendMessage({ action: 'captureStrategicScreenshot', leadName: lead.name, executionId: state.executionId });
        screenshotUrl = response?.screenshotUrl || null;
        screenshotAttempts = response?.attempts || 1;
        if (!/^data:image\/(jpeg|jpg|png);base64,/.test(screenshotUrl || '') || screenshotUrl.length < 1000) throw new Error('Screenshot retornado inválido ou vazio');
      } catch (ssError) {
        screenshotError = ssError?.message || String(ssError);
        logToBackground('ERROR', 'screenshot_failed', { error: screenshotError, attempts: screenshotAttempts });
      }
      if (!screenshotUrl) {
        logToBackground('WARNING', 'lead_skipped_without_screenshot', { name: lead.name, error: screenshotError });
        continue;
      }
      const finalLead = { ...lead, google_maps_url: href, screenshot: screenshotUrl, screenshot_status: 'captured', screenshot_attempts: screenshotAttempts, screenshot_captured_at: new Date().toISOString(), screenshot_required: true };
      finalLead.quality_score = calculateLeadQuality(finalLead, state.advancedConfig);
      finalLead.missing_fields = getMissingLeadFields(finalLead, state.advancedConfig);
      const result = await chrome.runtime.sendMessage({
        action: 'leadExtracted',
        executionId: state.executionId,
        advancedConfig: state.advancedConfig,
        lead: finalLead
      });

      state.extractedIds.add(href);
      if (!result?.accepted) continue;
      const uniqueIdFinal = getUniqueLeadId(finalLead, href);
      state.globalDeduplicationCache.add(uniqueIdFinal);
      saveGlobalCache();
      state.count++;
      added++;
      state.consecutiveErrors = 0;

      // Delay aleatório (anti-bloqueio)
      const delayMs = getRandomDelay();
      logToBackground('INFO', 'delay_started', {
        duration_ms: delayMs,
        duration_seconds: (delayMs / 1000).toFixed(1)
      });

      await humanDelay(delayMs);

      logToBackground('INFO', 'delay_finished', { next_extraction: state.count + 1 });

    } catch (e) {
      console.warn('[M2y v2.10.2] Erro ao processar card:', e);
      state.consecutiveErrors++;
      logToBackground('ERROR', 'error_occurred', { error: e.message });

      // Se muitos erros consecutivos, possível bloqueio
      if (state.consecutiveErrors >= 5) {
        chrome.runtime.sendMessage({ action: 'blockingDetected' });
        state.consecutiveErrors = 0;
        await sleep(randomBetween(8000, 15000));
      }
    }
  }
  return added;
}

// ============================================================
// PARSER COMPLETO DE DETALHES
// ============================================================
function parseFullDetails() {
  const name = resolveFirst(['h1.DUwDvf', 'h1[aria-label]', 'div[role="main"] h1'], document, 'place_title')?.textContent?.trim() || 'N/A';
  if (name === 'N/A') return null;

  // Avaliação
  const shouldExtractReviews = state.advancedConfig?.extractReviews !== false;
  const ratingEl  = shouldExtractReviews ? document.querySelector('div.F7nice span[aria-hidden="true"]') : null;
  const rating    = ratingEl ? parseFloat(ratingEl.textContent.replace(',', '.')) : null;
  const reviewsEl = shouldExtractReviews ? document.querySelector('div.F7nice span[aria-label*="avalia"]') : null;
  const reviews   = reviewsEl ? parseInt(reviewsEl.textContent.replace(/\D/g, '')) : 0;

  // Categoria
  const categoryBtn  = resolveFirst(['button.DkEaL', 'button[aria-label*="categoria"]', '[role="main"] button'], document, 'category');
  const mainCategory = categoryBtn?.textContent?.trim() || 'N/A';
  const macroCategory = determineMacroCategory(mainCategory);

  // Botões de informação
  const infoButtons = resolveAll(['button[data-item-id]', '[role="main"] button[data-item-id]', 'a[data-item-id]'], document);
  let address  = 'N/A';
  let phone    = 'N/A';
  let website  = 'N/A';
  let plusCode = 'N/A';

  infoButtons.forEach(btn => {
    const id   = btn.getAttribute('data-item-id');
    const text = btn.querySelector('.Io6YTe')?.textContent?.trim() || '';
    if (id === 'address')           address  = text;
    else if (id?.startsWith('phone:tel:')) phone = text;
    else if (id === 'authority')    website  = text;
    else if (id === 'oloc')         plusCode = text;
  });

  // Cidade e Estado
  const { city, state: uf } = parseAddress(address);

  // Status
  const statusEl   = document.querySelector('.Z46o9e, .m6QErb.W4Efsd .W4Efsd:last-child');
  const statusText = statusEl?.textContent?.toLowerCase() || '';
  const status = (statusText.includes('fechado temporariamente') || statusText.includes('encerrado'))
    ? 'Encerrado' : 'Ativo';

  // Horários de funcionamento (detalhado)
  let hours = 'N/A';
  if (state.advancedConfig?.extractHours !== false) {
    const hoursEl = document.querySelector('div.Oq9Suf, div.t39EBf');
    if (hoursEl) hours = normalizeHoursText(hoursEl.getAttribute('aria-label') || hoursEl.textContent?.trim() || 'N/A');
    // Tentar tabela de horários expandida
    const hoursTable = document.querySelectorAll('table.WgFkxc tr');
    if (hoursTable.length > 0) {
      const hoursArr = [];
      hoursTable.forEach(row => {
        const day  = row.querySelector('td:first-child')?.textContent?.trim();
        const time = row.querySelector('td:last-child')?.textContent?.trim();
        if (day && time) hoursArr.push(`${day} | ${time}`);
      });
      if (hoursArr.length > 0) hours = hoursArr.map(normalizeHoursText).join('\n');
    }
  }

  // Descrição
  const description = document.querySelector('div.PYvS2b')?.textContent?.trim() || 'N/A';

  // Redes sociais
  const socialLinks = (state.advancedConfig?.extractSocial !== false) ? extractSocialLinks() : { facebook: null, instagram: null, others: [] };

  // E-mails (quando disponível)
  let emails = [];
  if (state.advancedConfig?.extractEmails) {
    emails = extractEmails();
  }

  // Coordenadas (da URL)
  const coords = extractCoordinates();

  return {
    id_interno: generateInternalId(),
    name,
    category_main: mainCategory,
    category_sub: 'N/A',
    category_macro: macroCategory,
    city,
    state: uf,
    phone,
    website,
    emails: emails.join(', ') || 'N/A',
    social_instagram: socialLinks.instagram,
    social_facebook:  socialLinks.facebook,
    social_others:    socialLinks.others,
    digital_presence: (website !== 'N/A' || socialLinks.instagram || socialLinks.facebook) ? 'Sim' : 'Não',
    rating_formatted: rating ? `${rating} ⭐ (${reviews} avaliações)` : 'N/A',
    rating_value: rating,
    reviews_count: reviews,
    address,
    plus_code: plusCode,
    status,
    hours,
    description,
    latitude:  coords.lat,
    longitude: coords.lng,
    quality_score: calculateLeadQuality({ name, category_main: mainCategory, address, phone, website, hours, rating_value: rating, screenshot: null }, state.advancedConfig),
    missing_fields: getMissingLeadFields({ name, category_main: mainCategory, address, phone, website, hours, rating_value: rating }, state.advancedConfig),
    extracted_at: new Date().toISOString()
  };
}

function getMissingLeadFields(lead, prefs = {}) {
  const required = ['name', 'category_main', 'address', 'screenshot'];
  if (prefs.filterPhone) required.push('phone');
  if (prefs.filterWebsite) required.push('website');
  if (prefs.extractHours !== false) required.push('hours');
  if (prefs.extractReviews !== false) required.push('rating_value');
  return required.filter(key => !lead[key] || lead[key] === 'N/A').map(key => ({ name: key }));
}

function calculateLeadQuality(lead, prefs = {}) {
  const weights = { name: 10, category_main: 10, address: 10, phone: 15, website: 15, hours: 10, rating_value: 10, screenshot: 15, digital_presence: 5 };
  const disabled = new Set();
  if (prefs.extractHours === false) disabled.add('hours');
  if (prefs.extractReviews === false) disabled.add('rating_value');
  if (prefs.extractSocial === false && (!lead.website || lead.website === 'N/A')) disabled.add('digital_presence');
  const activeWeights = Object.entries(weights).filter(([key]) => !disabled.has(key));
  const earned = activeWeights.reduce((score, [key, weight]) => score + (lead[key] && lead[key] !== 'N/A' ? weight : 0), 0);
  const total = activeWeights.reduce((sum, [, weight]) => sum + weight, 0) || 1;
  return Math.round((earned / total) * 100);
}

function normalizeMatchText(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}

function validateConfiguredContext(lead) {
  const context = state.config?.queryContext || {};
  if (context.freeSearch || context.freeQuery) return { category: 'not_configured', location: 'not_configured', score: 100, details: {} };
  const requestedCategories = String(context.category || '').split(',').map(normalizeMatchText).filter(Boolean);
  const actualCategory = normalizeMatchText(`${lead.category_main || ''} ${lead.category_macro || ''} ${lead.name || ''} ${lead.description || ''}`);
  let category = 'unknown'; let categoryScore = requestedCategories.length ? 60 : 100;
  if (requestedCategories.length && actualCategory) {
    const exact = requestedCategories.some(requested => requested === actualCategory || actualCategory.includes(requested));
    const tokens = requestedCategories.flatMap(x => x.split(' ')).filter(token => token.length > 3);
    const overlap = tokens.filter(token => actualCategory.includes(token)).length;
    category = exact ? 'match' : overlap ? 'related' : 'mismatch';
    categoryScore = exact ? 100 : overlap ? 80 : 0;
  }
  const expectedCity = normalizeMatchText(context.city); const expectedState = normalizeMatchText(context.state);
  const actualCity = normalizeMatchText(lead.city); const actualState = normalizeMatchText(lead.state);
  let location = 'unknown'; let locationScore = (expectedCity || expectedState) ? 60 : 100;
  const cityMatch = expectedCity && actualCity && (actualCity.includes(expectedCity) || expectedCity.includes(actualCity));
  const stateMatch = expectedState && actualState && expectedState === actualState;
  const cityMismatch = expectedCity && actualCity && !cityMatch; const stateMismatch = expectedState && actualState && !stateMatch;
  if (cityMismatch || stateMismatch) { location = 'mismatch'; locationScore = 0; }
  else if (cityMatch && stateMatch) { location = 'match'; locationScore = 100; }
  else if (cityMatch || stateMatch) { location = 'related'; locationScore = 80; }
  const nameScore = lead.name && lead.name !== 'N/A' ? 100 : 0;
  const addressScore = lead.address && lead.address !== 'N/A' ? 100 : 0;
  const relevanceScore = Math.round((categoryScore * 0.45) + (locationScore * 0.35) + (nameScore * 0.1) + (addressScore * 0.1));
  return { category, location, score: relevanceScore, details: { categoryScore, locationScore, nameScore, addressScore, relevanceScore, expectedCity, expectedState, actualCity, actualState } };
}

function passesConfiguredLeadFilters(lead) {
  const prefs = state.advancedConfig || {};
  if (prefs.filterPhone && (!lead.phone || lead.phone === 'N/A')) return false;
  if (prefs.filterWebsite && (!lead.website || lead.website === 'N/A')) return false;
  if (prefs.ignoreClosed && lead.status === 'Encerrado') return false;
  if (Number(prefs.minRating) > 0 && (Number(lead.rating_value) || 0) < Number(prefs.minRating)) return false;
  return true;
}

// Converte texto concatenado do Google Maps para linhas: "Dia-feira | HH:MM–HH:MM".
function normalizeHoursText(value) {
  if (!value) return 'N/A';
  let text = String(value).replace(/[\uE000-\uF8FF�]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!text || /^n\/a$/i.test(text)) return 'N/A';
  text = text.replace(/(domingo|segunda|terça|quarta|quinta|sexta|sábado)\s*[–—-]\s*feira/gi, '$1-feira');
  text = text.replace(/\s*[-–—]\s*/g, '–');
  const dayNames = ['domingo','segunda-feira','terça-feira','quarta-feira','quinta-feira','sexta-feira','sábado'];
  const dayPattern = new RegExp(`(${dayNames.join('|')})`, 'gi');
  const matches = [...text.matchAll(dayPattern)];
  if (!matches.length) return text;
  const output = matches.map((match, index) => {
    const day = match[1].toLowerCase().replace(/(^|[- ])([a-záéíóúãõç])/g, (_, p, c) => p + c.toUpperCase());
    const end = index + 1 < matches.length ? matches[index + 1].index : text.length;
    let suffix = text.slice(match.index + match[0].length, end).replace(/^[\s,:;|–-]+/, '').trim();
    const holiday = suffix.match(/\(([^)]+)\)/)?.[1];
    const ranges = suffix.match(/\d{1,2}:\d{2}\s*–\s*\d{1,2}:\d{2}(?:\s*,\s*\d{1,2}:\d{2}\s*–\s*\d{1,2}:\d{2})*/);
    if (ranges) return `${day}${holiday ? ` (${holiday})` : ''} | ${ranges[0].replace(/\s*–\s*/g, '–')}`;
    if (/fechado|closed/i.test(suffix)) return `${day}${holiday ? ` (${holiday})` : ''} | Fechado`;
    return `${day}${suffix ? ` | ${suffix}` : ''}`;
  });
  return output.join('\n');
}

// ============================================================
// EXTRAÇÃO DE E-MAILS
// ============================================================
function extractEmails() {
  const emails = new Set();
  const text = document.body.innerText || '';
  const emailRegex = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
  const matches = text.match(emailRegex) || [];
  matches.forEach(e => {
    // Filtrar e-mails do Google
    if (!e.includes('@google') && !e.includes('@goo.gl')) {
      emails.add(e.toLowerCase());
    }
  });
  return Array.from(emails).slice(0, 3);
}

// ============================================================
// EXTRAÇÃO DE COORDENADAS
// ============================================================
function extractCoordinates() {
  try {
    const url = window.location.href;
    const match = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (match) return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
  } catch (e) {}
  return { lat: null, lng: null };
}

// ============================================================
// MACRO CATEGORIA
// ============================================================
function determineMacroCategory(category) {
  const mapping = {
    'Alimentação': ['Restaurante', 'Padaria', 'Café', 'Lanchonete', 'Bar', 'Pizzaria', 'Confeitaria', 'Sorveteria'],
    'Saúde': ['Médico', 'Clínica', 'Hospital', 'Dentista', 'Farmácia', 'Laboratório', 'Psicólogo'],
    'Serviços': ['Advogado', 'Contador', 'Oficina', 'Salão', 'Estética', 'Lavanderia', 'Conserto'],
    'Varejo': ['Loja', 'Supermercado', 'Shopping', 'Comércio', 'Mercado', 'Boutique'],
    'Educação': ['Escola', 'Faculdade', 'Curso', 'Universidade', 'Colégio', 'Instituto'],
    'Hospedagem': ['Hotel', 'Pousada', 'Hostel', 'Motel', 'Resort'],
    'Beleza': ['Salão', 'Barbearia', 'Manicure', 'Estética', 'Spa'],
    'Tecnologia': ['Informática', 'Assistência Técnica', 'Celular', 'Computador']
  };

  for (const [macro, keywords] of Object.entries(mapping)) {
    if (keywords.some(k => category.toLowerCase().includes(k.toLowerCase()))) {
      return macro;
    }
  }
  return 'Outros';
}

// ============================================================
// PARSE DE ENDEREÇO
// ============================================================
function parseAddress(address) {
  if (!address || address === 'N/A') return { city: 'N/A', state: 'N/A', number: 'N/A', neighborhood: 'N/A', cep: 'N/A' };
  const parts = String(address).split(',').map(p => p.trim()).filter(Boolean);
  const knownUf = new Set('AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' '));
  const result = { city: 'N/A', state: 'N/A', number: 'N/A', neighborhood: 'N/A', cep: String(address).match(/\b\d{5}-?\d{3}\b/)?.[0] || 'N/A' };
  const numberMatch = parts[0]?.match(/\b(\d+[A-Za-z]?)\b/) || parts[1]?.match(/^\s*(\d+[A-Za-z]?)\s*$/); if (numberMatch) result.number = numberMatch[1];
  const ufIndex = parts.findIndex(part => knownUf.has(part.toUpperCase()) || /(?:^|[-/ ])([A-Z]{2})\b/i.test(part));
  if (ufIndex >= 0) { const match = parts[ufIndex].match(/(?:^|[-/ ])([A-Z]{2})\b/i); result.state = (match?.[1] || parts[ufIndex]).toUpperCase(); const city = parts[ufIndex].split(/[-/]/)[0].trim(); result.city = knownUf.has(city.toUpperCase()) ? (parts[ufIndex - 1] || 'N/A') : city; }
  else if (parts.length >= 2) result.city = parts[parts.length - 1].replace(/\b\d{5}-?\d{3}\b/, '').trim() || 'N/A';
  if (parts.length >= 3) result.neighborhood = result.number !== 'N/A' ? (parts[2] || 'N/A') : (parts[1] || 'N/A');
  return result;
}

// ============================================================
// EXTRAÇÃO DE REDES SOCIAIS
// ============================================================
function extractSocialLinks() {
  const result = { facebook: null, instagram: null, others: [] };
  const allLinks = document.querySelectorAll('a[href]');

  allLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (!href) return;
    if ((href.includes('facebook.com') || href.includes('fb.com')) && !result.facebook) {
      result.facebook = href;
    } else if (href.includes('instagram.com') && !result.instagram) {
      result.instagram = href;
    } else if (
      href.includes('linkedin.com') || href.includes('twitter.com') ||
      href.includes('youtube.com')  || href.includes('tiktok.com')
    ) {
      if (!result.others.includes(href)) result.others.push(href);
    }
  });

  return result;
}

// ============================================================
// UTILITÁRIOS ANTI-BLOQUEIO
// ============================================================
function generateInternalId() {
  return 'M2Y-' + Math.random().toString(36).substr(2, 9).toUpperCase();
}

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function getRandomDelay() {
  const minMs = (state.config.delay_min_s || 2) * 1000;
  const maxMs = (state.config.delay_max_s || 5) * 1000;
  return randomBetween(minMs, maxMs);
}

// Delay com contador regressivo (mantém compatibilidade)
async function humanDelay(delayMs) {
  const step = 500;
  let remaining = delayMs;
  while (remaining > 0 && state.isExtracting) {
    // Aguardar se pausado
    while (state.isPaused && state.isExtracting) {
      await sleep(200);
    }
    await sleep(Math.min(step, remaining));
    remaining -= step;
  }
}

// Simulação de scroll humano (stealth)
async function stealthScroll(feed) {
  const totalScroll = feed.scrollHeight - feed.scrollTop - feed.clientHeight;
  if (totalScroll <= 0) return;

  const steps = randomBetween(3, 7);
  const stepSize = Math.floor(totalScroll / steps);

  for (let i = 0; i < steps; i++) {
    if (!state.isExtracting) break;
    feed.scrollBy(0, stepSize + randomBetween(-20, 20));
    await sleep(randomBetween(80, 200));
  }
  await sleep(randomBetween(300, 700));
}

// Simulação de movimento de mouse (stealth)
async function humanMouseMove(element) {
  try {
    const rect = element.getBoundingClientRect();
    const x = rect.left + randomBetween(5, rect.width - 5);
    const y = rect.top  + randomBetween(5, rect.height - 5);

    element.dispatchEvent(new MouseEvent('mousemove', {
      bubbles: true, clientX: x, clientY: y
    }));
    await sleep(randomBetween(50, 150));
    element.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    await sleep(randomBetween(100, 300));
  } catch (e) { /* silencioso */ }
}

// ============================================================
// LOG PARA BACKGROUND
// ============================================================
function logToBackground(level, event, details) {
  chrome.runtime.sendMessage({ action: 'log', level, event, details }).catch(() => {});
}

// Auxiliares para Deduplicação
function getUniqueLeadId(lead, url) {
  let placeId = null;
  if (url) {
    const match = url.match(/!1s([^!]+)/);
    if (match && match[1]) placeId = match[1];
  }
  
  if (placeId) return `pid_${placeId}`;
  
  // Fallback: Hash de Nome + Endereço + Telefone
  const raw = `${lead.name}|${lead.address}|${lead.phone}`.toLowerCase().replace(/\s+/g, '');
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = ((hash << 5) - hash) + raw.charCodeAt(i);
    hash |= 0;
  }
  return `hash_${Math.abs(hash).toString(16)}`;
}

async function saveGlobalCache() {
  const cacheArray = Array.from(state.globalDeduplicationCache);
  // Limpeza inteligente: manter apenas os últimos 10.000 IDs para evitar estouro de memória
  if (cacheArray.length > 10000) {
    cacheArray.splice(0, cacheArray.length - 10000);
  }
  chrome.storage.local.set({ globalDeduplicationCache: cacheArray });
}
