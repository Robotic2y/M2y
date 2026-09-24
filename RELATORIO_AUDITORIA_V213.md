# Auditoria visual e melhorias M2y v2.13

A captura fornecida mostrou um card de progresso ocupando a mesma faixa visual dos grupos de ações do dashboard. Na extensão, a causa complementar dos dois scrolls verticais era a combinação de `body`, `main` e `.tab-panel` com `overflow-y: auto`.

## Correções e novas funcionalidades

1. Scroll vertical único no popup, pertencente ao `body`.
2. Remoção do scroll concorrente de `main`.
3. Remoção do scroll concorrente dos painéis de abas.
4. Grade responsiva de botões de controle.
5. Quebra segura de linhas de cidade/estado e raio.
6. Grade adaptativa de checkboxes.
7. Grade adaptativa de cards de estatísticas.
8. Grade adaptativa de botões de exportação.
9. Espaçamento mínimo consistente entre cards e controles.
10. Botão de densidade compacta persistente.
11. Botão para recolher/expandir a Central de operação.
12. Botão de retorno ao topo.
13. Indicador visual de progresso do scroll.
14. Memória da última aba usada.
15. Navegação de abas por setas, Home e End.
16. Atalhos Home e End para percorrer a extensão.
17. Reset de organização e densidade.
18. Cabeçalho do dashboard com quebra segura.
19. Grupos de ações do dashboard sem sobreposição em larguras intermediárias.
20. Card de progresso ocupando a linha correta e sem competir com o título.

## Preservação

Nenhum ID de controle, ação de extração, filtro, exportação, pausa, retomada, parada ou screenshot foi removido. As mudanças são CSS aditivo e listeners isolados no módulo de enhancements.

## Auditoria visual

A captura foi inspecionada em três recortes sobrepostos. O painel lateral, o card de progresso e os grupos Dados/Diagnóstico foram considerados na correção. A validação posterior será feita com screenshots headless do popup e do dashboard em desktop e viewport estreito.
