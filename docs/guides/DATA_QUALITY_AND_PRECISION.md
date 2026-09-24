# M2y v2.15 — Qualidade e precisão

A validação contextual passou a calcular pontuação separada para categoria, localização, nome e endereço, produzindo `overall_relevance_score` e uma explicação quando o lead é rejeitado. O limite configurado continua respeitando o comportamento estrito existente por padrão.

O módulo de qualidade preserva os valores originais em `phoneRaw`, `websiteRaw` e campos equivalentes, enquanto cria versões normalizadas. Telefones recebem formato normalizado com país, websites removem parâmetros de tracking conhecidos e recebem domínio principal. Campos suspeitos, completude, classificação e confiança geral são adicionados ao lead sem apagar os dados coletados.

Leads novos recebem fontes básicas para os campos principais. Conflitos não substituem silenciosamente valores melhores: ficam registrados em `conflicts` e `change_history` quando ocorre merge por precedência.

A fila de leads limita concorrência, suporta prioridade, pausa, retomada, cancelamento, timeout e retry finito. STOP interrompe a criação de novas tarefas e rejeita pendências. Um circuit breaker protege buscas externas após falhas consecutivas.
