# Auditoria e melhorias da tabela de leads

A interface foi revisada com base no screenshot fornecido e na estrutura atual do dashboard. O problema central era a mistura entre filtros e planilha, combinada com bordas visualmente irregulares, células não centralizadas e controles distribuídos de forma pouco uniforme.

## Ajustes visuais implementados

A tabela agora utiliza uma grade contínua com bordas uniformes, cabeçalho centralizado, linhas com altura consistente, zebra striping discreto, realce de linha ao passar o mouse, foco visual para edição inline e centralização das informações, checkboxes, redes sociais e ações. Os filtros foram removidos de dentro do elemento da planilha e passaram para um painel independente acima da tabela.

## Melhorias adicionais implementadas

| Nº | Melhoria | Comportamento |
|---:|---|---|
| 1 | Busca geral | Pesquisa simultaneamente em todos os campos do lead. |
| 2 | Resumo de filtros | Exibe quantidade de filtros ativos e quantidade visível. |
| 3 | Painel recolhível | Permite ocultar ou mostrar os filtros e memoriza a preferência. |
| 4 | Copiar visíveis | Copia os resultados filtrados em formato tabular para colar no Excel. |
| 5 | Exportar visíveis | Exporta somente os resultados filtrados em JSON. |
| 6 | Limpar seleção | Remove a seleção atual sem apagar leads. |
| 7 | Selecionar visíveis | O checkbox geral atua somente sobre os resultados filtrados. |
| 8 | Tela cheia | Expande a área de leads para uso semelhante a uma planilha. |
| 9 | Ajustar colunas | Restaura as larguras padrão e remove redimensionamentos salvos. |
| 10 | Atalho Ctrl/Cmd+F | Foca diretamente na busca geral quando a visão de leads está aberta. |
| 11 | Atalho Esc | Limpa filtros quando o foco está em um campo de busca. |
| 12 | Alt+clique | Copia o conteúdo completo de uma célula com tooltip. |

As funcionalidades existentes — edição inline, ordenação, presets, densidade, seleção individual, copiar telefone, copiar linha, screenshot, exclusão, revisão em massa e exportações existentes — foram mantidas.

## Validação

A validação final passou na checagem de sintaxe JavaScript, parsing do HTML, conexão dos novos identificadores com o código, confirmação de que os filtros estão fora da tabela, presença da grade estilo Excel, centralização, truncamento com tooltip e preservação dos controles existentes. A inspeção visual local foi limitada à ausência de dados da extensão no armazenamento do navegador; o screenshot fornecido foi usado como referência principal para a auditoria de layout.
