import {
  getEncodeDataPartFromUrl,
  getAlias,
  capitalizeFirstLetter,
  validatedCombination,
  cookIngredients,
  ADD_ROWS,
  REMOVE_ROWS,
  CookIngredientsProps,
  CookIngredientsResult,
  Tree,
  getEntity,
  pncApps,
} from "../../utils";
import { userApps, memberApps, adminsApps } from "../../constants";
import { useNavigate } from "react-router-dom";
import { iconsImgs, NavLinkBottom, NavLinkMiddle, NavLinkTop } from "../../library/sideBarMenus";

import React, { useMemo, useEffect } from "react";
import { navLinkMiddle } from "../../library/sideBarMenus";
import { SidebarState } from "../../store/slices/sidebarSlice";
import { getEntities } from "../../components/convolayouts/GreekProbin/Screen";
import { InitLoadingPayload } from "../../library/actions";

export interface LinkState {
  id: string | number;
  isActive: boolean;
  order: number;
  connections: string[];
  parent: string;
}

interface TabulateHandlerParams {
  reset: () => void;
  webapp: string;
  defaultTake: number;
  executables: Partial<SidebarState>;
  cpanelManager: (payload: InitLoadingPayload) => void;
}

export interface AppItem {
  isActive: boolean;
  app: string;
  image: string;
  title: string;
  id: string;
}

interface UseSidebarParams {
  reset: () => void;
  webapp: string;
  setWebApp: (webapp: string) => void;
  activeLinks: LinkState[];
  defaultTake: number;
  highlighter: (params: { id: number; isExpandable: boolean }) => void;
  isExpandableId: number;
  cpanelManager: (payload: InitLoadingPayload) => void;
  setActiveLinks: (updater: (prev: LinkState[]) => LinkState[]) => void;
  executables: SidebarState;
  setLookUp: () => void;
  action: (params: { title: string; prefix?: string; isFilter: boolean }) => void;
}

export const clickHandler = (state: LinkState[], selected: string | number) =>
  state.map((link) => {
    const isMatch = link.id === selected;
    if (isMatch) {
      return {
        ...link,
        isActive: !link.isActive,
      };
    } else return { ...link };
  });

export const clearHandler = (state: LinkState[]) => {
  return state.map((link) => ({
    ...link,
    isActive: false,
  }));
};

export const tabulateHandler = ({
  reset,
  webapp,
  defaultTake,
  executables,
  cpanelManager,
}: TabulateHandlerParams) => {
  const { content, parentData, prefix, contentIds, insertedRows, filter, handles } =
    executables;
  const params = [
    {
      selectedParent: parentData?.parent || '',
      selectedChild: content || '',
    },
    true,
    webapp,
  ] as const;
  const output = validatedCombination(...params);
  const { isValid, selectedParent, selectedChild } = output;
  if (isValid) {
    const ingredients: CookIngredientsProps = {
      prefix,
      defaultTake,
      search: undefined,
      entity: selectedChild,
      contentIds: contentIds?.map(Number),
      parentData: { ...parentData, parent: selectedParent, IDs: parentData?.IDs || [], curApp: parentData?.curApp || 0 },
    };
    const spread: CookIngredientsResult | undefined = cookIngredients(ingredients);
    if (spread) {
      ingredients["urlData"] = getEncodeDataPartFromUrl(spread.url);
      ingredients["search"] = spread.search;
    }
    if (filter === "Includes") {
      const payload = { ...ingredients, insertedRows, operation: REMOVE_ROWS, handles };
      setTimeout(() => cpanelManager(payload));
    } else {
      const payload = { ...ingredients, insertedRows, operation: ADD_ROWS, handles };
      setTimeout(() => cpanelManager(payload));
    }
    return spread;
  } else {
    console.log("invalid tabulation", output);
    reset();
  }
};

const apps = (webapp: string): AppItem[] =>
  Object.entries(userApps)
    .map(([key, app]) => ({
      isActive: webapp === (app as string).toLowerCase(),
      app: (app as string).toLowerCase(),
      image: iconsImgs.report,
      title: app as string,
      id: `member-${key}`,
    }))
    .filter((_, i) => i > 0);

const userapps = (webapp: string): AppItem[] =>
  Object.entries(memberApps)
    .map(([key, userapp]) => ({
      isActive: webapp === (userapp as string).toLowerCase(),
      app: (userapp as string).toLowerCase(),
      image: iconsImgs.report,
      title: userapp as string,
      id: `user-${key}`,
    }))
    .filter((_, i) => i > 0);

const adminapps = (webapp: string): AppItem[] =>
  Object.entries(adminsApps)
    .map(([key, adminapp]) => ({
      isActive: webapp === (adminapp as string).toLowerCase(),
      app: (adminapp as string).toLowerCase(),
      image: iconsImgs.report,
      title: adminapp as string,
      id: `admin-${key}`,
    }))
    .filter((_, i) => i > 0);

