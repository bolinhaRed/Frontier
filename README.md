# FRONTIER — The Unknown Lands

Jogo de estratégia com terrenos hexagonais, inspirado em Carcassonne, Catan e nos roguelites.
2 a 4 jogadores, humanos ou IA, no mesmo dispositivo. PWA em HTML, CSS e JavaScript, exclusivamente
local: sem servidor, sem contas e sem rede durante a partida.

**Estado: etapa 3 de 10.** Free Frontier completo, para 2 a 4 jogadores no mesmo PC ou telemóvel:
ecrã de passagem do aparelho entre jogadores (a mão e o objectivo privado só aparecem a quem está a
jogar), gravação automática depois de cada acção e retoma ao reabrir a página. Ainda sem os 2
acontecimentos (etapa 6). Próxima etapa: gravações múltiplas, exportar e importar.

## Correr

```
npm run serve          # abre http://localhost:8080
```

Sem Node: `python3 -m http.server 8080` na pasta do projecto.
No Windows, se o PowerShell bloquear o `npm`, usa `npm.cmd run serve`.

A música começa desligada; liga-a no botão "Música".

## Publicar no GitHub Pages

O jogo é um site estático: não precisa de Node nem de servidor. O workflow
`.github/workflows/pages.yml` corre os testes e publica só os ficheiros do jogo (cerca de 2,7 MB)
sempre que há um push no `main`.

1. Envia esta pasta para `https://github.com/bolinhaRed/frontier` com Git (ver abaixo). Não uses o
   upload pelo browser: deixa de fora as pastas e ficheiros que começam por ponto (`.github`, `.nojekyll`).
2. No GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Em **Actions**, espera que "Publicar no GitHub Pages" fique verde (1 a 2 minutos).
4. O jogo fica em <https://bolinhared.github.io/frontier/>.

Primeira vez (repositório vazio), dentro desta pasta:

```
git init -b main
git add .
git commit -m "FRONTIER 1.0 - etapa 3"
git remote add origin https://github.com/bolinhaRed/frontier.git
git push -u origin main
```

Se o repositório já tiver ficheiros: faz `git clone` do repositório, copia por cima o conteúdo desta
pasta, e depois `git add .`, `git commit -m "..."` e `git push`.

As partidas gravam-se no browser de cada aparelho; publicar uma versão nova não apaga a partida em curso.

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
- `docs/BASE-ETAPA2.md` — base usada na etapa 2 e ficheiros desconhecidos isolados

## Licenças

Código: MIT (`LICENSE`). Ilustrações: C. Martins, licença por confirmar pacote a pacote (`CREDITS.md`).

Repositório: <https://github.com/bolinhaRed/frontier>
