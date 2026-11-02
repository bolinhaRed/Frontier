# Arquitectura

Aplicação estática: HTML, CSS e JavaScript em módulos ES, sem bundler, sem servidor e sem
dependências de execução. O Node só serve para testes e simulações.

## Módulos

| Pasta | Função | Pode importar |
| --- | --- | --- |
| `src/core` | Motor de regras: estado, acções, regras, hexágonos, RNG | `src/core`, `src/data` |
| `src/data` | Tabelas de dados e valores de equilíbrio | `src/data` |
| `src/ai` | IA (etapa 5) | `src/core`, `src/data` |
| `src/storage` | Gravação local (etapas 3 e 4) | `src/core`, `src/data` |
| `src/ui` | Interface, mapa, áudio | tudo |

O teste `tests/deps.test.js` garante as regras da coluna da direita para `src/core` e `src/data`,
proíbe APIs do browser nessas pastas e só permite `Math.random` em `src/ui` (seed de uma partida nova e música generativa, sem efeito nas regras).

## Princípios

- `applyAction(estado, acção)` será a única forma de alterar o estado (etapa 1); devolve o novo estado ou um erro.
- O estado é JSON simples: sem classes, funções ou referências circulares.
- O estado do gerador aleatório vive dentro do estado da partida (`rngState`, `nextFloat` em `src/core/rng.js`), por isso uma partida gravada continua exactamente igual.
- `legalActions(estado)` alimenta a IA, a interface e os testes.
- Na 2.0, um servidor pode importar o mesmo `src/core`. Na 1.0 não há código de rede.

## Estado da etapa 0

| Ficheiro | Origem | Estado |
| --- | --- | --- |
| `src/core/hex.js` | `hex-coordinates.js` | Reutilizado sem alterações de fundo |
| `src/core/rng.js` | `rng.js` | Reutilizado; acrescentado estado serializável; `randomSeed` passou para `src/ui/seed.js`; `makeNoise` retirado (era do gerador de mapas antigo) |
| `src/ui/map-view.js` | `map-engine.js` | Câmara, toque, pinça, roda e mipmaps mantidos; nevoeiro, exploradores e caminhos retirados |
| `src/ui/assets.js` | `assets.js` | Caminhos novos (`assets/tiles/`) |
| `src/ui/audio.js` | `audio.js` | Copiado; ainda não ligado |
| `src/ui/dom.js` | `ui.js` | Só `$` e `esc`; toast, modal e banner entram quando forem precisos |
| `css/base.css`, `css/map.css` | `style.css`, `map.css` | Copiados |

Ainda não existem `state.js`, `apply.js`, `actions/`, `rules/` nem dados: começam na etapa 1.
