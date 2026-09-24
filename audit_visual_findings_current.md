# Achados visuais desta rodada

- Popup em 520 px de largura: a barra de abas de Busca/Config/Progresso/Exportar/Tutoriais/Updates ultrapassa a largura e mostra scroll horizontal; a primeira melhoria deve trocar a faixa contínua por navegação agrupada ou responsiva sem scroll horizontal.
- O conteúdo inicial fica cortado por uma área interna de altura fixa e há muito espaço branco abaixo do botão Dashboard, indicando que a janela poderia usar melhor a altura disponível.
- A Central de operação está clara, mas ocupa bastante altura para poucos comandos; pode ser compactada e transformada em resumo com ações agrupadas.
- A tabela de Leads Extraídos mantém a coluna Ações em uma linha, com Copiar/Screenshot/Excluir visíveis; o estado indisponível do Screenshot está legível.
- A tabela ainda depende de largura ampla e apresenta tipografia pequena; manter a ação em linha, mas permitir modo responsivo/colunas prioritárias.

Fonte: audit_screens/popup-final.png e audit_screens/leads-actions-final.png.

## Segunda inspeção visual

- Dashboard desktop tem bom contraste e navegação lateral consistente, mas mistura exportações, importação, modelo e JSON Raw numa barra superior extensa; esses comandos devem ser reunidos em grupos (Dados, Visões, Configurações) para reduzir competição visual.
- A navegação lateral tem 8 itens; pode unificar Visão Geral/Análises em uma área de Insights, e Personalizar/Logs/Painel JSON numa área de Configurações/Diagnóstico, mantendo aliases/IDs para compatibilidade.
- Há um estado vazio orientado, mas muito espaço vertical sem conteúdo; melhor aproveitar com checklist de configuração, indicadores de execução e painel de integridade.
- Captura actions-visible-final confirma que a coluna Ações fica em linha, mas a tabela exige viewport largo; a responsividade deve priorizar Nome, Telefone, Localização e Ações em telas estreitas, mantendo outras colunas recolhidas em detalhes.

Fonte: audit_screens/dashboard-final.png e audit_screens/actions-visible-final.png.

## Validação visual headless v2.12

A renderização do popup em 520 px confirmou que as seis abas estão distribuídas em duas linhas de três, sem barra de rolagem horizontal; os rótulos permanecem legíveis e a aba ativa tem destaque visual. A tela continua com o botão Dashboard fixado no rodapé, preservando o caminho de acesso existente.

A renderização do dashboard confirmou os agrupamentos Dados e Diagnóstico, a nova seção Configurações na navegação lateral e o quinto indicador de screenshot válido na Central de operação. O layout continua responsivo no viewport desktop utilizado, com contraste e separação de ações adequados.

Arquivos gerados nesta rodada: `audit_screens/popup-v212.png` e `audit_screens/dashboard-v212.png`.
