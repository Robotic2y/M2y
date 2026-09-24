# Achados visuais da auditoria de referência

## Tela inicial

A tela inicial apresenta uma identidade visual coerente, com cabeçalho, abas e formulário de busca já funcionais. O screenshot revela, porém, espaço vertical ocioso após o botão de Dashboard, navegação horizontalmente comprimida em uma janela estreita, ausência de um resumo rápido de configuração/última execução e pouca orientação contextual para o primeiro uso.

## Dashboard

O Dashboard tem uma base visual consistente, com sidebar escura, cabeçalho de ações e cartões de métricas. No estado sem dados, a área principal fica excessivamente vazia: o gráfico não oferece um estado vazio explicativo nem próximos passos. O cabeçalho concentra muitos botões em uma única linha, e faltam ações rápidas para iniciar nova busca, reabrir a última execução, alternar tema e acessar ajuda. A sidebar poderia oferecer melhor hierarquia com indicadores de atividade e atalhos.

## Restrições de preservação

A implementação deve manter os IDs, nomes de chaves do `chrome.storage.local`, eventos de extração, edição inline, filtros, seleção, ordenação, importação/exportação, comparação de perfis, logs, JSON Raw e fluxo de navegação existentes. As novas capacidades devem ser aditivas, com fallback silencioso quando executadas fora do contexto da extensão.

## Referência capturada

- `audit_screens/popup-before.png`
- `audit_screens/dashboard-before.png`
