/**
 * M2y v2.10.2 - Service Worker (Background)
 * Mantém 100% da arquitetura base + expansões:
 * - Suporte a pause/resume
 * - Notificações de log para popup
 * - Configurações avançadas repassadas ao content script
 * - Anti-bloqueio: detecção e pausa automática
 */

import logger, { LogLevel, LogEvent } from '../modules/logger.js';
import metrics from '../modules/metrics.js';
import { generateUUID, validateLead } from '../modules/utils.js';
import ExecutionManager, { EXECUTION_STATES, ACTIVE } from '../modules/execution-manager.js';
import IdentityResolver from '../modules/identity-resolver.js';
import StorageRepository from '../modules/storage-repository.js';
import ScreenshotStore from '../modules/screenshot-store.js';
import LeadScores from '../modules/lead-scores.js';
import DataQuality from '../modules/data-quality.js';
import CircuitBreaker from '../modules/circuit-breaker.js';
import TaskQueue from '../modules/task-queue.js';
import BackupManager from '../modules/backup-manager.js';
import ErrorClassifier from '../modules/error-classifier.js';
import EVENTS from '../modules/events.js';
import eventBus from '../core/event-bus.js';

const executionManager = new ExecutionManager({
  storage: { get: key => chrome.storage.local.get(key), set: value => chrome.storage.local.set(value), remove: keys => chrome.storage.local.remove(keys) }
});
let currentExecution = {
  id: null, config: null, advancedConfig: null, leads: [], status: EXECUTION_STATES.IDLE,
  query: null, extractedUrls: new Set(), targetTabId: null, startedAt: null, finishedAt: null,
  durationMs: null, reason: null, error: null, finalizedAt: null, dashboardOpened: false
};
const emitExecutionEvent = (event, details = {}) => { try { eventBus.emit(event, { executionId: currentExecution.id, ...details }); } catch (_) {} };
const isActiveStatus = status => ACTIVE.has(status);
const externalSearchTabs = new Set();
const externalCircuit = new CircuitBreaker({ failureThreshold: 5, resetTimeout: 30000 });
const leadQueue = new TaskQueue({ concurrency: 2, maxQueue: 500, retryLimit: 1, defaultTimeout: 45000 });

// ============================================================
// INSTALAÇÃO
// ============================================================
chrome.runtime.onInstalled.addListener(() => {
  console.log('[M2y v2.15] Instalado com sucesso!');
  chrome.storage.local.set({
    config: {
      max_leads: 15,
      delay_between_requests_ms: 2000,
      delay_min_s: 2,
      delay_max_s: 5,
      timeout_ms: 30000,
      max_scroll_attempts: 50
    },
    advancedConfig: {
      filterPhone:      true,
      filterWebsite:    false,
      ignoreDuplicates: true,
      ignoreClosed:     false,
      extractReviews:   true,
      extractHours:     true,
      extractEmails:    false,
      extractSocial:    true,
      autoPauseOnBlock: true,
      stealthMode:      true,
      randomUserAgent:  false,
      minRating:        0,
      proxy:            '',
      speedMode:        'balanced',
      strictQueryMatch: true,
      externalSearchTimeoutMs: 8000,
      socialCacheTtlDays: 7,
      cleanupDuplicatesOnStart: false,
      contextAcceptScore: 80,
      contextReviewScore: 50,
      contextMode: 'balanced',
      leadConcurrency: 2,
      diagnosticsMode: 'NORMAL',
      schemaVersion: 3
    },
    m2y_schema_version: 3
  });
  BackupManager.createIncrementalBackup('install').catch(error => console.warn('[M2y] Backup inicial não concluído:', error?.message || error));
});

chrome.runtime.onStartup.addListener(() => {
  StorageRepository.migrate().catch(error => console.warn('[M2y] Migração não destrutiva não concluída:', error?.message || error));
  BackupManager.createIncrementalBackup('startup').catch(error => console.warn('[M2y] Backup automático não concluído:', error?.message || error));
});

// ============================================================
// LISTENER DE MENSAGENS
// ============================================================
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender, sendResponse).catch(error => {
    const details = ErrorClassifier.describeError(error, { action: message?.action });
    logger.log(LogLevel.ERROR, LogEvent.ERROR_OCCURRED, details);
    broadcastLog('ERROR', 'error_occurred', details);
    try { sendResponse({ success: false, error: details.message, code: details.code, classification: details.classification }); } catch (_) {}
  });
  return true;
});

chrome.tabs.onRemoved.addListener(async tabId => {
  if (tabId !== currentExecution.targetTabId || !isActiveStatus(currentExecution.status)) return;
  await failExecution(currentExecution.id, 'target_tab_closed', 'A aba do Google Maps foi fechada durante a execução.');
});

