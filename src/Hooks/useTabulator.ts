import { useMemo } from "react";
import { Tree as entities } from "../utils";
import useDbQuery, { UseQueryBuilderProps } from "./useQueryBuilder";
import useMediaQuery from "./useQueryMedia";
import useScreensBuilder, { Constraints as ConstraintsType, ScreenBuilderTypes } from "./useScreensBuilder";
import useMenuBuilder, { IconKey, useIconsPicker } from "./useIconsAssembler";

const cons = "constraints";

// Type definitions
export interface Column {
  [key: string]: string;
}

export interface DesktopTable {
  [key: string]: Column;
}

interface Constraints {
  max: number;
  CSS: ()=> string;
}

interface ScreenSizes {
  isTablet: boolean;
  isSmall: boolean;
}

interface TabulatorReturn extends ScreenSizes {
  screenIndex: number;
  Constraints: Constraints;
  desktopTable: DesktopTable;
  variables: [Record<string, ScreenBuilderTypes>[], number, (index: number) => void];
  icons: Record<IconKey, string>;
  target: string;
}

type GetColumnsFunction = (target: string, condition?: boolean) => Column[];



export default function useTabulator(
  hasExtraArg: boolean,
  getColumns: GetColumnsFunction,
  operation: string,
  table: string,
  props: UseQueryBuilderProps
): TabulatorReturn {
  const target = useDbQuery(props, operation);
  const pre = entities.getProperty(target, "prefixLen");
  const CSS = entities.getProperty(target, "CSS") ?? (() => "");
  const { screen, isTablet, isSmall, ...screens } = useMediaQuery();
  const cns: ConstraintsType = useMemo(() => entities.getProperty(target, cons) ?? { At1920: 0, At1536: 0, At1440: 0, At992: 0 }, [target]);
  const icons = useIconsPicker(useMenuBuilder(target), true);
  const { is14Inch, is15Inch, isDeskTop } = screens;

  const Constraints: Constraints = {
    max: isDeskTop
      ? cns.At1920
      : is15Inch
        ? cns.At1536
        : is14Inch
          ? cns.At1440
          : isSmall
            ? cns.At992
            : isTablet
              ? 2
              : 1,
    CSS,
  };

  const watched: boolean | undefined = hasExtraArg ? isSmall : undefined;
  const prefix: number = table === "anonymous" ? pre?.[table] ?? 0 : isSmall ? pre?.[table] ?? 0 : 1;

  const { tb, desktopTable } = useMemo(() => {
    const isWatched: boolean = watched !== undefined;
    const tb: Column[] = isWatched ? getColumns(target, !watched) : getColumns(target);
    const desktopTable: DesktopTable = [...tb.map((col) => Object.keys(col)[0])].reduce(
      (cur, key, i, keys) => ({ ...cur, [key]: tb[i][keys[i]] }),
      {}
    );
    return { tb, desktopTable };
  }, [target, watched, getColumns]);

  const variables = useScreensBuilder(screen, cns, tb, prefix);
  const scrs: ScreenSizes = { isTablet, isSmall };

  return {
    screenIndex: screen,
    desktopTable,
    Constraints,
    variables,
    ...scrs,
    target,
    icons,
  };
}
