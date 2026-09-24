# Exemplos de Uso - M2y State Manager

Este documento demonstra como utilizar o novo `StateManager` global para substituir acessos diretos ao `chrome.storage` e implementar reatividade simples.

## 1. Exemplo no Background (Service Worker)

No `background/service-worker.js`, você pode inicializar o estado e atualizar métricas globalmente.

```javascript
import stateManager from '../core/state-manager.js';

// Inicializar estado ao carregar o service worker
chrome.runtime.onInstalled.addListener(async () => {
  await stateManager.hydrate();
  console.log('Estado inicial carregado:', stateManager.getState());
});

// Exemplo de atualização de métricas ao extrair um lead
async function handleLeadExtracted(lead) {
  const currentState = stateManager.getState();
  
  stateManager.setState({
    metrics: {
      ...currentState.metrics,
      totalLeads: currentState.metrics.totalLeads + 1
    },
    progress: (currentState.metrics.totalLeads + 1) / 100 // Exemplo de cálculo
  });
}
```

## 2. Substituindo chrome.storage por setState

Em vez de chamar `chrome.storage.local.set` manualmente em vários lugares, use o `stateManager`.

**Antes:**
```javascript
chrome.storage.local.set({ autoMode: true }, () => {
  console.log('Modo auto salvo');
});
```

**Depois (com StateManager):**
```javascript
import stateManager from '../core/state-manager.js';

// O setState já cuida da persistência interna via chrome.storage.local
stateManager.setState({ autoMode: true });
```

## 3. Exemplo de Subscribe no Dashboard

No `dashboard/dashboard.js`, você pode reagir a mudanças de estado em tempo real para atualizar a UI.

```javascript
import stateManager from '../core/state-manager.js';

// Função para atualizar a UI baseada no estado
function updateDashboardUI(state) {
  const progressBar = document.getElementById('progress-bar');
  const leadCounter = document.getElementById('lead-count');
  
  if (progressBar) progressBar.style.width = `${state.progress * 100}%`;
  if (leadCounter) leadCounter.textContent = state.metrics.totalLeads;
  
  console.log('Dashboard atualizado em:', new Date(state.lastUpdate).toLocaleTimeString());
}

// Inscrever-se para mudanças de estado
const unsubscribe = stateManager.subscribe(updateDashboardUI);

// Carregar estado inicial
stateManager.hydrate().then(updateDashboardUI);

// Se precisar parar de ouvir (ex: ao fechar/destruir componente)
// unsubscribe();
```

## 4. Acesso Direto (Read-only)

Para apenas ler o estado atual sem se inscrever:

```javascript
import stateManager from '../core/state-manager.js';

const { autoMode, system } = stateManager.getState();
if (autoMode) {
  console.log('Executando no sistema:', system.os);
}
```

## 5. Event Bus (Pub/Sub)

O `EventBus` permite comunicação desacoplada entre módulos, substituindo o polling.

### Exemplo: Escutando mudanças de estado no Dashboard
Em vez de checar o estado a cada X segundos, reaja ao evento emitido pelo `StateManager`.

```javascript
import eventBus from '../core/event-bus.js';

// Inscrever-se no evento de atualização de estado
const off = eventBus.on('state:update', (newState) => {
  console.log('Estado atualizado via EventBus:', newState);
  updateUI(newState);
});

// Para remover o listener
// off();
```

### Exemplo: Emitindo eventos customizados
Útil para sinalizar ações que não alteram necessariamente o estado global, mas exigem reação.

```javascript
import eventBus from '../core/event-bus.js';

// No extrator ao encontrar um erro
eventBus.emit('extraction:error', { message: 'Timeout no Google Maps', code: 408 });

// No dashboard ou popup para mostrar um alerta
eventBus.on('extraction:error', (error) => {
  showNotification(`Erro: ${error.message}`);
});
```

### Exemplo: Limpando listeners
```javascript
import eventBus from '../core/event-bus.js';

// Limpa todos os listeners de um evento específico
eventBus.clear('state:update');

// Limpa absolutamente tudo
eventBus.clear();
```

## 6. System Cache

O `SystemCache` evita detecções repetitivas de hardware e SO, economizando recursos.

### Exemplo: Substituindo detecção direta por cache
Em vez de rodar a detecção pesada toda vez, use `getOrDetect`.

