# M2y v2.15 — Backup, diagnóstico e integridade

A extensão agora cria backups incrementais na instalação e na inicialização do service worker. O sistema calcula hashes por chave de storage e grava somente blocos alterados no armazenamento de backup. A exportação manual gera um arquivo único no formato `M2Y_BACKUP`.

Antes da restauração, o estado atual é exportado como rollback e a carga recebida é validada. Chaves internas de backup não podem ser restauradas pelo arquivo importado. Leads precisam ser arrays quando pertencem a uma chave `leads_*`; caso contrário a restauração é recusada.

A view Configurações ganhou uma área técnica separada para criar backup, exportar backup completo, restaurar backup, executar Health Check e copiar diagnóstico. A visão principal permanece enxuta.

O Health Check verifica storage, IndexedDB, service worker, content script, comunicação, extração, deduplicação, screenshots, exportação e sistema de eventos. Falhas são apresentadas como diagnóstico acionável e não interrompem a leitura dos leads.

O logger possui níveis NORMAL, INFO, DEBUG e TRACE, retenção máxima de 5.000 registros por execução e campos estruturados para timestamp, módulo, nível, executionId, leadId, mensagem, erro e detalhes.
