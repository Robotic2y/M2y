# Relatório final de auditoria — M2y v2.15

## Escopo

A v2.15 atende a solicitação visual imediata e integra as camadas prioritárias do backlog mestre anexado sem substituir os fluxos funcionais da v2.14. O backup imutável da base está em `/home/ubuntu/M2y_v214_backup`.

## Interface

A Central de operação do popup foi reduzida a dois indicadores essenciais: Campos preenchidos e Última busca. Os botões Densidade, Recolher, Topo e Layout foram removidos da área principal. No cabeçalho do Dashboard ficaram apenas CSV e XLSX. JSON, TXT, Importar e Modelo não aparecem mais na visão principal; handlers antigos foram tornados opcionais para preservar compatibilidade.

Backup, restauração, diagnóstico e Health Check ficam em Configurações, separados da visão operacional.

## Precisão e dados

A validação contextual passou a calcular categoria, localização, nome, endereço e relevância geral. Leads rejeitados recebem `rejection_reason` e o log registra o motivo. O pipeline adiciona normalização com preservação de valores brutos, completude, classificação, suspeitas, confiança, fontes, conflitos, histórico de mudanças e status de revisão.

A migração automática adiciona `schemaVersion: 3` e `dataVersion: 2.15` aos leads antigos sem apagar campos existentes.

## Backup e diagnóstico

O BackupManager cria backups incrementais por hash, exporta um arquivo único, valida formato e chaves, cria rollback automático antes de restaurar e oferece diagnóstico de storage, leads, execuções, cache, screenshots e registros inválidos.

O Health Check verifica storage, IndexedDB, service worker, content script, comunicação, extração, deduplicação, screenshots, exportação e eventos. O logger agora possui campos estruturados, níveis NORMAL/INFO/DEBUG/TRACE e retenção limitada.

## Execução

A TaskQueue controla concorrência, prioridade, pausa, retomada, cancelamento, timeout, retry finito, limite de fila e STOP. O CircuitBreaker protege buscas externas após falhas repetidas. O tratamento global classifica erros como recoverable, retryable, fatal ou user_action_required.

Screenshots recebem hash, status e deduplicação no IndexedDB; o Base64 legado não é removido.

## Testes

Foram aprovados checks de sintaxe de todos os JavaScript, testes unitários de lifecycle, identidade, endereço, scores, normalização, fila, circuit breaker e validação de backup, validação MV3, IDs únicos e validação dos documentos. Foram revisadas screenshots do popup simplificado e da view Configurações.

Não foi executada uma extração real autenticada contra o Google Maps neste ambiente. Portanto, a precisão foi validada estruturalmente e por regras determinísticas, mas a garantia operacional final depende de teste no navegador com uma sessão real.

## Itens parciais

O backlog contém 257 itens. A v2.15 não implementa integralmente CRM, tags, notas, quarentena visual, enriquecimento externo posterior, presets AND/OR/NOT, virtual scrolling avançado, benchmark de 10.000 leads, monitoramento real de memória e regeneração de screenshot com aba fechada. Esses itens estão descritos em `IMPLEMENTATION_STATUS_V215.md` para evitar alegar conclusão indevida.

## Riscos restantes

Seletores do Google Maps podem mudar. Consultas externas podem falhar ou sofrer limitação. A restauração exige que o usuário selecione um arquivo válido e confirme a operação. O sistema preserva os dados antigos e não executa exclusões automáticas durante migração.
