# Assets

O inventário completo, ficheiro a ficheiro, está em `assets/inventory.json` (nome, pacote, índice,
variante, dimensões, transparência, nome usado no jogo, categoria e uso). O teste
`tests/assets.test.js` confirma que o inventário corresponde aos ficheiros.

## Pastas

| Pasta | Conteúdo |
| --- | --- |
| `assets/source/hex-flat/` | 162 PNG originais de topo plano, 238×207: 27 tiles × 6 variantes (deadlands, drylands, foundation, greenlands, icelands, sandlands) |
| `assets/source/hex-pointy/` | 79 PNG originais de topo pontiagudo, 221–222×255: desert 20, forest 20, mountain 20, tundra 19 |
| `assets/tiles/` | Atlas WebP usados pelo mapa (5 biomas + `sketch`) e `atlas.json` |
| `assets/art/` | Folhas WebP das cenas de topo pontiagudo e `art.json` |
| `assets/fonts/`, `assets/icons/`, `assets/ui/` | Do projecto original |
| `assets/LICENSES/` | Textos das licenças, a juntar |

Os atlas vêm do projecto original. Uma ferramenta para os regenerar a partir de `assets/source/`
só será escrita se for preciso alterar tiles (por exemplo, a recoloração do Incêndio).

## Uso na 1.0

| Categoria | Tiles de topo plano |
| --- | --- |
| Terrenos | #3 Planície, #2 Floresta, #4 Bosque, #6 Colinas, #9 Montanhas, #10 Lago, #7 Rio |
| Estruturas | #26 Quinta, #11 Aldeia, #13 Torre de vigia, #22 Fortaleza, #12 Castelo, #23 Maravilha |
| Locais especiais | #18 Ruínas, #15 Caverna, #24 Cristais, #25 Círculo de pedras, #19 Cemitério |
| Alterações e efeitos | #17 Árvores mortas, #1 Vulcão, #27 Nevoeiro |
| Não usados | #5 water, #8 portal, #14 community, #16 hole, #20 swamp, #21 floating-Island |

Arte dos acontecimentos (topo pontiagudo): `forest_18_blast` (recolorido a laranja), `forest_08_spider`,
`tundra_04_snowStorm`, `tundra_01_full`, `forest_17_ruins`, `mountain_11_cave`, `desert_19_road`,
`forest_10_mushroom`, `mountain_04_vulcano`; o Nevoeiro usa o tile #27. As restantes 70 cenas ficam
reservadas.

## Origem e licenças

**Estado: por verificar, para os dois pacotes.** Isto bloqueia apenas tornar o repositório público e
publicar no GitHub Pages; não bloqueia o desenvolvimento local.

O que se sabe:

- Os PNG não têm metadados de autor nem de licença (só perfil de cor e "Adobe ImageReady").
- O projecto original atribui os desenhos a Carlos Martins, `cmartins.itch.io`, com licença CC BY, no ecrã de créditos e num PNG de crédito ("Art by C. Martins, CC BY").
- Essa atribuição foi escrita no projecto original e não foi confirmada na fonte. **A licença de um pacote não cobre automaticamente o outro.**

O que falta fazer, para cada pacote (foundation tiles; Forest; Desert; Mountain; Tundra):

1. Abrir a página onde foi descarregado e anotar o título exacto e a ligação.
2. Anotar a versão da licença (por exemplo CC BY 4.0) e se a página impõe condições extra.
3. Guardar o texto da licença em `assets/LICENSES/` e preencher a tabela de `CREDITS.md`.

**Se a licença for CC BY 4.0**, permite copiar, redistribuir e adaptar (incluindo recolorir, recortar e
juntar em atlas), também para uso comercial, desde que se indique o autor, o título, a ligação para a
licença e para a origem, que se indique que houve alterações e que não se acrescentem restrições que
impeçam outros de fazer o que a licença permite. Outras versões têm condições parecidas mas não iguais;
o `CREDITS.md` segue a versão confirmada. Isto não é aconselhamento jurídico.
