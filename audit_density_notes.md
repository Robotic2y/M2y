# Auditoria de densidade da tabela

A folha possui regras acumuladas em blocos sucessivos. Há regras antigas com 54px de altura, regras posteriores com 48px e uma correção mais recente que libera altura automática para horários. Essa sobreposição cria risco de espaçamento inconsistente e faz com que ações, telefone e redes possam parecer ter faixas internas.

A meta desta rodada é consolidar uma densidade compacta: linha de dados com altura visual de 34px, padding vertical de 4px, controles de 24px, uma única linha por campo, `min-width: 0` e ellipsis. A edição inline continuará podendo expandir apenas enquanto a célula estiver em foco; fora do foco, a tabela permanece compacta.

A coluna de horários será mantida legível e com tooltip para o conteúdo completo, mas sem permitir que o restante das colunas aumente artificialmente a altura da linha.

## Screenshot da rodada compacta

O dashboard abriu com os controles existentes e os recursos de importação preservados. A aba de Leads Extraídos foi acionada pelo mesmo seletor de navegação da extensão. Como o ambiente local não carrega os dados de `chrome.storage.local`, a validação de linhas preenchidas foi complementada por inspeção das regras finais: altura visual alvo de 36px, padding vertical de 4px, controles de 22px e uma única linha com ellipsis.

A auditoria mantém a rolagem horizontal para colunas estreitas, mas reduz o espaço interno das células e evita que horários, telefone ou ações aumentem a altura dos registros.