async function handleMessage(message, sender, sendResponse) {
  if (message.action !== 'start' && (!currentExecution.id || currentExecution.status === 'idle')) {
    await restoreExecutionState(message.executionId);
  }
  switch (message.action) {

    case 'ping':
      sendResponse({ success: true, version: '2.15' });
      break;

    case 'start':
      await startExecution(message.query, message.config, message.advancedConfig, sendResponse);
      break;

    case 'stop':
      await stopExecution(sendResponse);
      break;

    case 'pause':
      await pauseExecution(sendResponse);
      break;

    case 'resume':
      await resumeExecution(sendResponse);
      break;

    case 'leadExtracted': {
      await restoreExecutionState(message.executionId);
      const accepted = await leadQueue.add(() => handleLeadExtracted(message.lead, message.advancedConfig), { priority: 'high', timeout: 45000 }).catch(() => false);
      broadcastProgress();
      sendResponse({ success: accepted, accepted });
      break;
    }

    case 'log':
      logger.log(message.level, message.event, message.details);
      if (message.event === 'data_collected') metrics.record('cardsProcessed');
      if (message.event === 'lead_filtered_before_capture' || message.event === 'query_context_mismatch') metrics.record('filtered');
      if (message.event === 'duplicate_ignored') metrics.record('duplicates');
      if (message.event === 'error_occurred') metrics.record('errors');
      if (message.event === 'screenshot_failed') metrics.record('screenshotFailures');
      if (message.event === 'place_details_timeout' || message.event === 'external_search_timeout') metrics.record('timeouts');
      // Repassar log para o popup em tempo real
      broadcastLog(message.level, message.event, message.details);
      break;

    case 'progress':
      updateProgress(message.count);
      break;

    case 'extractionFinished':
      await completeExecution(message.executionId, 'natural_completion');
      broadcastProgress(); // Último broadcast para esconder a barra
      break;

    case 'failExecution':
      await failExecution(message.executionId, message.reason || 'extraction_error', message.error || null);
      sendResponse({ success: true });
      break;

    case 'cleanupDuplicates':
      await cleanupStoredDuplicates();
      sendResponse({ success: true });
      break;

    case 'blockingDetected':
      handleBlockingDetected();
      sendResponse({ success: true });
      break;

    case 'getStatus':
      sendResponse({
        status: currentExecution.status,
        executionId: currentExecution.id,
        targetTabId: currentExecution.targetTabId,
        query: currentExecution.query,
        count: currentExecution.leads.length,
        recoveryStatus: currentExecution.recoveryStatus || null,
        startedAt: currentExecution.startedAt,
        finishedAt: currentExecution.finishedAt
      });
      break;

    case 'recoverContinue':
      await recoverContinue(sendResponse);
      break;

    case 'recoverFinish':
      await completeExecution(currentExecution.id, 'recovered_finish');
      sendResponse({ success: true, status: currentExecution.status });
      break;

    case 'recoverDiscard':
      await recoverDiscard(sendResponse);
      break;

    case 'captureStrategicScreenshot':
      captureScreenshot(message.leadName, message.executionId, sender?.tab, sendResponse);
      return true;

    case 'externalSearch':
      performExternalSearch(message.query, sendResponse);
      return true;
  }
}

// ============================================================
// BROADCAST LOG PARA POPUP
// ============================================================
function broadcastProgress() {
  const summary = metrics.getSummary();
  chrome.runtime.sendMessage({
    action: 'ui_progress_update',
    metrics: summary,
    status: currentExecution.status
  }).catch(() => {});
}

function broadcastLog(level, event, details) {
  let text = '';
  if (event === 'data_collected') {
    text = `✓ ${details.name || '?'} | Tel: ${details.phone || 'N/A'} | Nota: ${details.rating || 'N/A'}`;
  } else if (event === 'delay_started') {
    text = `⏳ Aguardando ${details.duration_seconds}s...`;
  } else if (event === 'blocking_detected') {
    text = `⚠ Bloqueio detectado! Pausando...`;
  } else if (event === 'end_of_list_reached') {
    text = `📋 Fim da lista (${details.count} leads)`;
  } else if (event === 'duplicate_ignored') {
    text = `⏭️ Duplicado ignorado: ${details.name}`;
  } else {
    text = `[${event}] ${JSON.stringify(details).slice(0, 80)}`;
  }

  const logType = level === 'ERROR' ? 'error' : level === 'WARNING' ? 'warn' : 'info';

  chrome.runtime.sendMessage({ action: 'ui_log', logType, text }).catch(() => {});
}

