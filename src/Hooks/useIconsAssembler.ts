import { useMemo } from "react";
import { getAlias, Tree as entities, capitalizeFirstLetter } from "../utils";

const bosses = new URL("../Images/Bosses.png", import.meta.url).href;
const filters = new URL("../Images/Filters.png", import.meta.url).href;
const sifters = new URL("../Images/Sifters.png", import.meta.url).href;
const minions = new URL("../Images/Minions.png", import.meta.url).href;
const foundation = new URL("../Images/foundation.png", import.meta.url).href;
const dashboards = new URL("../Images/Dashboards.png", import.meta.url).href;
const underbosses = new URL("../Images/UnderBosses.png", import.meta.url).href;
const instructions = new URL("../Images/Instructions.png", import.meta.url).href;
const lowersifters = new URL("../Images/LowerSifters.png", import.meta.url).href;
const highersifters = new URL("../Images/HigherSifters.png", import.meta.url).href;
const lowerunderbosses = new URL("../Images/LowerUnderBosses.png", import.meta.url).href;
const higherunderbosses = new URL("../Images/HigherUnderBosses.png", import.meta.url).href;

export type IconKey = keyof typeof Icons;

export const Icons = {
  Admins: bosses,
  Filters: filters,
  Sifters: sifters,
  Members: minions,
  Root: foundation,
  Steps: instructions,
  Sievers: lowersifters,
  Partitions: dashboards,
  Mediators: underbosses,
  Classifiers: highersifters,
  Managers: higherunderbosses,
  Overseers: lowerunderbosses,
} as const;

export const useIconsPicker = (memoizedObj: string[], reduce: boolean = false): Record<IconKey, string> => {
  const icons = useMemo(() => {
    const arr = memoizedObj
      .map((menuItem) => {
        const alias = getAlias(menuItem);
        return capitalizeFirstLetter(alias) as IconKey;
      })
      .map((icon) => ({ [icon]: Icons[icon] }));
    return reduce ? arr.reduce((p, c) => ({ ...p, ...c }), {}) : arr;
  }, [memoizedObj, reduce]);
  return icons as Record<IconKey, string>;
};

export default function useIconsAssembler(parent?: string): string[] {
  const menuItems = useMemo(() => {
    const tree = parent ? parent : "minions";
    const descendents: Record<string, string[]> = entities.getProperty(tree, "ordinals") || {};
    const titles = Object.values(descendents).flat();
    return [...new Set(titles)];
  }, [parent]);
  return menuItems as string[];
} 