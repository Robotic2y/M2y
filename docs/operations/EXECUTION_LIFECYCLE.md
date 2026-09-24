# M2y v2.14 — Lifecycle de execução

## Estados

`idle`, `starting`, `running`, `paused`, `stopping`, `stopped`, `completed` e `failed` são estados explícitos.

## Regras críticas

Uma execução em `starting`, `running`, `paused` ou `stopping` bloqueia um novo início com `EXTRACTION_ALREADY_RUNNING`. A transição `stopped → completed` é proibida. Finalizações em estado terminal são idempotentes e não duplicam logs, histórico, notificações ou abertura do dashboard.

## Stop

STOP marca `stopping`, impede novos trabalhos no content script, fecha buscas externas temporárias, persiste o progresso e conclui como `stopped` com razão `user_requested`.

## Recuperação

Ao restaurar `m2y_active_execution`, uma execução interrompida recebe `recoveryStatus: recoverable`. Leads já persistidos permanecem disponíveis. A camada atual expõe o estado para que a interface possa oferecer continuação ou finalização sem apagar dados.

## External search

Cada busca tem timeout configurável, inicialmente 8 segundos, cache padrão de 7 dias, remoção de listener e remoção da aba em sucesso, erro, timeout ou parada.
