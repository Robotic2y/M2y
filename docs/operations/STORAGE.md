# M2y v2.14 — Storage

`StorageRepository` concentra operações novas de settings, execuções, índice de identidade e cache. As chamadas antigas de `chrome.storage.local` continuam funcionando para preservar compatibilidade.

## Storage pequeno

Configurações, preferências e estado ativo continuam em `chrome.storage.local`.

## Dados grandes

Leads e logs ainda são gravados nas chaves existentes. Screenshots novos também recebem uma cópia Blob no IndexedDB por meio de `ScreenshotStore`; o Base64 original é preservado até que uma migração futura, explícita e auditada possa alterar essa política.

## Cache social

O cache usa chaves `m2y_cache_social_*` e armazena query, resultado, `createdAt` e `expiresAt`. Resultados expirados não são usados.

## Integridade

Os dados novos incluem `schemaVersion`, `dataVersion`, timestamps, identidade e scores. Falhas do IndexedDB não interrompem a extração.
