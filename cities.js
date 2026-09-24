/**
 * M2y v2.11 - Módulo de Cidades Brasileiras (IBGE Completo)
 * ============================================================
 * Melhorias v2.11:
 * - Dataset completo IBGE: 5.571 municípios brasileiros
 * - Busca incremental case-insensitive com normalização de acentos
 * - Índice de busca pré-computado para performance máxima
 * - Sem limite estático de sugestões (configurável)
 * - Debounce integrado para reduzir processamento
 * - Suporte a filtro por estado (UF)
 * - Prioridade: startsWith > contains
 * ============================================================
 * Mantém 100% da compatibilidade com a API existente:
 * - getCitiesByState(state) → string[]
 * - searchCities(query, state, limit) → string[]
 * - searchByCEP(cep) → Promise<{city, state, ...}>
 * - searchCEPByCity(city, state) → Promise<{...}>
 * - validateCEP(cep) → boolean
 * - formatCEP(cep) → string
 */

// ============================================================
// DATASET IBGE — 5.571 MUNICÍPIOS
// Carregado de forma lazy para não bloquear a inicialização
// ============================================================

/** @type {Array<{n: string, u: string}>|null} */
let _ibgeData = null;

/** @type {Array<{n: string, u: string, k: string}>|null} */
let _ibgeIndex = null;

/** @type {Map<string, string[]>|null} */
let _stateIndex = null;

/** @type {Promise<void>|null} */
let _loadPromise = null;

/**
 * Normaliza string: lowercase + remove acentos
 * @param {string} s
 * @returns {string}
 */
