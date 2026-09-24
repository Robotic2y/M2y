# Relatório final de auditoria e estabilização — M2y v2.14

## 1. Escopo e preservação

A implementação foi feita sobre a cópia de desenvolvimento `/home/ubuntu/work_ext`, mantendo o backup imutável em `/home/ubuntu/M2y_v213_backup`. O objetivo foi adicionar camadas de segurança e precisão sem reescrever o extrator, remover APIs antigas ou alterar permissões necessárias.

## 2. Arquivos alterados

Foram alterados `manifest.json`, `background/service-worker.js`, `content/extractor.js`, `modules/logger.js`, `modules/metrics.js`, `popup/popup.html`, `popup/popup.js`, `popup/popup.css`, `dashboard/dashboard.html` e `dashboard/dashboard.js`.

## 3. Arquivos novos

Foram criados `modules/execution-manager.js`, `modules/identity-resolver.js`, `modules/address-parser.js`, `modules/storage-repository.js`, `modules/screenshot-store.js`, `modules/lead-scores.js`, `modules/selector-resolver.js`, `modules/events.js`, `tests/test-v214.mjs`, `ARCHITECTURE.md`, `MIGRATIONS.md`, `EXECUTION_LIFECYCLE.md`, `STORAGE.md`, `TROUBLESHOOTING.md`, `CHANGELOG.md` e `audit_visual_findings_v214.md`.

## 4. Correções funcionais

O defeito P0 em que STOP podia terminar como `completed` foi corrigido. Agora existe separação entre completion, stop e failure, com razão, erro, início, fim e duração. Finalizações terminais são idempotentes. Um segundo start enquanto há execução ativa retorna `EXTRACTION_ALREADY_RUNNING` e não sobrescreve a execução atual.

Buscas externas agora possuem timeout configurável, cache com TTL, tratamento de erro, remoção de listener e fechamento de aba em todos os caminhos de saída. STOP também fecha abas temporárias em andamento. O service worker detecta o fechamento da aba alvo e registra falha controlada.

## 5. Melhorias de precisão e dados

Foi adicionado `ContextScore` com limites configuráveis e detalhes de correspondência. Os seletores antigos permanecem ativos e receberam fallbacks por role, aria-label, data-item-id e estrutura semântica, com log `selector_failure` quando nenhum fallback funciona.

`IdentityResolver` adiciona Place ID, CID, URL canônica, telefone, website, nome/endereço e hash composto. O índice `m2y_lead_index` evita depender apenas de varreduras completas. O parser de endereço reconhece UF, cidade, número, bairro e CEP, preservando o fallback antigo.

Leads novos recebem `schemaVersion`, `dataVersion`, `identity_key`, `quality_score`, `commercial_score` e `digital_presence_score`. Nenhum campo original é removido.

## 6. Storage e screenshots

`StorageRepository` concentra as novas operações de settings, execuções, cache e índices. A implementação continua lendo e gravando as chaves antigas. `ScreenshotStore` usa IndexedDB de forma gradual para criar uma referência Blob, mas preserva o Base64 no lead para compatibilidade e exportação.

## 7. Interface e métricas

O popup recebeu o aviso de recovery com ações Continue, Finalizar e Descartar estado. O dashboard recebeu o funil de cards encontrados, processados, aceitos, filtrados, duplicados e erros, além das taxas de aceite e dados completos. A auditoria visual confirmou que os grupos de ações e cards não se sobrepõem em desktop ou largura intermediária.

## 8. Migrações

A versão de schema nova é 3. Dados sem versão continuam sendo aceitos. A migração é aditiva e não destrutiva. A limpeza global de duplicados deixou de ocorrer automaticamente no início de toda extração; permanece disponível mediante ação explícita.

## 9. Testes executados e aprovados

Foram executados `node --check` em todos os JavaScript, teste unitário de lifecycle e concorrência, teste de identidade, telefone, website, parser de endereço e scores, validação do manifesto MV3, verificação de permissões `debugger` e `tabs`, verificação de IDs duplicados no dashboard, verificação dos documentos e renderização headless do popup em 520x760 e dashboard em 1440x900 e 820x900.

Todos os testes estáticos e unitários passaram. As screenshots finais foram revisadas visualmente e o ZIP foi validado com `unzip -t`.

## 10. Problemas encontrados e resolvidos

O principal problema encontrado foi a chamada de `finishExecution()` dentro de STOP, que sobrescrevia o estado parado. Também foi identificado o scan global automático de storage durante o start e a ausência de cleanup garantido para abas externas. Todos esses pontos foram corrigidos de forma incremental.

## 11. Problemas que permanecem

A recuperação foi implementada com estado persistido, endpoints e controles no popup, mas a continuação exata depende de a aba alvo ainda existir e do content script conseguir retomar o ponto salvo. A migração para armazenar somente referências de screenshot no lead não foi feita de forma destrutiva; por segurança, a representação Base64 continua presente.

## 12. Recomendações

A próxima iteração deve adicionar testes automatizados em um ambiente Chrome real, medir o tempo de cada etapa com dados reais e implementar uma rotina explícita para recalcular scores de leads antigos. Também é recomendável validar periodicamente os seletores contra alterações do Google Maps e adicionar uma fila visual para buscas sociais quando houver concorrência maior que uma tarefa.
