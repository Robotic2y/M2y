# Auditoria visual — rodada atual

O screenshot atual mostra linhas horizontais internas dentro das células de Telefone, Redes / Site e Ações. A causa mais provável é a combinação de células da tabela com `display: flex` aplicado diretamente ao `td`, alturas forçadas em vários seletores e bordas herdadas em elementos internos ou em faixas com overflow. A correção deve manter o contorno da célula como única grade e evitar que os elementos internos criem linhas, alturas ou bordas próprias.

A coluna de horários está sendo cortada horizontalmente e exibe apenas o início do texto, portanto o conteúdo precisa ser normalizado para uma lista curta e legível, com uma linha por dia e separador `|`. O tratamento deve aceitar tanto horários já separados por ` | ` quanto strings com quebras de linha ou diferentes marcadores.

A nova importação deve aceitar JSON, CSV e XLSX, validar registros sem executar código externo, preservar o armazenamento existente e fazer mesclagem sem apagar leads atuais. O fluxo deve informar quantos registros foram importados, ignorados e duplicados.

## Verificação visual da rodada atual

O dashboard local abriu com os novos controles de importação e modelo visíveis no cabeçalho, sem alterar a estrutura das exportações existentes. A navegação para Leads Extraídos foi acionada pelo DOM da interface original. Como o carregamento local não possui `chrome.storage.local` com leads reais, a avaliação das células com conteúdo foi complementada por inspeção de CSS, renderização e checagens automatizadas.

A correção visual foi direcionada para remover `display:flex` do próprio `td` nas colunas Telefone, Redes / Site e Ações. O flex foi mantido apenas nos wrappers internos transparentes, sem bordas ou sombras. Os horários agora são normalizados antes de renderizar, preservando feriados e separando cada dia em sua própria linha.

A captura visual final confirmou a presença dos botões de Importar e Modelo junto às exportações existentes. O console não exibiu erro novo durante a navegação acionada. A visão local continua sem leads porque o armazenamento da extensão não é carregado em `file://`, portanto a validação de linhas de dados foi feita por inspeção estrutural e testes automatizados.
