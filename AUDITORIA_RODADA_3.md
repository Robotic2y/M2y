# Auditoria da rodada 3 — leads extraídos

A análise do screenshot atual identificou que as linhas extras nas colunas Telefone, Redes / Site e Ações eram causadas pelo uso de `display: flex` diretamente no elemento da célula, combinado com alturas e bordas em múltiplas camadas. A correção mantém o `td` como célula real da tabela e desloca o flex para wrappers internos transparentes, eliminando bordas, sombras e alturas independentes dentro da célula.

Os horários passaram a ser normalizados no dashboard antes da renderização. A saída usa uma linha por dia, preserva observações entre parênteses e converte variações como `24h` e `24 horas` para `Atendimento 24 horas`. O formato resultante segue o padrão `Dia-feira (observação) | Atendimento 24 horas`.

A importação aceita JSON, CSV e XLSX. O fluxo normaliza nomes de colunas, aceita aliases em português e inglês, valida registros vazios, detecta possíveis duplicidades, pede confirmação antes de gravar, armazena em uma chave própria, recarrega o dashboard e informa os totais processados. Também foi incluído um modelo CSV para reduzir erros de preenchimento.

## Melhorias auditadas nesta rodada

| Nº | Melhoria | Resultado |
|---:|---|---|
| 1 | Remoção de bordas internas no telefone | Uma única borda de célula. |
| 2 | Remoção de bordas internas em redes/site | Ícones ficam dentro de wrapper transparente. |
| 3 | Remoção de bordas internas em ações | Botões permanecem agrupados sem subcélulas. |
| 4 | Formatação diária de horários | Cada dia fica em uma linha. |
| 5 | Preservação de feriados | Observações entre parênteses são mantidas. |
| 6 | Normalização de atendimento 24 horas | `24h` e equivalentes viram texto consistente. |
| 7 | Importação JSON | Aceita array direto ou propriedade `leads`. |
| 8 | Importação CSV | Aceita vírgula, ponto e vírgula e tabulação. |
| 9 | Importação XLSX | Usa o módulo XLSX já distribuído na extensão. |
| 10 | Normalização de cabeçalhos | Converte aliases e acentos para chaves compatíveis. |
| 11 | Validação de linhas vazias | Registros sem dados úteis são ignorados. |
| 12 | Detecção de duplicidades | Possíveis duplicidades são informadas antes da gravação. |
| 13 | Confirmação de importação | O usuário confirma a operação antes de persistir. |
| 14 | Modelo de importação | Baixa um CSV compatível com o formato esperado. |
| 15 | Resumo do processamento | Informa importados, duplicados e ignorados. |

As funcionalidades anteriores de seleção, filtros, busca global, ordenação, edição inline, presets, exportações, ações de linha, revisão em massa, tela cheia, ajuste de colunas e atalhos permanecem preservadas.

## Validação técnica

A sintaxe JavaScript foi validada com `node --check`. O HTML foi analisado estruturalmente, confirmando os novos controles e a ausência de filtros dentro da tabela. As regras CSS foram verificadas para garantir uma única borda por célula e wrappers internos sem borda. A auditoria visual foi executada com screenshots do dashboard local e com o screenshot fornecido pelo usuário como referência. O ambiente local não possui os dados de `chrome.storage.local`, portanto a visualização de linhas preenchidas foi complementada por validação estrutural e estática.