export default function useSidebar({
  reset,
  webapp,
  setWebApp,
  activeLinks,
  defaultTake,
  highlighter,
  isExpandableId,
  cpanelManager,
  setActiveLinks,
  executables,
  setLookUp,
  action,
}: UseSidebarParams) {
  const navigate = useNavigate();

  const unselector = (e: React.MouseEvent) => {
    setActiveLinks((prev) => clearHandler(prev));
    e.preventDefault();
    reset();
  };

  const lookUpToggler = (e: React.MouseEvent) => {
    e.preventDefault();
    setLookUp();
  };

  const topSelector = (e: React.MouseEvent, nlk: NavLinkTop) => {
    if (nlk.id == 2) highlighter({ id: 2, isExpandable: true });
    else if (nlk.id == 3) highlighter({ id: 3, isExpandable: false });
    e.preventDefault();
  };

  const middleSelector = (e: React.MouseEvent, nlk: NavLinkMiddle | undefined) => {
    setActiveLinks((prev) => clickHandler(prev, nlk?.id ?? 0));
    e.preventDefault();
  };

  const bottomSelector = (e: React.MouseEvent, nlk: NavLinkBottom) => {
    action({
      title: nlk.title,
      prefix: nlk.prefix,
      isFilter: nlk.prefix !== undefined,
    });
    e.preventDefault();
  };

  const tabulator = (e: React.MouseEvent) => {
    e.preventDefault();
    const spread = tabulateHandler({
      cpanelManager,
      defaultTake,
      executables,
      webapp,
      reset,
    });
    if (spread?.url) navigate(spread.url);
  };

  const setActiveWebapp = (e: React.MouseEvent, webapp: string) => {
    e.preventDefault();
    setWebApp(webapp);
  };

  // Move the side effect to useEffect
  useEffect(() => {
    const newLinks = getEntities(webapp)
      .map(({ label, connections }, index) => {
        const match = navLinkMiddle.find(({ name }) => name === label);
        if (match) {
          const { id, title } = match;
          return {
            id,
            order: index,
            parent: title,
            isActive: true,
            connections: connections.map((connection) =>
              capitalizeFirstLetter(getAlias(connection))
            ),
          };
        }
        return undefined;
      })
      .filter((o): o is NonNullable<typeof o> => o !== undefined);
    const topTobottomLinks = setTopToBottomLinks(webapp, newLinks);
    setActiveLinks(() => topTobottomLinks);
  }, [webapp, setActiveLinks]);

  const webapps = useMemo(() => {
    const _adminapps = adminapps(webapp);
    return _adminapps.findIndex(({ isActive }) => isActive) > -1
      ? [...apps(webapp), ...userapps(webapp), ..._adminapps]
      : [...apps(webapp), ...userapps(webapp)];
  }, [webapp]);

  return {
    webapps,
    tabulator,
    unselector,
    topSelector,
    activeLinks,
    executables,
    lookUpToggler,
    middleSelector,
    isExpandableId,
    bottomSelector,
    setWebApp: setActiveWebapp,
  };
}

const ROOT_ENTITY_NAME = "foundation";

const setTopToBottomLinks = (webapp: string, links: LinkState[]): LinkState[] => {
  // Only the pncApps ("tutorial", "course", "quiz") have a guaranteed
  // linear hierarchy that starts from "root" -> children. For all other
  // webapps, keep the original ordering.
  if (!pncApps.includes(webapp) || !links.length) return links;

  // Build a lookup of entityName -> LinkState using the parent title.
  // `parent` is a title/alias ("Root", "Steps", ...), so we map it back
  // to the underlying entity name used in Tree.entities via `getEntity`.
  const entityToLink = new Map<string, LinkState>();
  links.forEach((link) => {
    const entityName = getEntity(link.parent);
    if (entityName) {
      entityToLink.set(entityName.toLowerCase(), link);
    }
  });

  const ordered: LinkState[] = [];
  const visited = new Set<string>();

  // Follow the chain starting from the root entity ("foundation") and
  // walk through its `webapps[webapp]` connections, picking only those
  // entities that actually have corresponding links.
  let current = ROOT_ENTITY_NAME.toLowerCase();

  while (current && !visited.has(current)) {
    visited.add(current);

    const linkForCurrent = entityToLink.get(current);
    if (linkForCurrent) {
      ordered.push(linkForCurrent);
    }

    const webappsForEntity = Tree.getProperty(current, "webapps") as
      | Record<string, string[]>
      | undefined;
    const nextCandidates = (webappsForEntity?.[webapp] ?? []) as string[];

    // Find the first child in the chain that also has a link.
    const next = nextCandidates.find((child) => {
      const key = child.toLowerCase();
      return !visited.has(key) && entityToLink.has(key);
    });

    if (!next) break;
    current = next.toLowerCase();
  }

  // Append any remaining links whose entities are not on the main chain,
  // preserving their original relative order.
  const remaining = links.filter((link) => !ordered.includes(link));

  return [...ordered, ...remaining].map((link, index) => ({
    ...link,
    order: index,
  }));
};