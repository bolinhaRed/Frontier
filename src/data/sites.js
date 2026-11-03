// Locais especiais (rev. 1.4). Explorar custa 2 Provisões (balance.exploreCost).
export const SITES = {
  ruins:     { name: 'Ruínas',            tile: 'ruins',     modes: ['A', 'B'], points: 2, reward: { choose: 2 } },
  cave:      { name: 'Caverna',           tile: 'cave',      modes: ['A', 'B'], points: 2, reward: { stone: 3 } },
  crystals:  { name: 'Cristais',          tile: 'crystals',  modes: ['A', 'B'], points: 4, reward: null },
  stones:    { name: 'Círculo de pedras', tile: 'stones',    modes: ['A', 'B'], points: 2, reward: { peekEvents: 3 } },
  graveyard: { name: 'Cemitério',         tile: 'graveyard', modes: ['B'],      points: 5, reward: { triggerEvent: true } },
};
