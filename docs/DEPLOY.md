# Publicação

## Correr localmente

Os módulos ES não funcionam abrindo o `index.html` directamente; é preciso um servidor estático:

```
npm run serve            # http://localhost:8080
# ou
python3 -m http.server 8080
```

## GitHub Pages (etapa 9)

O workflow `pages.yml`, o service worker e a publicação em `https://bolinhared.github.io/frontier/`
entram na etapa 9, **depois de confirmadas as licenças dos assets** (ver `docs/ASSETS.md`).
Até lá, se o repositório for público, os PNG ficam visíveis a qualquer pessoa; por isso convém
mantê-lo privado ou confirmar as licenças antes do primeiro push.

Passos previstos: Settings → Pages → Source: "GitHub Actions"; cada push no `main` corre os testes
rápidos e publica os ficheiros tal como estão, sem build. Todos os caminhos são relativos para
funcionar em `/frontier/`.
