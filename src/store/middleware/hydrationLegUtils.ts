/** Splits queries into evenly-sized legs, each capped at `maxQueriesPerLeg`. */
export const splitQueriesIntoLegs = <T>(queries: T[], maxQueriesPerLeg: number): T[][] => {
  const total = queries.length;
  if (total === 0) return [];

  const numLegs = Math.ceil(total / maxQueriesPerLeg);
  const legs: T[][] = [];
  for (let i = 0; i < numLegs; i++) {
    const start = Math.floor((i * total) / numLegs);
    const end = Math.floor(((i + 1) * total) / numLegs);
    legs.push(queries.slice(start, end));
  }
  return legs;
};

export const takeFirstLegQueries = <T>(queries: T[], maxQueriesPerLeg: number): T[] =>
  splitQueriesIntoLegs(queries, maxQueriesPerLeg)[0] ?? [];

export const estimateLegCount = (queryCount: number, maxQueriesPerLeg: number): number =>
  Math.max(1, Math.ceil(queryCount / maxQueriesPerLeg));

export type HydrationLegProgress = {
  currentLeg: number;
  totalLegs: number;
};

export const getHydrationCpanelMessage = (
  webapp: string,
  remaining: number,
  leg?: HydrationLegProgress,
): string => {
  const rounds =
    leg && leg.totalLegs > 1
      ? ` (${leg.currentLeg}/${leg.totalLegs} rounds)`
      : '';
  return `hydrating ${webapp}... ${remaining} queries remaining${rounds}`;
};
