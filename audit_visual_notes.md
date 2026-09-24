# Auditoria visual inicial — tabela de leads

A imagem fornecida mostra uma tabela com cabeçalho, linha de filtros e linhas de dados dentro do mesmo bloco visual. O principal problema observado é que os filtros ocupam uma segunda linha imediatamente abaixo do cabeçalho, o que dá aparência de recorte e mistura controles com a planilha. As bordas verticais aparecem com pesos e extensões visualmente diferentes entre colunas, especialmente na região de telefone, avaliação e redes/site.

Os dados estão predominantemente alinhados à esquerda, enquanto o pedido é centralizar todas as informações dentro da planilha. Os textos longos são truncados, mas os controles e conteúdos não têm uma linguagem visual totalmente uniforme. A barra de rolagem horizontal é necessária pela quantidade de colunas, porém deve permanecer sem comprometer o alinhamento entre cabeçalho, filtros e linhas.

Riscos de regressão a evitar: perder edição inline, seleção individual e em massa, filtros por coluna, ordenação, presets, redimensionamento de colunas, copiar telefone, copiar linha, visualizar screenshot, excluir lead, marcar revisados e exportações. O layout deve ser alterado sem modificar os dados, chaves de armazenamento, eventos ou regras de extração.

## Verificação do dashboard atualizado

O dashboard atualizado abriu corretamente em uma visão geral local. A aba de Leads Extraídos foi acionada pelo seletor de navegação existente, sem alterar a estrutura dos demais módulos. A validação visual da tabela com dados reais depende do armazenamento da extensão, que não está disponível no carregamento local; por isso, a auditoria combinou o screenshot fornecido, inspeção do DOM/CSS e checagens de sintaxe.

A implementação preserva o contêiner da tabela, a rolagem horizontal necessária e os identificadores originais. Os filtros agora estão fora do elemento `<table>`, com painel próprio, resumo de filtros e ferramentas opcionais.
