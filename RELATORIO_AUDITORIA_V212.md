# Auditoria e melhorias M2y v2.12

## Escopo

Esta rodada revisou as capturas existentes de popup, dashboard e tabela de leads, além dos contratos de comunicação entre popup, service worker e content script. O trabalho foi feito sobre a cópia do pacote anexado e preservou os identificadores e as mensagens já usados pelo fluxo atual.

## Melhorias implementadas

| Nº | Área | Melhoria | Verificação planejada |
|---:|---|---|---|
| 1 | Popup | Navegação em grade responsiva | Seis abas permanecem dentro da largura do popup sem scroll horizontal. |
| 2 | Popup | Estados acessíveis de aba | `aria-selected` acompanha a aba ativa e os `data-tab` existentes permanecem. |
| 3 | Popup | Nova opção de validação estrita | A configuração é carregada, salva, desfeita e enviada na execução. |
| 4 | Extração | Contexto configurado anexado ao lead | Categoria, cidade, UF e raio solicitados acompanham cada registro. |
| 5 | Extração | Match de categoria/local | Divergências explícitas são rejeitadas quando a validação estrita está ligada; casos desconhecidos não são descartados por engano. |
| 6 | Extração | Filtros antecipados | Telefone, site, status e nota mínima são aplicados antes de busca externa e screenshot. |
| 7 | Extração | Campos opcionais | Avaliações, horários, e-mails e redes sociais respeitam as preferências configuradas. |
| 8 | Extração | Duplicidade configurável | Cache local, cache global e cleanup respeitam o valor efetivo da execução. |
| 9 | Execução | Aba do Maps em segundo plano | A aba alvo é criada/reutilizada com `active:false`, sem tomar a aba atual do usuário. |
| 10 | Execução | Controles por aba | Pausa, retomada e parada miram somente `targetTabId`. |
| 11 | Execução | Recuperação do service worker | Estado mínimo da execução e alvo são persistidos em `m2y_active_execution`. |
| 12 | Screenshots | Captura sem foco | `chrome.debugger` + CDP usa `Page.captureScreenshot` sem ativar o Maps. |
| 13 | Screenshots | Retry e validação | Até três tentativas, validação de base64 e fallback apenas se a aba já estiver ativa. |
| 14 | Screenshots | Guard de persistência | Leads sem imagem válida não são aceitos pelo service worker. |
| 15 | Dashboard | Auditoria de cobertura | Nova área de configurações mostra a proporção de screenshots válidos e pendências. |
| 16 | Dashboard | Navegação agrupada | Dados, Insights e Configurações reduzem a lista visual sem remover views. |
| 17 | Dashboard | Nova view Configurações | Autoatualização, guard de screenshot, densidade e preservação de filtros. |
| 18 | Dashboard | Ações agrupadas | Exportações e diagnóstico deixam de competir numa única faixa. |
| 19 | Dashboard | Autoatualização controlada | Atualiza a cada 30 segundos enquanto o dashboard está aberto, com opção persistente. |
| 20 | Qualidade | Score aderente à configuração | Campos desabilitados não penalizam a qualidade; screenshot validado tem peso maior. |

## Preservação

Continuam presentes os fluxos de início, pausa, retomada, parada, histórico, exportação CSV/XLSX/TXT, importação, filtros, seleção, ordenação, edição inline, visualização e exclusão de screenshot. A coluna Ações continua com os mesmos seletores `.copy-row-btn`, `.view-ss-btn` e `.delete-row-btn`.

## Evidência visual revisada

A auditoria visual utilizou as capturas existentes `audit_screens/popup-final.png`, `dashboard-final.png`, `leads-actions-final.png` e `actions-visible-final.png`. A nova camada corrige os pontos observados: o popup não depende da faixa horizontal de abas, o dashboard passa a agrupar a navegação e a nova área de Configurações dá visibilidade à integridade de screenshots.

## Limitações honestas

A captura CDP depende da permissão nova `debugger` e de o Chrome permitir a conexão ao protocolo da aba alvo. Se o protocolo for bloqueado, a execução registra o erro e não grava o lead sem screenshot. A confirmação final do DOM do Google Maps deve ser feita com uma execução real, porque seletores e carregamento são dinâmicos; a validação local cobre sintaxe, contratos, marcadores de UI e regras de fallback.
