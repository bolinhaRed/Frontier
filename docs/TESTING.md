# Testes

## Três níveis

| Nível | Comando | Quando corre | Conteúdo | Tempo-alvo |
| --- | --- | --- | --- | --- |
| 1. Rápido | `npm test` | Sempre: ao gravar (`npm run test:watch`), em cada push (GitHub Actions) | Testes unitários, estrutura, assets, dependências; a partir da etapa 1, casos-limite e 3 partidas com seed fixa | < 5 s |
| 2. Intermédio | `npm run sim:check` | Só quando mudam mecânicas, custos, pontuação, IA ou equilíbrio | 100 partidas por configuração contra a baseline | ~1 min |
| 3. Completo | `npm run sim:full -- --confirm` | Só a pedido explícito | 2 000 a 5 000 partidas; actualiza baselines depois de aprovado | Minutos; nunca automático |

Os níveis 2 e 3 chegam na etapa 5. `npm run test:affected` corre só os testes que dependem dos
ficheiros alterados desde o último commit.

## Testes actuais (etapa 0)

- `tests/unit/hex.test.js` — coordenadas, vizinhos, anéis, conversão pixel ↔ hexágono.
- `tests/unit/rng.test.js` — mesma sequência do gerador original; estado serializável; JSON de ida e volta.
- `tests/deps.test.js` — regras de dependências entre módulos.
- `tests/assets.test.js` — inventário dos 241 PNG contra os ficheiros reais.
- `tests/structure.test.js` — ficheiros obrigatórios, manifest, referências do `index.html`, licenças.

## Limites dos testes de aceitação 5 a 17

São **alarmes de equilíbrio**, não condições de bloqueio. Só correm na simulação completa (etapa 8
ou a pedido); o nível intermédio usa os mesmos indicadores com tolerâncias largas, só para apanhar
erros grosseiros. Não impedem as etapas 0 a 7 nem uma versão para jogar.

Se um limite falhar, o relatório mostra o valor medido, o limite e a margem estatística, e há três
respostas possíveis, sempre com aprovação do Vasco: ajustar um valor provisório, aceitar o resultado
e alargar o limite, ou manter tudo porque as partidas reais dizem o contrário. As partidas reais mandam.

| Teste | Mede | Limite proposto |
| --- | --- | --- |
| 5 e 17 | Vitórias por lugar | 1/N ± 5 pontos percentuais |
| 6 e 16 | Baralho esgotado | < 2% (Modo A), < 5% (Modo B) |
| 7 | Uso da Expansão | 5% a 20% dos turnos |
| 8 | Limite de construções a travar | < 15% dos turnos |
| 9 | Peso das regiões com objectivos | < 60% (referência, não meta) |
| 10 | Estratégia de Contribuição | Não ganha mais do que a normal |
| 11 | Recursos perdidos pelo limite de 10 | < 1 por jogador e partida |
| 12 | Opções dos acontecimentos | Cada uma ≥ 15% |
| 13 | Bloqueios no Modo B | < 2% sem colocação; < 5% com excepção de biomas |
| 14 | Acontecimentos no Modo B a 2 | ≤ 5 por partida |
| 15 | Rio longo | 20% a 80% das partidas |

A meta de 50 partidas por segundo por núcleo é um objectivo de desempenho e não bloqueia nada.
