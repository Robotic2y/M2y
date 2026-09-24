# Backlog de evolução M2y v2.11

O backlog foi desenhado para ser **aditivo e reversível**, sem alterar chaves existentes, contratos de mensagens ou seletores já consumidos pelos fluxos atuais.

| Nº | Área | Funcionalidade | Critério de aceite |
|---:|---|---|---|
| 1 | Inicial | Resumo de última busca | Mostra categoria, cidade e data quando disponíveis. |
| 2 | Inicial | Atalho para repetir busca | Repreenche os campos sem iniciar automaticamente. |
| 3 | Inicial | Favoritos de consultas | Salva e recupera consultas nomeadas. |
| 4 | Inicial | Histórico recente | Lista as últimas consultas executadas. |
| 5 | Inicial | Limpar histórico | Remove somente o histórico novo. |
| 6 | Inicial | Indicador de prontidão | Exibe estado de validação do formulário. |
| 7 | Inicial | Contagem de parâmetros | Atualiza quantos campos úteis foram preenchidos. |
| 8 | Inicial | Estimativa de volume | Mostra faixa estimada a partir de raio e limite. |
| 9 | Inicial | Preset rápido seguro | Aplica valores conservadores sem apagar outros campos. |
| 10 | Inicial | Preset rápido completo | Aplica coleta ampliada preservando consulta. |
| 11 | Inicial | Validação de cidade/UF | Alerta quando cidade e UF parecem incompatíveis. |
| 12 | Inicial | Ajuda contextual | Exibe dicas sem bloquear o formulário. |
| 13 | Inicial | Atalhos de teclado | Ctrl/Cmd+Enter inicia; Esc limpa foco. |
| 14 | Inicial | Estado offline | Informa indisponibilidade sem quebrar a busca. |
| 15 | Inicial | Tema claro/escuro | Alterna e persiste somente preferência visual. |
| 16 | Inicial | Acessibilidade | Foco visível, aria-labels e live region. |
| 17 | Inicial | Centro de notificações | Reúne mensagens recentes em um painel leve. |
| 18 | Inicial | Recuperação de configuração | Desfaz a última alteração de configuração nova. |
| 19 | Dashboard | Cards de operação | Mostra leads, revisados, telefone e presença digital. |
| 20 | Dashboard | Estado vazio orientado | Explica como começar e oferece atalhos. |
| 21 | Dashboard | Ações rápidas | Nova busca, repetir última, abrir Leads e atualizar. |
| 22 | Dashboard | Última execução | Mostra parâmetros e status da execução anterior. |
| 23 | Dashboard | Saúde do sistema | Indica storage, última atualização e integridade. |
| 24 | Dashboard | Atividade recente | Lista alterações e importações recentes. |
| 25 | Dashboard | Filtro por período | Filtra atividades sem afetar leads. |
| 26 | Dashboard | Alternância de tema | Persiste tema sem interferir na identidade existente. |
| 27 | Dashboard | Densidade global | Alterna confortável/compacta na área de visão geral. |
| 28 | Dashboard | Barra de busca global | Localiza view, lead ou ação. |
| 29 | Dashboard | Central de comandos | Atalhos por teclado para navegação. |
| 30 | Dashboard | Favoritos de views | Fixa a view mais usada. |
| 31 | Dashboard | Exportação rápida | Exporta o resumo atual sem substituir exportações. |
| 32 | Dashboard | Atualização manual | Recarrega dados e informa horário. |
| 33 | Dashboard | Indicador de dados novos | Marca mudanças desde a última visita. |
| 34 | Dashboard | Copiar resumo | Copia métricas em texto tabular. |
| 35 | Dashboard | Painel de notas | Permite notas locais sem misturar com leads. |
| 36 | Dashboard | Tour de primeira visita | Mostra orientação descartável e persistente. |
| 37 | Dashboard | Atalhos por view | Exibe ajuda de teclas no rodapé. |
| 38 | Dashboard | Estado de erro recuperável | Apresenta retry sem ocultar dados anteriores. |
| 39 | Dashboard | Indicador de importação | Mostra arquivo e resultado da última importação. |
| 40 | Dashboard | Relatório de auditoria | Entrega matriz de preservação e screenshots finais. |

## Regra de não regressão

Nenhuma funcionalidade existente será removida. Os novos módulos usam prefixo de armazenamento `m2y_enhancement_`, listeners independentes e verificações de existência de elementos. O fallback em `file://` e no contexto sem APIs de extensão deve permanecer silencioso.
