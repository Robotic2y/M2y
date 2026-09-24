# Auditoria visual v2.14

A renderização final do popup em 520x760 confirmou a navegação em uma única coluna vertical, sem overflow horizontal visível, com cards da Central de operação separados e os controles de densidade, recolhimento, topo e reset distribuídos sem sobreposição. O aviso de recovery permanece isolado e oculto quando não há execução interrompida.

A renderização do dashboard em 1440x900 confirmou a presença do funil em duas linhas de cards, sem sobreposição com o progresso ou com os grupos Dados/Diagnóstico. O título e os elementos de operação permanecem alinhados e a versão v2.14 aparece no cabeçalho e rodapé.

A largura estreita do dashboard também foi renderizada; os grupos de ações e cards usam as regras responsivas existentes. A validação estática confirmou IDs únicos e ausência de arquivos temporários de renderização no pacote.

## Viewport estreito

Em 820x900, Dados quebra em duas linhas, Diagnóstico ocupa uma linha própria e o funil usa duas colunas. Não foram observados botões sobrepostos ou cortados.
