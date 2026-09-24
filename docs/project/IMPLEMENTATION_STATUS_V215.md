# Status de implementação v2.15

## Implementado nesta rodada

A revisão atual implementa a simplificação visual solicitada, backup incremental automático e manual, exportação e restauração validada com rollback, schema migration automática, diagnóstico e Health Check, logs estruturados com retenção, tratamento global de exceções, classificação de erros, fila limitada, retry finito, circuit breaker, scores de completude/confiança/relevância, normalização de telefone/URL/endereço/nome, fontes básicas, conflitos, status de revisão, hash de screenshots, deduplicação de imagens e compatibilidade de seletores.

## Parcialmente implementado

O Dashboard já possui filtros combinados por campos e busca global, mas ainda não oferece uma linguagem visual completa de AND/OR/NOT nem importação/exportação de presets. Bulk actions de copiar, exportar e revisar existem; edição, tags, notas, enriquecimento posterior e quarentena ainda precisam de uma camada visual própria. A fila está integrada ao processamento de leads, mas o enriquecimento separado deve ser conectado em uma próxima etapa.

A visão de performance já exibe métricas básicas e funil. Histórico e comparação existem parcialmente por execução, mas ainda precisam de uma tela dedicada de benchmark para 100, 1.000, 5.000 e 10.000 leads.

## Não implementado nesta rodada

Não foi criado um CRM completo, sistema de tarefas por lead, virtual scrolling avançado, monitoramento de memória com limite real do navegador, regeneração de screenshot após perda da aba, verificação ativa de website externo, nem uma camada de enriquecimento que consulte fontes externas posteriormente. Esses recursos exigem decisões de produto e, em alguns casos, autorização explícita para consultas externas.

## Critério de segurança

Nenhuma função existente foi removida do código de negócio por preferência arquitetural. A remoção solicitada foi visual nos botões redundantes do cabeçalho; handlers foram tornados opcionais e permanecem compatíveis. Nenhuma migração apaga dados automaticamente.