// ============================================================
// BUSCA EXTERNA (REDES SOCIAIS) — timeout, cache e cleanup garantidos
// ============================================================
async function performExternalSearch(query, sendResponse) {
  const normalizedQuery = String(query || '').trim().toLowerCase();
  if (!externalCircuit.canRun()) { sendResponse({ success: false, error: 'Busca externa pausada temporariamente após falhas repetidas.', code: 'CIRCUIT_OPEN' }); return; }
  const cacheKey = `social_${IdentityResolver.createIdentityHash([normalizedQuery])}`;
  const ttlMs = Math.max(60_000, Number(currentExecution.advancedConfig?.socialCacheTtlDays || 7) * 86_400_000);
  const timeoutMs = Math.max(1000, Number(currentExecution.advancedConfig?.externalSearchTimeoutMs || 8000));
  const cached = await StorageRepository.cacheGet(cacheKey);
  if (cached?.expiresAt && Date.parse(cached.expiresAt) > Date.now()) {
    emitExecutionEvent(EVENTS.EXTERNAL_SEARCH_COMPLETED, { query: normalizedQuery, cached: true });
    sendResponse({ success: true, social: cached.result, cached: true });
    return;
  }
  let tab = null; let listener = null; let timer = null; let responded = false;
  const respond = payload => { if (responded) return; responded = true; sendResponse(payload); };
  try {
    emitExecutionEvent(EVENTS.EXTERNAL_SEARCH_STARTED, { query: normalizedQuery });
    logger.log(LogLevel.INFO, 'external_search_started', { query: normalizedQuery, timeoutMs });
    tab = await chrome.tabs.create({ url: `https://www.google.com/search?q=${encodeURIComponent(query)}`, active: false });
    if (tab?.id) externalSearchTabs.add(tab.id);
    const social = await new Promise((resolve, reject) => {
      const finish = (error, result) => { if (timer) clearTimeout(timer); if (listener) chrome.tabs.onUpdated.removeListener(listener); error ? reject(error) : resolve(result); };
      timer = setTimeout(() => finish(Object.assign(new Error('EXTERNAL_SEARCH_TIMEOUT'), { code: 'EXTERNAL_SEARCH_TIMEOUT' })), timeoutMs);
      listener = (tabId, info) => {
        if (tabId !== tab.id || info.status !== 'complete') return;
        chrome.tabs.onUpdated.removeListener(listener); listener = null;
        chrome.scripting.executeScript({ target: { tabId: tab.id }, func: () => {
          const links = Array.from(document.querySelectorAll('a[href]')).map(a => a.href);
          return { instagram: links.find(l => /instagram\.com\//i.test(l)) || null, facebook: links.find(l => /facebook\.com\//i.test(l)) || null, linkedin: links.find(l => /linkedin\.com\/company\//i.test(l)) || null };
        } }).then(results => finish(null, results?.[0]?.result || {})).catch(finish);
      };
      chrome.tabs.onUpdated.addListener(listener);
    });
    await StorageRepository.cacheSet(cacheKey, { query: normalizedQuery, result: social, createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + ttlMs).toISOString() });
    emitExecutionEvent(EVENTS.EXTERNAL_SEARCH_COMPLETED, { query: normalizedQuery, cached: false });
    externalCircuit.success();
    logger.log(LogLevel.INFO, 'external_search_completed', { query: normalizedQuery });
    respond({ success: true, social, cached: false });
  } catch (error) {
    externalCircuit.failure();
    emitExecutionEvent(error.code === 'EXTERNAL_SEARCH_TIMEOUT' ? EVENTS.TIMEOUT : EVENTS.EXTERNAL_SEARCH_FAILED, { query: normalizedQuery, error: error.message });
    logger.log(LogLevel.WARNING, error.code === 'EXTERNAL_SEARCH_TIMEOUT' ? 'external_search_timeout' : 'external_search_failed', { query: normalizedQuery, error: error.message });
    respond({ success: false, error: error.message, code: error.code || 'EXTERNAL_SEARCH_FAILED' });
  } finally {
    if (timer) clearTimeout(timer);
    if (listener) chrome.tabs.onUpdated.removeListener(listener);
    if (tab?.id) { externalSearchTabs.delete(tab.id); try { await chrome.tabs.remove(tab.id); } catch (_) {} }
  }
}

// ============================================================
// CAPTURA DE SCREENSHOT
// ============================================================
async function captureScreenshot(leadName, executionId, sourceTab, sendResponse) {
  const tabId = Number.isInteger(sourceTab?.id) ? sourceTab.id : currentExecution.targetTabId;
  const attempts = 3;
  let lastError = 'Aba de extração não encontrada';

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const dataUrl = await captureTabWithoutFocus(tabId);
      if (!/^data:image\/(jpeg|jpg|png);base64,[A-Za-z0-9+/=]+$/i.test(dataUrl) || dataUrl.length < 1000) {
        throw new Error('Imagem capturada inválida ou vazia');
      }
      const querySafe = (currentExecution.query || 'maps').replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const nameSafe  = String(leadName || 'lead').replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const timestamp = Date.now();
      const filename  = `${querySafe}_${nameSafe}_${timestamp}.jpg`;
      logger.log(LogLevel.INFO, LogEvent.SCREENSHOT_CAPTURED, { leadName, filename, attempts: attempt, background: true, timestamp: new Date().toISOString() });
      sendResponse({ success: true, screenshotUrl: dataUrl, filename, attempts: attempt, background: true });
      return;
    } catch (error) {
      lastError = error?.message || String(error);
      if (attempt < attempts) await delay(350 * attempt);
    }
  }

  // Fallback somente se a aba da extração já estiver ativa; nunca muda o foco da janela.
  try {
    if (sourceTab?.active && Number.isInteger(sourceTab.windowId)) {
      const dataUrl = await chrome.tabs.captureVisibleTab(sourceTab.windowId, { format: 'jpeg', quality: 86 });
      if (/^data:image\/(jpeg|jpg|png);base64,/.test(dataUrl) && dataUrl.length >= 1000) {
        sendResponse({ success: true, screenshotUrl: dataUrl, filename: `maps_${Date.now()}.jpg`, attempts: attempts + 1, background: false });
        return;
      }
    }
  } catch (fallbackError) { lastError = fallbackError?.message || lastError; }

  logger.log(LogLevel.ERROR, LogEvent.ERROR_OCCURRED, { error: lastError, context: 'screenshot', attempts });
  sendResponse({ success: false, error: lastError, attempts });
}