```javascript
import systemCache from '../core/system-cache.js';
import { detectSystem } from '../modules/system-detector.js';

// Tenta pegar do cache, se não houver, roda detectSystem e salva por 24h (86400s)
const systemInfo = await systemCache.getOrDetect('system_info', detectSystem, 86400);
console.log('Informações do sistema (cache/detect):', systemInfo);
```

### Exemplo: Cache manual com expiração
```javascript
import systemCache from '../core/system-cache.js';

// Salvar um valor por 1 hora (3600s)
await systemCache.set('last_scan_status', 'success', 3600);

// Recuperar valor
const status = await systemCache.get('last_scan_status');
if (status) {
  console.log('Status ainda válido:', status);
} else {
  console.log('Cache expirado ou inexistente');
}
```

## 7. Auto Mode Adaptativo

O `AutoModeEngine` resolve o melhor modo de operação baseado no hardware detectado.

### Exemplo: Integrando com StateManager
Ao detectar o sistema, o motor escolhe o modo e o `StateManager` o persiste globalmente.

```javascript
import autoModeEngine from '../core/auto-mode-engine.js';
import stateManager from '../core/state-manager.js';
import systemCache from '../core/system-cache.js';

async function updateAutoMode() {
  // 1. Pega info do sistema (via cache se possível)
  const system = await systemCache.get('system_info');
  
  // 2. Resolve o melhor modo adaptativo
  const mode = autoModeEngine.resolve(system);
  
  // 3. Atualiza o estado global
  stateManager.setState({
    autoMode: true,
    currentMode: mode.id,
    interval: mode.interval,
    batchSize: mode.batch
  });
  
  console.log(`Modo adaptativo ativado: ${mode.label}`);
}
```

### Exemplo: Mapeamento de Intervalos
```javascript
import autoModeEngine from '../core/auto-mode-engine.js';

// Acessar configurações pré-definidas por modo
const batteryMode = autoModeEngine.MODES.BATTERY;
console.log(`Intervalo de economia: ${batteryMode.interval}ms`);
```

## 8. Realtime Scheduler

O `RealtimeScheduler` gerencia tarefas periódicas com inteligência de visibilidade de aba.

### Exemplo: Integrando com AutoMode e StateManager
Inicie o scheduler com o intervalo resolvido pelo `AutoModeEngine`.

```javascript
import realtimeScheduler from '../core/realtime-scheduler.js';
import autoModeEngine from '../core/auto-mode-engine.js';
import stateManager from '../core/state-manager.js';

async function startSync() {
  const system = stateManager.getState().system;
  const mode = autoModeEngine.resolve(system);

  // Inicia tarefa de sincronização com intervalo adaptativo
  realtimeScheduler.start(async () => {
    console.log('Sincronizando dados em tempo real...');
    // Lógica de extração ou atualização de UI aqui
  }, mode.interval);
}

// Atualizar intervalo dinamicamente se o modo mudar
function onModeChange(newMode) {
  realtimeScheduler.update(newMode.interval);
}
```

### Exemplo: Pausa e Parada
```javascript
import realtimeScheduler from '../core/realtime-scheduler.js';

// Para o scheduler completamente
realtimeScheduler.stop();

// O scheduler já pausa automaticamente se a aba for ocultada (document.hidden)
```

## 9. Reactive Renderer

O `ReactiveRenderer` atualiza o DOM de forma granular, reagindo apenas às chaves do estado que mudaram.

### Exemplo: Dashboard Reativo com EventBus
Integre o renderer com o evento `state:update` para atualizar a UI automaticamente.

```javascript
import reactiveRenderer from '../core/reactive-renderer.js';
import eventBus from '../core/event-bus.js';

// Mapeamento de chaves do estado para funções de atualização do DOM
const uiHandlers = {
  'progress': (val) => {
    const bar = document.getElementById('progress-bar');
    if (bar) bar.style.width = `${val * 100}%`;
  },
  'metrics.totalLeads': (val) => {
    const counter = document.getElementById('lead-count');
    if (counter) counter.textContent = val;
  },
  'currentMode': (val) => {
    const badge = document.getElementById('mode-badge');
    if (badge) badge.textContent = val.toUpperCase();
  }
};

// Escuta o EventBus e renderiza as mudanças
eventBus.on('state:update', (newState) => {
  reactiveRenderer.render(newState, uiHandlers);
});
```

