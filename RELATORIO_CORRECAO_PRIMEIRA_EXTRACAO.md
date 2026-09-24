# Correção da primeira extração — M2y v2.11

## Sintoma

A primeira execução terminava rapidamente e a interface informava que nenhum lead havia sido conseguido, embora a busca do Google Maps ainda estivesse carregando a lista ou a ficha lateral do primeiro estabelecimento.

## Causa raiz

O content script começava o loop assim que recebia `startExtraction`. O código localizava o primeiro contêiner disponível, consultava os cards imediatamente e usava apenas pausas fixas. Na primeira busca, o evento `tab complete` não garantia que os cards reais já estivessem renderizados. Da mesma forma, após clicar no card, `parseFullDetails()` podia ser chamado antes de o título `h1.DUwDvf` existir. Como o parser retornava `null`, a execução acumulava tentativas sem leads e finalizava com total zero.

## Correção mínima aplicada

Foi adicionada uma espera resiliente de até 30 segundos por um feed e por pelo menos um card de resultado, com duas leituras estáveis para evitar a captura durante a reconstrução da lista. Também foi adicionada uma espera de até 10 segundos pela ficha do estabelecimento após o clique, antes de chamar o parser. Em caso de timeout da ficha, a ocorrência é registrada como `place_details_timeout` e o restante do fluxo continua sem quebrar a extensão.

Os contratos existentes foram preservados: `startExtraction`, `leadExtracted`, `progress`, `extractionFinished`, o armazenamento `leads_<executionId>`, filtros, deduplicação, screenshot, logs e métricas continuam com os mesmos nomes e responsabilidades.

## Validação

A sintaxe dos arquivos alterados e dos principais arquivos do popup foi validada com `node --check`. O código foi revisado estruturalmente para confirmar que a correção ocorre antes de `extractVisible()` e antes de `parseFullDetails()`. O pacote final deve ser validado em uma aba real do Google Maps, pois um carregamento `file://` não reproduz a API de extensão nem o DOM autenticado/dinâmico do Maps.

## Arquivo alterado

- `content/extractor.js`

O restante da extensão foi mantido a partir do pacote revisado anterior.
