# FRONTIER — The Unknown Lands

Jogo de estratégia com terrenos hexagonais, inspirado em Carcassonne, Catan e nos roguelites.
2 a 4 jogadores, humanos ou IA, no mesmo dispositivo. PWA em HTML, CSS e JavaScript, exclusivamente
local: sem servidor, sem contas e sem rede durante a partida.

**Estado: etapa 0 de 10.** A página carrega os atlas e desenha um mapa vazio (Lago neutro e três
locais especiais); ainda não há regras de jogo. Próxima etapa: estado e colocação.

## Correr

```
npm run serve          # abre http://localhost:8080
```

Sem Node: `python3 -m http.server 8080` na pasta do projecto.

## Testes

```
npm test               # testes rápidos (< 5 s); correm também no GitHub Actions
npm run test:watch     # repete os testes ao gravar
npm run test:affected  # só os testes afectados pelas alterações desde o último commit
```

Precisa de Node 20 ou mais recente. Não há dependências para instalar.

## Documentação

- `docs/SPEC.md` — especificação rev. 1.4 (regras, plano, valores provisórios)
- `docs/ARCHITECTURE.md` — módulos e regras de dependências
- `docs/TESTING.md` — níveis de testes e uso dos limites de aceitação
- `docs/ASSETS.md` — inventário e situação das licenças
- `docs/DEPLOY.md` — correr localmente e publicar

## Licenças

Código: MIT (`LICENSE`). Ilustrações: C. Martins, licença por confirmar pacote a pacote (`CREDITS.md`).

Repositório: <https://github.com/bolinhaRed/frontier>
