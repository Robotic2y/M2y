# Correção visual da célula Ações

A causa do corte era uma combinação de regras conflitantes: a célula `td.action-cell` estava sendo convertida em `display:flex`, enquanto a tabela usava `table-layout: fixed`, `overflow: hidden` nas células e uma altura máxima rígida. Isso fazia o grupo interno perder largura útil, apesar de os botões estarem configurados com `nowrap`.

A correção foi isolada no CSS do Dashboard. A célula voltou a ser explicitamente `table-cell`, recebeu largura real de 230px e overflow visível, enquanto o grupo interno passou a ter 218px fixos em `inline-flex`. Os botões receberam larguras explícitas: 60px para Copiar, 84px para Screenshot e 60px para Excluir, com espaçamento e padding compatíveis.

Os seletores, IDs, classes e handlers existentes não foram alterados. O screenshot `audit_screens/actions-visible-final.png` confirma que os três botões aparecem inteiros em duas linhas de exemplo, sem quebra, corte ou sobreposição.

A sintaxe dos arquivos JavaScript foi validada e o pacote foi testado com `unzip -t`.
