# Auditoria visual v2.13

A captura original foi lida em três recortes sobrepostos. Ela mostrou o painel de progresso ocupando a mesma região visual dos grupos Dados/Diagnóstico, além de uma composição com pouco espaço entre blocos.

A renderização atualizada do popup em 520x700 confirmou que a Central de operação e os quatro novos controles quebram em linhas próprias, sem sobreposição. O conteúdo abaixo continua acessível pelo scroll do body; `main` e os painéis não possuem mais scroll concorrente.

A primeira renderização do dashboard usando um arquivo temporário fora da pasta do projeto não carregou seus recursos relativos e, portanto, foi descartada como evidência visual. Será repetida com o arquivo dentro da raiz correta do projeto.

## Validação headless final

O dashboard em 1440x900 mostrou o progresso em uma linha própria, com Dados e Diagnóstico separados e sem sobreposição com o título. Em 820x900, os botões Dados quebraram em duas linhas dentro do próprio grupo e o Diagnóstico permaneceu em um card independente; os cards de métricas passaram para duas colunas sem extrapolar.

Arquivos de evidência: `audit_screens/popup-v213.png`, `audit_screens/dashboard-v213-correct.png` e `audit_screens/dashboard-v213-narrow-correct.png`.

## Confirmação final

As screenshots finais confirmam a identificação v2.13. O popup mantém uma única área de rolagem do conteúdo geral e apresenta Densidade, Recolher, Topo e Layout em linhas separadas. O dashboard mantém o progresso abaixo do título e deixa os grupos Dados/Diagnóstico em regiões independentes.
