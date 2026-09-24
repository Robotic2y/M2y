# M2y v2.14 — Arquitetura incremental

O M2y permanece uma extensão MV3 com popup, dashboard, content script e service worker. A v2.14 adiciona camadas compatíveis em vez de substituir os fluxos de extração e persistência já existentes.

## Camadas

| Camada | Responsabilidade |
|---|---|
| Popup | Configuração, início, pausa, retomada, parada e visualização de progresso. |
| Content script | Leitura do Google Maps, parser de detalhes, filtros, contexto, screenshots e comunicação com o service worker. |
| Service worker | Lifecycle da execução, lock, persistência, deduplicação, screenshots CDP, buscas externas e notificações. |
| Módulos | ExecutionManager, IdentityResolver, AddressParser, StorageRepository, ScreenshotStore, scores e eventos padronizados. |
| Dashboard | Leads, métricas, funil, análises, exportação, configurações e auditoria. |

## Compatibilidade

As chaves antigas (`leads_<executionId>`, `logs_<executionId>`, `metrics_<executionId>`, `config`, `advancedConfig` e `globalDeduplicationCache`) continuam sendo lidas. Leads novos recebem `schemaVersion`, `dataVersion`, `identity_key`, scores adicionais e, quando possível, `screenshotId`, mas a imagem Base64 é preservada para exportações e versões antigas.

## Estado da execução

O `ExecutionManager` centraliza estados e transições. O service worker mantém uma camada de compatibilidade com `currentExecution`, evitando uma reescrita ampla. Finalizações são separadas em `completeExecution`, `stopFinalization` e `failExecution`.

## Busca externa e screenshots

Buscas sociais possuem cache TTL, timeout e `finally` para remover listeners e abas temporárias. Screenshots continuam sendo capturados via CDP sem foco; o `ScreenshotStore` grava uma cópia Blob no IndexedDB quando disponível, sem remover a imagem existente do lead.
