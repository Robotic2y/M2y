# M2y v2.14 — Troubleshooting

## Execução não inicia

Verifique se há outra execução em `running`, `paused` ou `stopping`. O erro esperado é `EXTRACTION_ALREADY_RUNNING`. Use STOP ou aguarde a finalização.

## Busca social expira

O timeout padrão é 8 segundos. O lead não é descartado automaticamente por uma busca externa individual; o erro fica registrado no diagnóstico e a aba temporária é fechada.

## Screenshot ausente

A captura usa CDP sem mudar o foco da janela. O lead só é aceito quando a resposta contém uma imagem válida. Verifique a permissão `debugger`, recarregue a extensão e mantenha a aba do Maps disponível.

## Lead antigo sem scores

Isso é esperado. Scores são campos adicionais calculados para leads novos; leads antigos continuam legíveis e podem ser recalculados em uma futura rotina de manutenção.

## Google Maps alterou seletores

O extractor mantém os seletores atuais e usa fallbacks por role, aria-label, data-item-id e estrutura semântica. Falhas são registradas como `selector_failure`.

## Limitações conhecidas

A interface de recuperação ainda expõe o estado recuperável para integração com o popup, mas a escolha visual continuar/finalizar/descartar deve ser conectada a controles específicos em uma próxima iteração. A limpeza global de duplicados continua disponível, porém é deliberadamente manual para evitar scans desnecessários.
