// Valores provisórios (secção Decisões provisórias), a fechar na etapa 8.
export const BALANCE = {
  rounds: { 2: 12, 3: 10, 4: 9 },
  startResources: { wood: 2, stone: 1, food: 2 },
  seatBonusFood: 1,
  handSize: 3,
  marketSize: 3,
  marketCost: { food: 1 },
  setupTilesPerPlayer: 2,
  siteDistance: 2,
  initialSites: 3,
  // etapa 2
  expansionCost: { wood: 2, food: 2 },
  exploreCost: { food: 2 },
  tradeRate: 3, caravanTradeRate: 2,
  buildsPerTurn: 2,
  resourceCap: 10,
  milestoneMinSize: 3,                       // patamares 3, 5, 7, 9 e depois a cada 2
  milestoneValues: [2, 3, 4, 5],             // 5 daí em diante
  contributionMinSize: 3,
  publicObjectives: 3, publicPoints: [5, 2], privatePoints: 4,
  hardLand: { 2: 2, 12: 2, 3: 1, 11: 1 },
  leftoverPerPoint: 3,
  finalRegionMinSize: 3,
};