async function captureTabWithoutFocus(tabId) {
  if (!Number.isInteger(tabId)) throw new Error('ID da aba de extração ausente');
  const debugTarget = { tabId };
  let attached = false;
  try {
    await chrome.debugger.attach(debugTarget, '1.3');
    attached = true;
    await chrome.debugger.sendCommand(debugTarget, 'Page.enable');
    const result = await chrome.debugger.sendCommand(debugTarget, 'Page.captureScreenshot', { format: 'jpeg', quality: 86, fromSurface: true, captureBeyondViewport: false });
    if (!result?.data) throw new Error('CDP não retornou dados da imagem');
    return `data:image/jpeg;base64,${result.data}`;
  } finally {
    if (attached) { try { await chrome.debugger.detach(debugTarget); } catch (_) {} }
  }
}

function delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

// ============================================================
// INICIAR EXECUÇÃO
// ============================================================
async function startExecution(query, configOverride, advancedConfigOverride, sendResponse) {
  if (isActiveStatus(currentExecution.status) || executionManager.isLocked()) {
    sendResponse({ success: false, code: 'EXTRACTION_ALREADY_RUNNING', error: 'Já existe uma extração ativa. Aguarde, pause ou pare a execução atual antes de iniciar outra.' });
    return;
  }
  const stored = await chrome.storage.local.get(['config', 'advancedConfig']);
  const config = configOverride || stored.config || {};
  const advancedConfig = advancedConfigOverride || stored.advancedConfig || {};
  leadQueue.resumeAfterStop();
  leadQueue.concurrency = Math.max(1, Math.min(4, Number(advancedConfig.leadConcurrency || 2)));
  if (advancedConfig.cleanupDuplicatesOnStart === true) await cleanupStoredDuplicates(advancedConfig);
  const executionId = generateUUID();
  currentExecution = {
    id: executionId, config, advancedConfig, leads: [], status: EXECUTION_STATES.STARTING,
    query, extractedUrls: new Set(), targetTabId: null, startedAt: new Date().toISOString(),
    finishedAt: null, durationMs: null, reason: null, error: null, finalizedAt: null, dashboardOpened: false
  };
  executionManager.state = { ...currentExecution };
  logger.init(executionId);
  logger.setMode(advancedConfig.diagnosticsMode || 'NORMAL');
  metrics.start(executionId, config.max_leads || 15);
  logger.log(LogLevel.INFO, LogEvent.EXECUTION_STARTED, { query, config, advancedConfig });
  emitExecutionEvent(EVENTS.EXECUTION_STARTED, { query });
  broadcastLog('INFO', 'execution_started', { query });

  const tabs = await chrome.tabs.query({ url: ['*://www.google.com/maps/*', '*://www.google.com.br/maps/*'] });
  let targetTab;
  const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(query)}`;

  if (tabs.length > 0) {
    targetTab = tabs[0];
    await chrome.tabs.update(targetTab.id, { url: searchUrl, active: false });
  } else {
    targetTab = await chrome.tabs.create({ url: searchUrl, active: false });
  }
  currentExecution.targetTabId = targetTab.id;
  currentExecution.status = EXECUTION_STATES.RUNNING;
  executionManager.state = { ...executionManager.state, ...currentExecution };
  await persistActiveExecution();

  const startInTab = () => setTimeout(() => {
    chrome.tabs.sendMessage(targetTab.id, { action: 'startExtraction', config, advancedConfig, executionId })
      .catch(async () => {
        try {
          await chrome.scripting.executeScript({ target: { tabId: targetTab.id }, files: ['content/extractor.js'] });
          await chrome.tabs.sendMessage(targetTab.id, { action: 'startExtraction', config, advancedConfig, executionId });
        } catch (error) {
          console.error('[M2y] Não foi possível iniciar o content script:', error);
        }
      });
  }, 1200);

  const listener = (tabId, info) => {
    if (tabId === targetTab.id && info.status === 'complete') {
      chrome.tabs.onUpdated.removeListener(listener);
      startInTab();
    }
  };
  chrome.tabs.onUpdated.addListener(listener);

  sendResponse({ success: true, executionId });
}

// ============================================================
// PAUSAR EXECUÇÃO
// ============================================================
async function recoverContinue(sendResponse) {
  if (!currentExecution.id || !currentExecution.recoveryStatus) { sendResponse({ success: false, code: 'NO_RECOVERABLE_EXECUTION' }); return; }
  currentExecution.recoveryStatus = null;
  currentExecution.status = EXECUTION_STATES.RUNNING;
  executionManager.state = { ...executionManager.state, ...currentExecution };
  await persistActiveExecution();
  if (currentExecution.targetTabId) chrome.tabs.sendMessage(currentExecution.targetTabId, { action: 'resumeExtraction', executionId: currentExecution.id }).catch(() => {});
  emitExecutionEvent(EVENTS.EXECUTION_RESUMED, { recovered: true });
  sendResponse({ success: true, status: currentExecution.status });
}

async function recoverDiscard(sendResponse) {
  if (!currentExecution.id || !currentExecution.recoveryStatus) { sendResponse({ success: false, code: 'NO_RECOVERABLE_EXECUTION' }); return; }
  const id = currentExecution.id;
  await chrome.storage.local.remove(['m2y_active_execution']);
  currentExecution = { id: null, config: null, advancedConfig: null, leads: [], status: EXECUTION_STATES.IDLE, query: null, extractedUrls: new Set(), targetTabId: null };
  executionManager.state = { id: null, status: EXECUTION_STATES.IDLE };
  sendResponse({ success: true, status: EXECUTION_STATES.IDLE, preservedLeads: true, executionId: id });
}

async function pauseExecution(sendResponse) {
  if (!currentExecution.id || currentExecution.status !== EXECUTION_STATES.RUNNING) { if (sendResponse) sendResponse({ success: false, code: 'INVALID_EXECUTION_STATE' }); return; }
  leadQueue.pause();
  executionManager.transition(EXECUTION_STATES.PAUSED);
  currentExecution.status = EXECUTION_STATES.PAUSED;
  executionManager.state = { ...executionManager.state, ...currentExecution }; emitExecutionEvent(EVENTS.EXECUTION_PAUSED);
  await persistActiveExecution();
  const tabs = currentExecution.targetTabId ? [{ id: currentExecution.targetTabId }] : await chrome.tabs.query({ url: ['*://www.google.com/maps/*', '*://www.google.com.br/maps/*'] });
  for (const tab of tabs) {
    chrome.tabs.sendMessage(tab.id, { action: 'pauseExtraction' }).catch(() => {});
  }
  logger.log(LogLevel.INFO, 'execution_paused', { executionId: currentExecution.id });
  broadcastProgress();
  if (sendResponse) sendResponse({ success: true });
}

// ============================================================
// RETOMAR EXECUÇÃO
// ============================================================
async function resumeExecution(sendResponse) {
  if (!currentExecution.id || currentExecution.status !== EXECUTION_STATES.PAUSED) { if (sendResponse) sendResponse({ success: false, code: 'INVALID_EXECUTION_STATE' }); return; }
  leadQueue.resume();
  executionManager.transition(EXECUTION_STATES.RUNNING);
  currentExecution.status = EXECUTION_STATES.RUNNING;
  executionManager.state = { ...executionManager.state, ...currentExecution }; emitExecutionEvent(EVENTS.EXECUTION_RESUMED);
  await persistActiveExecution();
  const tabs = currentExecution.targetTabId ? [{ id: currentExecution.targetTabId }] : await chrome.tabs.query({ url: ['*://www.google.com/maps/*', '*://www.google.com.br/maps/*'] });
  for (const tab of tabs) {
    chrome.tabs.sendMessage(tab.id, { action: 'resumeExtraction' }).catch(() => {});
  }
  logger.log(LogLevel.INFO, 'execution_resumed', { executionId: currentExecution.id });
  broadcastProgress();
  if (sendResponse) sendResponse({ success: true });
}

// ============================================================
// PARAR EXECUÇÃO
// ============================================================
async function stopExecution(sendResponse) {
  if (!currentExecution.id || !isActiveStatus(currentExecution.status)) { if (sendResponse) sendResponse({ success: false, code: 'NO_ACTIVE_EXECUTION' }); return; }
  if (currentExecution.status !== EXECUTION_STATES.STOPPING) {
    executionManager.transition(EXECUTION_STATES.STOPPING, { reason: 'user_requested' });
    currentExecution.status = EXECUTION_STATES.STOPPING; currentExecution.reason = 'user_requested';
    executionManager.state = { ...executionManager.state, ...currentExecution }; emitExecutionEvent(EVENTS.EXECUTION_STOPPING);
  }
  leadQueue.stop();
  await persistActiveExecution();
  await Promise.all([...externalSearchTabs].map(async tabId => { externalSearchTabs.delete(tabId); try { await chrome.tabs.remove(tabId); } catch (_) {} }));
  const tabs = currentExecution.targetTabId ? [{ id: currentExecution.targetTabId }] : [];
  for (const tab of tabs) chrome.tabs.sendMessage(tab.id, { action: 'stopExtraction' }).catch(() => {});
  await stopFinalization(currentExecution.id, 'user_requested');
  broadcastProgress();
  if (sendResponse) sendResponse({ success: true, status: EXECUTION_STATES.STOPPED });
}

// ============================================================
// DETECÇÃO DE BLOQUEIO
// ============================================================
function handleBlockingDetected() {
  logger.log(LogLevel.WARNING, LogEvent.BLOCKING_DETECTED, {
    executionId: currentExecution.id,
    leadsCollected: currentExecution.leads.length
  });

  chrome.runtime.sendMessage({ action: 'ui_blocked' }).catch(() => {});
  broadcastLog('WARNING', 'blocking_detected', {});

  // Auto-pause se configurado
  if (currentExecution.advancedConfig?.autoPauseOnBlock) {
    pauseExecution(null);
  }
}

async function persistActiveExecution() {
  if (!currentExecution.id) return;
  await chrome.storage.local.set({ m2y_active_execution: { id: currentExecution.id, query: currentExecution.query, config: currentExecution.config, advancedConfig: currentExecution.advancedConfig, status: currentExecution.status, targetTabId: currentExecution.targetTabId, count: currentExecution.leads.length, startedAt: currentExecution.startedAt, finishedAt: currentExecution.finishedAt, reason: currentExecution.reason, error: currentExecution.error, updatedAt: Date.now() } });
}

async function restoreExecutionState(executionId = null) {
  if (currentExecution.id && (!executionId || currentExecution.id === executionId)) return;
  try {
    const stored = await chrome.storage.local.get(['m2y_active_execution']);
    const active = stored.m2y_active_execution;
    if (!active || (executionId && active.id !== executionId)) return;
    const data = await chrome.storage.local.get(`leads_${active.id}`);
    const leads = Array.isArray(data[`leads_${active.id}`]) ? data[`leads_${active.id}`] : [];
    currentExecution = { ...currentExecution, ...active, leads, extractedUrls: new Set(leads.flatMap(getLeadIdentityKeys)), recoveryStatus: isActiveStatus(active.status) ? 'recoverable' : null };
    executionManager.state = { ...executionManager.state, ...currentExecution };
  } catch (_) {}
}

async function cleanupStoredDuplicates(advancedConfig = null) {
  const prefs = advancedConfig || (await chrome.storage.local.get('advancedConfig')).advancedConfig || {};
  if (prefs.ignoreDuplicates === false) return;
  const data = await chrome.storage.local.get(null); const all = [];
  for (const [key, rows] of Object.entries(data)) if (key.startsWith('leads_') && Array.isArray(rows)) rows.forEach((lead, index) => all.push({ ...lead, _exec: key.slice(6), _index: index }));
  const completeness = lead => ['name','phone','website','address','hours','rating_value','screenshot'].filter(field => lead[field] && lead[field] !== 'N/A').length;
  all.sort((a,b) => completeness(b) - completeness(a)); const used = new Set(); const keep = new Set();
  for (const lead of all) { const keys = getLeadIdentityKeys(lead); if (keys.some(key => used.has(key))) continue; keys.forEach(key => used.add(key)); keep.add(lead._exec + ':' + lead._index); }
  const updates = {}; for (const [key, rows] of Object.entries(data)) if (key.startsWith('leads_') && Array.isArray(rows)) updates[key] = rows.filter((_, index) => keep.has(key.slice(6) + ':' + index));
  if (Object.keys(updates).length) await chrome.storage.local.set(updates);
}
// ============================================================
// PROCESSAR LEAD EXTRAÍDO
// ============================================================
async function handleLeadExtracted(lead, advancedConfig) {
  const cfg = advancedConfig || currentExecution.advancedConfig || {};
  const identityKeys = getLeadIdentityKeys(lead);

  const dedupeEnabled = cfg.ignoreDuplicates !== false;
  if (dedupeEnabled && (identityKeys.some(key => currentExecution.extractedUrls.has(key)) || currentExecution.leads.some(existing => getLeadIdentityKeys(existing).some(key => identityKeys.includes(key))))) {
    console.log(`[M2y v2.9] Duplicado ignorado: ${lead.name}`);
    broadcastLog('INFO', 'duplicate_ignored', { name: lead.name });
    return false;
  }

  // Filtro: apenas com telefone
  if (cfg.filterPhone && (!lead.phone || lead.phone === 'N/A')) {
    console.log(`[M2y v2.9] Sem telefone, ignorado: ${lead.name}`);
    return false;
  }

  // Filtro: apenas com site
  if (cfg.filterWebsite && (!lead.website || lead.website === 'N/A')) {
    console.log(`[M2y v2.9] Sem website, ignorado: ${lead.name}`);
    return false;
  }

  // Filtro: ignorar encerrados
  if (cfg.ignoreClosed && lead.status === 'Encerrado') {
    console.log(`[M2y v2.9] Encerrado, ignorado: ${lead.name}`);
    return false;
  }

  // Filtro de aderência e guard de screenshot: não persistir registros fora da configuração ou sem imagem válida.
  if (cfg.strictQueryMatch !== false && ['mismatch'].includes(lead.match_category)) return false;
  if (cfg.strictQueryMatch !== false && ['mismatch'].includes(lead.match_location)) return false;
  if (!lead.screenshot || !/^data:image\/(jpeg|jpg|png);base64,/.test(lead.screenshot)) {
    broadcastLog('WARNING', 'screenshot_required_rejected', { name: lead.name });
    return false;
  }

  // Filtro: nota mínima
  if (cfg.minRating && cfg.minRating > 0) {
    const rating = parseFloat(lead.rating_value) || 0;
    if (rating < cfg.minRating) {
      console.log(`[M2y v2.9] Nota ${rating} < mínimo ${cfg.minRating}, ignorado: ${lead.name}`);
      return false;
    }
  }

  const resolved = IdentityResolver.resolve(lead, lead.google_maps_url);
  Object.assign(lead, DataQuality.enrichLead(lead));
  if (dedupeEnabled) identityKeys.forEach(key => currentExecution.extractedUrls.add(key));
  const identityIndex = await StorageRepository.identityIndexGet();
  if (dedupeEnabled && resolved.keys.some(key => identityIndex[key] && identityIndex[key] !== currentExecution.id)) {
    emitExecutionEvent(EVENTS.LEAD_DUPLICATE, { name: lead.name, keys: resolved.keys });
    broadcastLog('INFO', 'duplicate_ignored', { name: lead.name, id: resolved.primary });
    return false;
  }
  lead.identity_key = resolved.primary;
  lead.identity_keys = resolved.keys;
  lead.schemaVersion = lead.schemaVersion || 3;
  lead.dataVersion = lead.dataVersion || '2.14';
  lead.quality_score = Number.isFinite(lead.quality_score) ? lead.quality_score : LeadScores.qualityScore(lead);
  lead.commercial_score = LeadScores.commercialScore(lead);
  lead.digital_presence_score = LeadScores.digitalPresenceScore(lead);
  if (lead.screenshot && !lead.screenshotId) {
    lead.screenshotId = await ScreenshotStore.save(lead.screenshot, { executionId: currentExecution.id, leadName: lead.name, mimeType: 'image/jpeg' });
    lead.screenshot_status = lead.screenshotId ? 'captured_indexed' : (lead.screenshot_status || 'captured');
  }
  const isValid = validateLead(lead);
  metrics.addLead(isValid);
  metrics.record('accepted');
  if (isValid) metrics.record('validLeads');
  currentExecution.leads.push(lead);

  logger.log(LogLevel.INFO, LogEvent.LEAD_EXTRACTED, {
    name: lead.name,
    isValid,
    count: currentExecution.leads.length
  });

  const key = `leads_${currentExecution.id}`;
  for (const identityKey of resolved.keys) identityIndex[identityKey] = currentExecution.id;
  await StorageRepository.identityIndexSet(identityIndex);
  await chrome.storage.local.set({ [key]: currentExecution.leads });
  await persistActiveExecution();
  emitExecutionEvent(EVENTS.LEAD_ACCEPTED, { name: lead.name, identityKey: resolved.primary });
  return true;
}

function getLeadIdentityKeys(lead = {}) {
  const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const keys = [];
  const url = normalize(lead.google_maps_url); if (url) keys.push(`url:${url}`);
  const phone = normalize(lead.phone); if (phone && phone !== 'na') keys.push(`phone:${phone}`);
  const name = normalize(lead.name); const address = normalize(lead.address); const city = normalize(lead.city); const state = normalize(lead.state);
  if (name && name !== 'na') { if (address && address !== 'na') keys.push(`profile:${name}|${address}`); if (city && city !== 'na') keys.push(`local:${name}|${city}|${state}`); }
  const resolved = IdentityResolver.resolve(lead, lead.google_maps_url); keys.push(...resolved.keys);
  return [...new Set(keys)].filter(Boolean);
}
function buildLeadDedupKey(lead = {}) {
  return getLeadIdentityKeys(lead)[0];
}

// ============================================================
// ATUALIZAR PROGRESSO
// ============================================================
function updateProgress(count) {
  chrome.runtime.sendMessage({
    action: 'ui_update',
    count,
    executionId: currentExecution.id
  }).catch(() => {});
}

// ============================================================
// FINALIZAR EXECUÇÃO
// ============================================================
async function finalizeExecution(executionId, terminalStatus, reason, error = null) {
  if (!executionId || currentExecution.id !== executionId) return false;
  if ([EXECUTION_STATES.STOPPED, EXECUTION_STATES.COMPLETED, EXECUTION_STATES.FAILED].includes(currentExecution.status)) return false;
  const startedAt = currentExecution.startedAt || new Date().toISOString();
  const finishedAt = new Date().toISOString();
  currentExecution.status = terminalStatus; currentExecution.reason = reason || null; currentExecution.error = error || null;
  currentExecution.finishedAt = finishedAt; currentExecution.durationMs = Math.max(0, Date.parse(finishedAt) - Date.parse(startedAt)); currentExecution.finalizedAt = finishedAt;
  executionManager.state = { ...executionManager.state, ...currentExecution };
  metrics.end();
  const event = terminalStatus === EXECUTION_STATES.COMPLETED ? EVENTS.EXECUTION_COMPLETED : terminalStatus === EXECUTION_STATES.STOPPED ? EVENTS.EXECUTION_STOPPED : EVENTS.EXECUTION_FAILED;
  emitExecutionEvent(event, { reason, error });
  logger.log(terminalStatus === EXECUTION_STATES.FAILED ? LogLevel.ERROR : LogLevel.INFO, terminalStatus === EXECUTION_STATES.COMPLETED ? LogEvent.EXECUTION_FINISHED : event.toLowerCase(), { total: currentExecution.leads.length, screenshots: currentExecution.leads.filter(lead => lead.screenshot).length, status: terminalStatus, reason, error, durationMs: currentExecution.durationMs, metrics: metrics.getSummary() });
  await metrics.persist(executionId); await logger.persistLogs();
  await chrome.storage.local.set({ m2y_last_execution: { id: executionId, query: currentExecution.query, status: terminalStatus, reason, error, count: currentExecution.leads.length, screenshots: currentExecution.leads.filter(lead => lead.screenshot).length, startedAt, finishedAt, durationMs: currentExecution.durationMs, schemaVersion: 3 } });
  await chrome.storage.local.remove('m2y_active_execution');
  chrome.runtime.sendMessage({ action: terminalStatus === EXECUTION_STATES.COMPLETED ? 'ui_finished' : 'ui_stopped', executionId, status: terminalStatus, reason }).catch(() => {});
  if (terminalStatus === EXECUTION_STATES.COMPLETED && !currentExecution.dashboardOpened) {
    currentExecution.dashboardOpened = true;
    try { chrome.notifications.create({ type: 'basic', iconUrl: 'icons/icon128.png', title: 'M2y — Extração concluída', message: `${currentExecution.leads.length} leads coletados.`, priority: 2 }); } catch (_) {}
    setTimeout(() => chrome.tabs.create({ url: chrome.runtime.getURL(`dashboard/dashboard.html?showReport=true&executionId=${executionId}`) }), 1500);
  }
  return true;
}
async function completeExecution(executionId, reason = 'natural_completion') { if (currentExecution.status === EXECUTION_STATES.STOPPING || currentExecution.status === EXECUTION_STATES.STOPPED || currentExecution.status === EXECUTION_STATES.FAILED) return false; return finalizeExecution(executionId, EXECUTION_STATES.COMPLETED, reason); }
async function stopFinalization(executionId, reason = 'user_requested') { return finalizeExecution(executionId, EXECUTION_STATES.STOPPED, reason); }
async function failExecution(executionId, reason = 'failed', error = null) { return finalizeExecution(executionId, EXECUTION_STATES.FAILED, reason, error); }
async function finishExecution(executionId) { return completeExecution(executionId, 'compatibility_finish'); }