### Exemplo: Renderização Inicial
```javascript
import stateManager from '../core/state-manager.js';
import reactiveRenderer from '../core/reactive-renderer.js';

// Força a primeira renderização com o estado atual
const initialState = stateManager.getState();
reactiveRenderer.render(initialState, uiHandlers);
```

## 10. Logger Timeline

O `LoggerTimeline` gerencia o histórico de eventos da extensão, limitando a 200 logs para performance.

### Exemplo: Logando mudanças de Auto Mode via EventBus
Integre o logger com o evento `state:update` para registrar mudanças de modo.

```javascript
import loggerTimeline from '../core/logger-timeline.js';
import eventBus from '../core/event-bus.js';

// Escuta mudanças de estado e loga se o modo mudar
let lastMode = null;
eventBus.on('state:update', (state) => {
  if (state.currentMode !== lastMode) {
    loggerTimeline.log('info', `Modo alterado para: ${state.currentMode}`, { 
      interval: state.interval 
    });
    lastMode = state.currentMode;
  }
});
```

### Exemplo: Recuperando e Limpando Logs
```javascript
import loggerTimeline from '../core/logger-timeline.js';

// Adicionar log manual
loggerTimeline.log('success', 'Extração finalizada', { count: 150 });

// Obter todos os logs para renderizar na timeline da UI
const allLogs = loggerTimeline.get();
allLogs.forEach(log => {
  console.log(`[${log.time}] ${log.type.toUpperCase()}: ${log.message}`);
});

// Limpar histórico
loggerTimeline.clear();
```

## 11. State Sync (Sincronização entre Abas)

O `StateSync` mantém o estado sincronizado entre diferentes abas (ex: Dashboard e Popup) usando `chrome.storage.onChanged`.

### Exemplo: Reagindo a mudanças externas

Se o estado for alterado no Popup, o Dashboard pode reagir especificamente à sincronização externa.

```javascript
import eventBus from '../core/event-bus.js';

// Escuta quando o estado foi sincronizado de outra aba
eventBus.on('state:external', (externalState) => {
  console.log('Estado sincronizado de outra aba:', externalState);
  // O StateManager já foi atualizado internamente, 
  // você só precisa atualizar sua UI se não estiver usando state:update
});

// O state:update também é disparado durante a sincronização
eventBus.on('state:update', (state) => {
  // Esta função rodará tanto para mudanças locais quanto externas
  updateUI(state);
});
```

### Exemplo: Inicialização Automática

O `StateSync` é inicializado automaticamente pelo `StateManager` ao ser instanciado em ambientes de janela (`window`).

```javascript
import stateManager from '../core/state-manager.js';

// Ao importar o stateManager, o StateSync já começa a ouvir mudanças
// Basta usar o estado normalmente
const state = stateManager.getState();
```

## 12. Smart Idle Mode (Detecção de Inatividade)

O `IdleMode` detecta quando o usuário está inativo (sem mouse, teclado ou scroll) por 15 segundos e pausa o sistema para economizar recursos.

### Exemplo: Ouvindo eventos de atividade

Você pode reagir aos eventos `user:idle` e `user:active` em qualquer lugar da extensão.

```javascript
import eventBus from '../core/event-bus.js';

// Quando o usuário fica inativo
eventBus.on('user:idle', (data) => {
  console.log('Usuário inativo em:', new Date(data.timestamp).toLocaleTimeString());
  // O RealtimeScheduler já é pausado automaticamente pelo StateManager
});

// Quando o usuário volta a interagir
eventBus.on('user:active', (data) => {
  console.log('Usuário voltou em:', new Date(data.timestamp).toLocaleTimeString());
});
```

### Logs Automáticos

As mudanças de estado de atividade são registradas automaticamente no `LoggerTimeline` para auditoria:
- `info`: "Smart Idle: Sistema pausado por inatividade"
- `success`: "Smart Idle: Sistema reativado (usuário ativo)"

## 13. Predictive Scheduler (Análise de Carga)

O `PredictiveScheduler` analisa o histórico das últimas 10 execuções e detecta tendências de aumento de carga para ajustar o intervalo do `RealtimeScheduler` preventivamente através do `AutoThrottle`.

