# Changelog

## 2.15.0 — 2026-09-06

A interface inicial foi simplificada. A Central de operação agora mostra apenas Campos preenchidos e Última busca. Densidade, Recolher, Topo e Layout foram removidos da área principal. O cabeçalho do Dashboard mantém somente CSV e XLSX; JSON, TXT, Importar e Modelo foram retirados da visão principal, com compatibilidade interna preservada.

Foi adicionado backup incremental automático e manual, exportação completa, restauração validada e rollback pré-restauração. A migração de leads antigos para schema v3/dataVersion 2.15 é automática e não destrutiva.

A área técnica de Configurações recebeu diagnóstico, Health Check, cópia de diagnóstico e verificação de storage, IndexedDB, service worker, content script, comunicação, extração, deduplicação, screenshots, exportação e eventos.

Foram adicionados logs estruturados com retenção, classificação global de erros, fila de processamento, retry finito, timeout, backpressure, pausa, retomada, cancelamento e circuit breaker para buscas externas.

A precisão recebeu ContextScore ampliado, Overall Relevance Score, normalização preservando valores brutos, completude, confiança, suspeitas, fontes, conflitos e histórico de revisão. Screenshots passaram a ter hash, deduplicação e status no armazenamento separado.

O backlog mestre foi auditado e seu estado está descrito em `IMPLEMENTATION_STATUS_V215.md`; recursos que exigem uma camada de produto adicional permanecem explicitamente marcados como parciais ou futuros.

## 2.14.0 — 2026-09-06

A v2.14 corrigiu STOP versus completed, finalizações idempotentes, bloqueio de execuções simultâneas, cleanup de buscas externas, recovery persistido, timeout/cache, IdentityResolver, parser brasileiro, ContextScore, scores, funil de métricas, fallbacks de seletores, ScreenshotStore IndexedDB e versionamento de schema. Nenhuma permissão existente ou formato antigo foi removido. Foram executados checks de sintaxe, manifesto MV3 e testes unitários de lifecycle, concorrência, identidade, endereço e scores.
