# M2y v2.14 — Migrações

## Princípios

Migrações são aditivas, idempotentes e não destrutivas. Nenhum lead, screenshot ou log antigo é removido automaticamente.

## Versões

| Versão | Tratamento |
|---|---|
| v1 | Leads sem `schemaVersion` continuam válidos; campos ausentes recebem fallback durante leitura. |
| v2 | Leads podem conter campos de qualidade e screenshots Base64. |
| v3 | Leads novos recebem `schemaVersion: 3`, `dataVersion: 2.14`, identidade e scores adicionais. |

## Índice

`m2y_lead_index` relaciona chaves de identidade a execuções. A prioridade é Place ID, CID, URL canônica, telefone, website, nome/endereço e hash composto. O índice é uma camada complementar; o dedupe antigo permanece ativo.

## Screenshots

O `ScreenshotStore` usa IndexedDB apenas como cópia otimizada. O campo antigo `screenshot` não é apagado. Se IndexedDB não estiver disponível, a execução continua usando a representação Base64 compatível.

## Cleanup

A limpeza global de duplicados não ocorre mais automaticamente no início de toda execução. Ela deve ser acionada manualmente (`cleanupDuplicates`) ou por uma operação explícita de manutenção.