### Exemplo: Integrando com RealtimeScheduler

Use o `PredictiveScheduler` para monitorar suas tarefas periódicas.

```javascript
import realtimeScheduler from '../core/realtime-scheduler.js';
import predictiveScheduler from '../core/predictive-scheduler.js';
import performanceGuard from '../core/performance-guard.js';

// Inicia tarefa monitorada
realtimeScheduler.start(async () => {
  await predictiveScheduler.monitor('extração_leads', async () => {
    // Sua lógica de extração aqui
    console.log('Executando extração monitorada...');
  }, performanceGuard);
}, 2000);
```

### Evento de Throttling Preditivo

O sistema emite um evento quando detecta uma anomalia de carga (ex: execução 20% acima da média recente).

```javascript
import eventBus from '../core/event-bus.js';

eventBus.on('predictive:throttle', (data) => {
  console.warn('Ação preditiva tomada:', data);
  // O AutoThrottle já aumentou o intervalo automaticamente
});
```

### Logs no LoggerTimeline

Quando uma predição ocorre, um log de aviso é gerado automaticamente:
- `warn`: "Predição: Aumento de carga detectado (XX.XXms)"

## 14. Adaptive Metrics Sampling (Amostragem Inteligente)

O `AdaptiveSampling` ajusta o intervalo de coleta de métricas entre 500ms e 4000ms com base na volatilidade dos dados. Se os valores mudam rápido, a coleta acelera; se estão estáveis, a coleta desacelera para economizar recursos.

### Exemplo: Integrando com RealtimeScheduler e AnomalyDetector

Use o `AdaptiveSampling` para monitorar métricas que variam ao longo do tempo.

```javascript
import realtimeScheduler from '../core/realtime-scheduler.js';
import adaptiveSampling from '../core/adaptive-sampling.js';
import anomalyDetector from '../core/anomaly-detector.js';

// Inicia tarefa de coleta adaptativa
realtimeScheduler.start(async () => {
  await adaptiveSampling.monitor(async () => {
    // Função que retorna um valor numérico (ex: leads coletados)
    const currentLeads = document.querySelectorAll('.lead-item').length;
    console.log('Métrica coletada:', currentLeads);
    return currentLeads;
  }, anomalyDetector);
}, 1000);
```

### Comportamento Automático

- **Mudança Brusca (>10%)**: Aumenta a frequência de coleta instantaneamente.
- **Estabilidade**: Aumenta o intervalo gradualmente até o limite de 4000ms.
- **Anomalia Detectada**: Se o `AnomalyDetector` disparar um evento, a coleta volta para a frequência máxima (500ms).

### Logs no LoggerTimeline

Quando uma anomalia é detectada e a frequência é aumentada, um log informativo é gerado:
- `info`: "Amostragem Adaptativa: Aumentando frequência devido a anomalia em adaptive_metric"

## 15. Self-Healing Engine (Recuperação Automática)

O `SelfHealing` monitora o estado global em busca de inconsistências e executa ações corretivas automáticas, como reiniciar o agendador se o progresso estiver travado.

### Exemplo: Reagindo a eventos de recuperação

Você pode se inscrever no evento `self-heal` para executar lógicas de correção em seus próprios plugins.

```javascript
import eventBus from '../core/event-bus.js';

// Escuta quando o sistema detecta uma falha e inicia a cura
eventBus.on('self-heal', (data) => {
  console.warn('Falha detectada:', data.issues);
  
  if (data.issues.includes('metrics_missing')) {
    // Tenta reinicializar métricas perdidas
    reinitializeMetrics();
  }
});
```

### Comportamento Automático

- **Detecção de Métricas**: Se o objeto `metrics` for corrompido ou deletado, o sistema emite um alerta de cura.
- **Detecção de Travamento**: Se o `autoMode` estiver ligado mas o estado não for atualizado por mais de 30 segundos, o `SelfHealing` assume um travamento e reinicia o `RealtimeScheduler`.

### Logs no LoggerTimeline

Toda tentativa de recuperação é registrada:
- `warn`: "Self-Healing: Recuperação iniciada (progress_stalled)"
- `success`: "Self-Healing: Scheduler reiniciado com sucesso"
