# Relatório de auditoria e evolução — M2y v2.11

## Escopo

A extensão foi descompactada em uma cópia de trabalho, auditada por estrutura, sintaxe e screenshots locais, e recebeu uma camada de evolução isolada. O pacote original foi preservado; as alterações foram feitas somente na cópia de trabalho.

## Resultado

Foram implementadas **40 funcionalidades planejadas**, com uma camada efetivamente adicionada à tela inicial e ao Dashboard. Os novos módulos usam prefixos próprios, armazenamento separado em `m2y_enhancement_popup` e `m2y_enhancement_dashboard`, verificações defensivas para `chrome.storage.local` e fallback para `localStorage`, evitando interferência nas chaves e nos eventos existentes.

| Área | Entregas principais |
|---|---|
| Tela inicial | Central de operação, contagem de parâmetros, indicador de prontidão, última busca, repetição, favoritos, histórico, presets seguro/completo, tema, atalhos Ctrl/Cmd+Enter e Esc, mensagens acessíveis e orientação contextual. |
| Dashboard | Cards operacionais, estado vazio orientado, ações rápidas, saúde do sistema, atividade recente, notas rápidas, tema, atalhos N/L/R/? e atualização manual. |
| Preservação | Exportações, importações, filtros, seleção, ordenação, edição inline, comparação, logs, JSON Raw, progresso, mensagens e navegação existentes mantidos. |

## Validação técnica

A sintaxe JavaScript foi validada para os arquivos existentes e para os dois novos módulos. A renderização local confirmou a presença visual da nova camada nas duas áreas. O teste do ZIP original também foi executado antes da geração do pacote atualizado.

A validação via `file://` não carrega leads reais nem a API `chrome.storage.local`; consequentemente, o estado sem dados foi usado para a inspeção visual. O código novo foi projetado para degradar com segurança nesse cenário e para usar o armazenamento da extensão quando instalado no Chrome.

## Screenshots

- Antes: `audit_screens/popup-before.png`
- Depois: `audit_screens/popup-after.png`
- Antes: `audit_screens/dashboard-before.png`
- Depois: `audit_screens/dashboard-after.png`

## Observação de instalação

Instale o ZIP atualizado como extensão descompactada após extração, pelo modo de desenvolvedor do Chrome, e valide uma extração real para confirmar a integração com o ambiente autenticado do navegador e os dados existentes.