function normalizeStr(s) {
  if (!s) return '';
  return s.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Carrega o dataset IBGE de forma lazy (uma única vez)
 * @returns {Promise<void>}
 */
async function loadIBGEData() {
  if (_ibgeIndex) return; // Já carregado
  if (_loadPromise) return _loadPromise; // Já em carregamento

  _loadPromise = (async () => {
    try {
      // Tentar carregar o arquivo local do dataset IBGE
      const url = chrome?.runtime?.getURL
        ? chrome.runtime.getURL('modules/ibge_municipios.json')
        : '../modules/ibge_municipios.json';

      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      _ibgeData = await response.json();

      // Construir índice com campo normalizado pré-computado
      _ibgeIndex = _ibgeData.map(c => ({
        n: c.n,
        u: c.u,
        k: normalizeStr(c.n)
      }));

      // Construir índice por estado para filtragem rápida
      _stateIndex = new Map();
      for (const c of _ibgeIndex) {
        if (!_stateIndex.has(c.u)) _stateIndex.set(c.u, []);
        _stateIndex.get(c.u).push(c);
      }

      console.log(`[M2y v2.11] Dataset IBGE carregado: ${_ibgeIndex.length} municípios`);
    } catch (err) {
      console.warn('[M2y v2.11] Falha ao carregar dataset IBGE, usando fallback:', err.message);
      // Fallback: usar lista reduzida de cidades principais
      _ibgeIndex = FALLBACK_CITIES.map(c => ({
        n: c.n,
        u: c.u,
        k: normalizeStr(c.n)
      }));
      _stateIndex = new Map();
      for (const c of _ibgeIndex) {
        if (!_stateIndex.has(c.u)) _stateIndex.set(c.u, []);
        _stateIndex.get(c.u).push(c);
      }
    }
  })();

  return _loadPromise;
}

// ============================================================
// FALLBACK: Cidades principais por estado (caso offline)
// ============================================================
const FALLBACK_CITIES = [
  {n:'Rio Branco',u:'AC'},{n:'Cruzeiro do Sul',u:'AC'},{n:'Mâncio Lima',u:'AC'},
  {n:'Maceió',u:'AL'},{n:'Arapiraca',u:'AL'},{n:'Rio Largo',u:'AL'},{n:'Palmeira dos Índios',u:'AL'},
  {n:'Macapá',u:'AP'},{n:'Santana',u:'AP'},{n:'Laranjal do Jari',u:'AP'},
  {n:'Manaus',u:'AM'},{n:'Parintins',u:'AM'},{n:'Itacoatiara',u:'AM'},{n:'Coari',u:'AM'},
  {n:'Salvador',u:'BA'},{n:'Feira de Santana',u:'BA'},{n:'Vitória da Conquista',u:'BA'},{n:'Ilhéus',u:'BA'},{n:'Camaçari',u:'BA'},{n:'Lauro de Freitas',u:'BA'},{n:'Barreiras',u:'BA'},
  {n:'Fortaleza',u:'CE'},{n:'Caucaia',u:'CE'},{n:'Juazeiro do Norte',u:'CE'},{n:'Maracanaú',u:'CE'},{n:'Sobral',u:'CE'},{n:'Crato',u:'CE'},
  {n:'Brasília',u:'DF'},{n:'Ceilândia',u:'DF'},{n:'Taguatinga',u:'DF'},{n:'Samambaia',u:'DF'},
  {n:'Vitória',u:'ES'},{n:'Vila Velha',u:'ES'},{n:'Serra',u:'ES'},{n:'Cariacica',u:'ES'},{n:'Linhares',u:'ES'},
  {n:'Goiânia',u:'GO'},{n:'Aparecida de Goiânia',u:'GO'},{n:'Anápolis',u:'GO'},{n:'Rio Verde',u:'GO'},{n:'Luziânia',u:'GO'},
  {n:'São Luís',u:'MA'},{n:'Imperatriz',u:'MA'},{n:'São José de Ribamar',u:'MA'},{n:'Timon',u:'MA'},{n:'Caxias',u:'MA'},
  {n:'Cuiabá',u:'MT'},{n:'Várzea Grande',u:'MT'},{n:'Rondonópolis',u:'MT'},{n:'Sinop',u:'MT'},{n:'Lucas do Rio Verde',u:'MT'},
  {n:'Campo Grande',u:'MS'},{n:'Dourados',u:'MS'},{n:'Três Lagoas',u:'MS'},{n:'Corumbá',u:'MS'},
  {n:'Belo Horizonte',u:'MG'},{n:'Uberlândia',u:'MG'},{n:'Contagem',u:'MG'},{n:'Juiz de Fora',u:'MG'},{n:'Betim',u:'MG'},{n:'Montes Claros',u:'MG'},{n:'Governador Valadares',u:'MG'},{n:'Divinópolis',u:'MG'},{n:'Ipatinga',u:'MG'},{n:'Sete Lagoas',u:'MG'},
  {n:'Belém',u:'PA'},{n:'Ananindeua',u:'PA'},{n:'Santarém',u:'PA'},{n:'Marabá',u:'PA'},{n:'Castanhal',u:'PA'},{n:'Parauapebas',u:'PA'},
  {n:'João Pessoa',u:'PB'},{n:'Campina Grande',u:'PB'},{n:'Santa Rita',u:'PB'},{n:'Patos',u:'PB'},
  {n:'Curitiba',u:'PR'},{n:'Londrina',u:'PR'},{n:'Maringá',u:'PR'},{n:'Ponta Grossa',u:'PR'},{n:'Cascavel',u:'PR'},{n:'São José dos Pinhais',u:'PR'},{n:'Foz do Iguaçu',u:'PR'},
  {n:'Recife',u:'PE'},{n:'Jaboatão dos Guararapes',u:'PE'},{n:'Olinda',u:'PE'},{n:'Caruaru',u:'PE'},{n:'Petrolina',u:'PE'},{n:'Paulista',u:'PE'},
  {n:'Teresina',u:'PI'},{n:'Parnaíba',u:'PI'},{n:'Picos',u:'PI'},{n:'Floriano',u:'PI'},
  {n:'Rio de Janeiro',u:'RJ'},{n:'Niterói',u:'RJ'},{n:'Duque de Caxias',u:'RJ'},{n:'São Gonçalo',u:'RJ'},{n:'São João de Meriti',u:'RJ'},{n:'Campos dos Goytacazes',u:'RJ'},{n:'Nova Iguaçu',u:'RJ'},{n:'Macaé',u:'RJ'},
  {n:'Natal',u:'RN'},{n:'Mossoró',u:'RN'},{n:'Parnamirim',u:'RN'},{n:'Assu',u:'RN'},
  {n:'Porto Alegre',u:'RS'},{n:'Caxias do Sul',u:'RS'},{n:'Pelotas',u:'RS'},{n:'Santa Maria',u:'RS'},{n:'Gravataí',u:'RS'},{n:'Viamão',u:'RS'},{n:'Novo Hamburgo',u:'RS'},{n:'São Leopoldo',u:'RS'},
  {n:'Porto Velho',u:'RO'},{n:'Ji-Paraná',u:'RO'},{n:'Ariquemes',u:'RO'},{n:'Vilhena',u:'RO'},
  {n:'Boa Vista',u:'RR'},{n:'Rorainópolis',u:'RR'},{n:'Caracaraí',u:'RR'},
  {n:'Florianópolis',u:'SC'},{n:'Joinville',u:'SC'},{n:'Blumenau',u:'SC'},{n:'Itajaí',u:'SC'},{n:'Chapecó',u:'SC'},{n:'Criciúma',u:'SC'},{n:'Lages',u:'SC'},
  {n:'São Paulo',u:'SP'},{n:'Campinas',u:'SP'},{n:'Santos',u:'SP'},{n:'Sorocaba',u:'SP'},{n:'Ribeirão Preto',u:'SP'},{n:'Araçatuba',u:'SP'},{n:'Bauru',u:'SP'},{n:'Jundiaí',u:'SP'},{n:'Piracicaba',u:'SP'},{n:'Araraquara',u:'SP'},{n:'São José dos Campos',u:'SP'},{n:'Osasco',u:'SP'},{n:'Guarulhos',u:'SP'},{n:'Santo André',u:'SP'},{n:'São Bernardo do Campo',u:'SP'},
  {n:'Aracaju',u:'SE'},{n:'Nossa Senhora do Socorro',u:'SE'},{n:'Lagarto',u:'SE'},{n:'Itabaiana',u:'SE'},
  {n:'Palmas',u:'TO'},{n:'Araguaína',u:'TO'},{n:'Gurupi',u:'TO'},{n:'Porto Nacional',u:'TO'}
];

// ============================================================
// DEBOUNCE HELPER
// ============================================================
let _debounceTimer = null;

/**
 * Cria uma versão debounced de uma função
 * @param {Function} fn
 * @param {number} delay - ms
 * @returns {Function}
 */
export function createDebounce(fn, delay = 200) {
  let timer = null;
  return function(...args) {
    clearTimeout(timer);
    return new Promise((resolve) => {
      timer = setTimeout(async () => {
        const result = await fn(...args);
        resolve(result);
      }, delay);
    });
  };
}

// ============================================================
// API PÚBLICA
// ============================================================

/**
 * Obter lista de cidades para um estado (compatibilidade com API existente)
 * @param {string} state - Sigla do estado (ex: 'SP')
 * @returns {string[]} Lista de nomes de cidades
 */
export function getCitiesByState(state) {
  if (!state) return [];

  // Se o índice já está carregado, usar ele
  if (_stateIndex && _stateIndex.has(state)) {
    return _stateIndex.get(state).map(c => c.n);
  }

  // Fallback síncrono
  return FALLBACK_CITIES
    .filter(c => c.u === state)
    .map(c => c.n);
}

/**
 * Busca cidades por padrão de digitação — INCREMENTAL, CASE-INSENSITIVE
 * Sem limite estático de sugestões (configurável via parâmetro)
 * @param {string} query - Texto digitado
 * @param {string|null} state - Filtrar por estado (opcional)
 * @param {number} limit - Máximo de resultados (padrão: 50, 0 = sem limite)
 * @returns {string[]} Lista de sugestões ordenadas por relevância
 */
export function searchCities(query, state = null, limit = 50) {
  if (!query || query.length < 1) {
    // Retornar cidades do estado selecionado ou populares
    if (state) return getCitiesByState(state).slice(0, limit || 50);
    return [];
  }

  const qNorm = normalizeStr(query);
  const dataset = (state && _stateIndex && _stateIndex.has(state))
    ? _stateIndex.get(state)
    : (_ibgeIndex || FALLBACK_CITIES.map(c => ({ ...c, k: normalizeStr(c.n) })));

  const startsWith = [];
  const contains   = [];

  for (const city of dataset) {
    const k = city.k || normalizeStr(city.n);
    if (k.startsWith(qNorm)) {
      startsWith.push(city.n);
    } else if (k.includes(qNorm)) {
      contains.push(city.n);
    }
  }

  // startsWith primeiro, depois contains — ambos em ordem alfabética
  startsWith.sort((a, b) => a.localeCompare(b, 'pt-BR'));
  contains.sort((a, b) => a.localeCompare(b, 'pt-BR'));

  const results = [...startsWith, ...contains];
  return limit > 0 ? results.slice(0, limit) : results;
}

/**
 * Versão assíncrona de searchCities — garante que o dataset IBGE está carregado
 * @param {string} query
 * @param {string|null} state
 * @param {number} limit
 * @returns {Promise<string[]>}
 */
export async function searchCitiesAsync(query, state = null, limit = 50) {
  await loadIBGEData();
  return searchCities(query, state, limit);
}

/**
 * Pré-carrega o dataset IBGE em background
 * Deve ser chamado na inicialização do popup
 */
export async function preloadCitiesData() {
  return loadIBGEData();
}

/**
 * Buscar cidade e estado por CEP (Offline + API ViaCEP)
 * Mantém compatibilidade total com a versão anterior
 */
export async function searchByCEP(cep) {
  if (!cep) return null;
  const cleanCep = cep.replace(/\D/g, '');
  if (cleanCep.length < 5) return null;

  // Tentar API externa ViaCEP
  if (cleanCep.length >= 5) {
    try {
      const response = await fetch(
        `https://viacep.com.br/ws/${cleanCep}/json/`,
        { headers: { 'Accept': 'application/json' } }
      );

      if (!response.ok) {
        console.warn('[M2y v2.11] ViaCEP retornou status:', response.status);
        return null;
      }

      const data = await response.json();

      if (data.erro === true) {
        console.warn('[M2y v2.11] CEP não encontrado no ViaCEP:', cleanCep);
        return null;
      }

      if (data.localidade && data.uf) {
        return {
          city:         data.localidade,
          state:        data.uf,
          neighborhood: data.bairro || '',
          street:       data.logradouro || '',
          source:       'viacep'
        };
      }
    } catch (e) {
      console.warn('[M2y v2.11] Erro ao consultar ViaCEP:', e.message);
    }
  }

  return null;
}

/**
 * Buscar CEP de uma cidade (retorna o primeiro CEP encontrado)
 * Mantém compatibilidade total com a versão anterior
 */
export async function searchCEPByCity(city, state = null) {
  if (!city) return null;

  // Tentar API externa (ViaCEP) — busca por cidade e estado
  if (state && state.length === 2) {
    try {
      const response = await fetch(
        `https://viacep.com.br/ws/${state}/${encodeURIComponent(city)}/json/`,
        { headers: { 'Accept': 'application/json' } }
      );
      const data = await response.json();

      if (Array.isArray(data) && data.length > 0) {
        const first = data[0];
        return {
          cep:          first.cep,
          city:         first.localidade,
          state:        first.uf,
          neighborhood: first.bairro,
          source:       'viacep'
        };
      }
    } catch (e) {
      console.warn('[M2y v2.11] Erro ao consultar ViaCEP por cidade:', e);
    }
  }

  return null;
}

/**
 * Validar CEP brasileiro
 * @param {string} cep
 * @returns {boolean}
 */
export function validateCEP(cep) {
  if (!cep) return false;
  const cleanCep = cep.replace(/\D/g, '');
  return cleanCep.length === 8;
}

/**
 * Formatar CEP para padrão brasileiro (XXXXX-XXX)
 * @param {string} cep
 * @returns {string}
 */
export function formatCEP(cep) {
  if (!cep) return '';
  const clean = cep.replace(/\D/g, '');
  if (clean.length < 5) return clean;
  if (clean.length < 8) return clean.substring(0, 5);
  return `${clean.substring(0, 5)}-${clean.substring(5, 8)}`;
}

/**
 * Retorna estatísticas do dataset carregado
 * @returns {{total: number, loaded: boolean, source: string}}
 */
export function getDatasetInfo() {
  return {
    total:  _ibgeIndex ? _ibgeIndex.length : FALLBACK_CITIES.length,
    loaded: !!_ibgeIndex,
    source: _ibgeIndex ? 'ibge' : 'fallback'
  };
}

export default {
  getCitiesByState,
  searchCities,
  searchCitiesAsync,
  preloadCitiesData,
  searchByCEP,
  searchCEPByCity,
  validateCEP,
  formatCEP,
  createDebounce,
  getDatasetInfo
};
