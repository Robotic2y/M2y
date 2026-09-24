# M2y

Extensão Chrome Manifest V3 para extração, processamento, persistência e gestão operacional de leads do Google Maps.

## Estrutura

- manifest.json — ponto de entrada da extensão
- background/ — service worker
- content/ — extração no Google Maps
- dashboard/ — interface e persistência do dashboard
- core/ — estado, eventos, agendamento e infraestrutura transversal
- modules/ — domínio, persistência, qualidade e utilitários
- libs/ — bibliotecas distribuídas localmente
- icons/ — ícones da extensão
- docs/ — arquitetura, auditorias, operações, projeto, guias, referências e screenshots
- releases/ — pacotes distribuíveis

## Convenções

Os caminhos de execução seguem os contratos usados pelo Manifest V3 e pelos imports ES modules. O service worker fica em background/service-worker.js; o extrator fica em content/extractor.js; a interface fica em dashboard/; infraestrutura transversal fica em core/; serviços e domínio ficam em modules/; bibliotecas locais ficam em libs/.

## Estado da base

Esta branch reorganiza os 102 arquivos existentes por responsabilidade sem alterar o conteúdo dos arquivos. O pacote ZIP histórico permanece em releases/M2y_v2.15.zip.

A árvore pública contém o código-fonte parcial e o pacote ZIP histórico. A auditoria estrutural identificou referências a componentes que não estão presentes como arquivos independentes na árvore pública, incluindo a interface popup/ e alguns módulos referenciados pelo service worker. Esses componentes devem ser reconciliados com o conteúdo do ZIP antes de considerar a reorganização como uma base de release final.

## Teste

Depois da reconciliação do pacote completo, carregue a pasta como extensão descompactada no Chrome em modo de desenvolvedor e valide instalação, popup, content script, extração, dashboard, persistência e exportação.

## Validação estrutural

Foi adicionado `tools/validate-extension.py`, que verifica referências locais de `manifest.json`, HTML, CSS e imports JavaScript antes de uma release. O objetivo é impedir que uma reorganização de diretórios introduza caminhos quebrados silenciosamente.

## Próxima etapa técnica

Antes de adicionar novas funções de extração, a base precisa passar pela reconciliação do pacote histórico: a árvore pública ainda referencia `popup/` e módulos de `modules/` que não estão presentes como arquivos independentes. Não serão criados stubs ou implementações fictícias para mascarar essas dependências; a implementação original deve ser recuperada e integrada.
