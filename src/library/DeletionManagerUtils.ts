import { deletedTimestamp } from "../utils";
import { RootState } from "../store";
import { DataRow, Metadata } from "../components/Core/types";
import { getStashCellRows } from "../store/slices/stashSlice";
import {
  isUnjoinedItemsShortcutStashBase,
  isJoinedItemsShortcutStashBase,
  isEscrowedItemsShortcutStashBase,
  parseHierarchyStampedStashKey,
} from "./ShortcutsUtils";

const TUTORIAL_APP_INDEX = 1;
const COURSE_APP_INDEX = 2;
const QUIZ_APP_INDEX = 3;

const isPncHierarchyShortcutStashTimestamp =
  (isBase: (base: string) => boolean) =>
  (timestamp: string, state: RootState): boolean => {
    const parsed = parseHierarchyStampedStashKey(timestamp);
    if (!parsed) return false;
    if (parsed.webappIndex !== state.session.curApp) return false;
    return isBase(parsed.base);
  };

const isPncHierarchyShortcutStashTimestampForWebapp =
  (webappIndex: number, isBase: (base: string) => boolean) =>
  (timestamp: string, _state: RootState): boolean => {
    const parsed = parseHierarchyStampedStashKey(timestamp);
    if (!parsed) return false;
    if (parsed.webappIndex !== webappIndex) return false;
    return isBase(parsed.base);
  };

/** PNC unjoin stash for finalizeDelete when `curApp` differs from the stash owner (meta-queue save). */
export const isPncUnjoinShortcutStashTimestampAnyWebapp = (
  timestamp: string,
  _state: RootState,
): boolean => {
  const parsed = parseHierarchyStampedStashKey(timestamp);
  return parsed !== null && isUnjoinedItemsShortcutStashBase(parsed.base);
};

/** PNC join stash for finalizeAdd when `curApp` differs from the stash owner (meta-queue save). */
export const isPncJoinShortcutStashTimestampAnyWebapp = (
  timestamp: string,
  _state: RootState,
): boolean => {
  const parsed = parseHierarchyStampedStashKey(timestamp);
  return parsed !== null && isJoinedItemsShortcutStashBase(parsed.base);
};

export const isPncUnjoinShortcutStashTimestamp = isPncHierarchyShortcutStashTimestamp(
  isUnjoinedItemsShortcutStashBase
);

export const isPncJoinShortcutStashTimestamp = isPncHierarchyShortcutStashTimestamp(
  isJoinedItemsShortcutStashBase
);

export const isPncEscrowShortcutStashTimestamp = isPncHierarchyShortcutStashTimestamp(
  isEscrowedItemsShortcutStashBase
);

const mergeShortcutStashRowsForApproute = (
  state: RootState,
  approute: string,
  isTimestamp: (timestamp: string, state: RootState) => boolean
): DataRow[] => {
  const routeStash = state.stash[approute];
  if (!routeStash) return [];
  const merged: DataRow[] = [];
  for (const [ts, cell] of Object.entries(routeStash)) {
    if (!isTimestamp(ts, state)) continue;
    merged.push(...getStashCellRows(cell));
  }
  return Object.values(
    merged.reduce<Record<string | number, DataRow>>((acc, cur) => ({ ...acc, [cur.id]: cur }), {})
  );
};

/** Merges unjoin stash rows for `approute` stamped for a specific PNC webapp index. */
const mergeDeletedStashRowsForApproute = (
  state: RootState,
  approute: string,
  webappIndex: number,
): DataRow[] =>
  mergeShortcutStashRowsForApproute(
    state,
    approute,
    isPncHierarchyShortcutStashTimestampForWebapp(webappIndex, isUnjoinedItemsShortcutStashBase),
  );

/** Merges join stash rows for `approute` stamped for a specific PNC webapp index. */
const mergeJoinedStashRowsForApproute = (
  state: RootState,
  approute: string,
  webappIndex: number,
): DataRow[] =>
  mergeShortcutStashRowsForApproute(
    state,
    approute,
    isPncHierarchyShortcutStashTimestampForWebapp(webappIndex, isJoinedItemsShortcutStashBase),
  );

/** Join stash for the active screen (`session.curApp`) — comms / shortcut flows. */
const mergeJoinedStashRowsForCurApproute = (state: RootState, approute: string): DataRow[] =>
  mergeJoinedStashRowsForApproute(state, approute, state.session.curApp);

type StashRow = { id: number | string; metadata?: Metadata };

export interface DeletedItem {
  id: number | string;
  bannerIds?: number[];
  metadata?: Metadata;
}

export interface DeleteResponse {
  deleted: Record<string, DeletedItem[]>;
  mutateRole: string;
  curMailer: number;
  curToken: string;
}

export interface AddedItem {
  id: number;
  bannerIds: number[];
}

export interface AddResponse {
  added: Record<string, AddedItem[]>;
  mutateRole: string;
  curMailer: number;
  curToken: string;
}

type BannerPick = { id: number | string; bannerIds?: number[] };

const filterPositiveIds = <T extends StashRow>(items: T[]): T[] =>
  items.filter(({ id }) => id as number > 0);

const sessionMutateFreight = (state: RootState) => {
  const { curToken, mutateRole, curMailer } = state.session;
  return {
    mutateRole: mutateRole ?? "",
    curMailer,
    curToken: curToken ?? "",
  };
};

const buildDeleteResponse = (
  routes: Record<string, DeletedItem[]>,
  state: RootState
): DeleteResponse => ({
  deleted: routes,
  ...sessionMutateFreight(state),
});

const buildAddResponse = (routes: Record<string, AddedItem[]>, state: RootState): AddResponse => ({
  added: routes,
  ...sessionMutateFreight(state),
});

const isRoutesEmpty = (routes: Record<string, unknown[]>) =>
  Object.values(routes).every((arr) => !arr || arr.length === 0);

const normalizeBannerIds = (ids: unknown): number[] => {
  if (ids == null) return [];
  const list = Array.isArray(ids) ? ids : [ids];
  return [
    ...new Set(
      list
        .map((b) => (typeof b === "number" ? b : Number(b)))
        .filter((b): b is number => typeof b === "number" && !Number.isNaN(b) && b !== 0)
    ),
  ];
};

const addDeleteCompositeKey = (bannerId: number, id: number | string): string =>
  `${bannerId}&&${id}`;

const deletedCompositeKeysForRoute = (items: DeletedItem[]): Set<string> => {
  const keys = new Set<string>();
  for (const { id, bannerIds } of items) {
    const normalized = normalizeBannerIds(bannerIds);
    if (normalized.length === 0) {
      keys.add(addDeleteCompositeKey(0, id));
    } else {
      for (const bannerId of normalized) {
        keys.add(addDeleteCompositeKey(bannerId, id));
      }
    }
  }
  return keys;
};

/** Drop added entries whose bannerId&&id pair is already slated for deletion on the same route. */
export const excludeAddsCollidingWithDeletes = (
  added: Record<string, AddedItem[]>,
  deleted: Record<string, DeletedItem[]> = {}
): Record<string, AddedItem[]> => {
  const result: Record<string, AddedItem[]> = {};
  for (const [route, items] of Object.entries(added)) {
    const routeDeleted = deleted[route];
    if (!routeDeleted?.length) {
      result[route] = items;
      continue;
    }
    const deletedKeys = deletedCompositeKeysForRoute(routeDeleted);
    const filtered = items.flatMap((item): AddedItem[] => {
      const bannerIds = normalizeBannerIds(item.bannerIds);
      if (bannerIds.length === 0) {
        return deletedKeys.has(addDeleteCompositeKey(0, item.id)) ? [] : [item];
      }
      const remaining = bannerIds.filter(
        (bannerId) => !deletedKeys.has(addDeleteCompositeKey(bannerId, item.id))
      );
      if (remaining.length === 0) return [];
      if (remaining.length === bannerIds.length) return [item];
      return [{ ...item, bannerIds: remaining }];
    });
    if (filtered.length > 0) result[route] = filtered;
  }
  return result;
};

const metadataToBannerPred =
  (parentId: string) =>
  ({ metadata, id }: DeletedItem): BannerPick => ({ id, bannerIds: metadata?.[parentId] });

const metadataToAddedBannerPred =
  (parentId: string) =>
  (row: StashRow): AddedItem => {
    const fromMetadata = normalizeBannerIds(row.metadata?.[parentId as keyof Metadata]);
    if (fromMetadata.length > 0) {
      return { id: row.id as number, bannerIds: [fromMetadata[0]] };
    }
    const rowBannerId = (row as DataRow & { bannerId?: number }).bannerId;
    const fallback = normalizeBannerIds(rowBannerId);
    return {
      id: row.id as number,
      bannerIds: fallback.length > 0 ? [fallback[0]] : [],
    };
  };

const toAddedIdOnly = ({ id }: StashRow): AddedItem => ({
  id: id as number,
  bannerIds: [],
});

const mapDeletedBannerRoute = (
  routes: Record<string, DeletedItem[]>,
  key: string,
  rows: StashRow[],
  parentId: string
) => {
  if (rows.length > 0) {
    routes[key] = rows
      .map(metadataToBannerPred(parentId))
      .map(({ id, bannerIds }: BannerPick) => ({ id, bannerIds }));
  }
};

const mapAddedBannerRoute = (
  routes: Record<string, AddedItem[]>,
  key: string,
  rows: StashRow[],
  parentId: string
) => {
  if (rows.length > 0) {
    routes[key] = rows.map(metadataToAddedBannerPred(parentId));
  }
};

export const getDeletesFromOutgoingStash = (state: RootState): DeleteResponse | {} => {
  const routes: Record<string, DeletedItem[]> = {};
  const stash = state.stash;
  const deletedbf = getStashCellRows(stash.bossesfilters?.[deletedTimestamp]);
  const deletedbs = getStashCellRows(stash.bossessifters?.[deletedTimestamp]);
  const deletedbd = getStashCellRows(stash.bossesdashboards?.[deletedTimestamp]);
  const deletedbi = getStashCellRows(stash.bossesinstructions?.[deletedTimestamp]);
  const deletedud = getStashCellRows(stash.underbossesdashboards?.[deletedTimestamp]);
  const deletedui = getStashCellRows(stash.underbossesinstructions?.[deletedTimestamp]);
  const deleteduf = getStashCellRows(stash.underbossesfilters?.[deletedTimestamp]);
  const deletedus = getStashCellRows(stash.underbossessifters?.[deletedTimestamp]);
  const deletedmf = getStashCellRows(stash.minionsfilters?.[deletedTimestamp]);
  const deletedms = getStashCellRows(stash.minionssifters?.[deletedTimestamp]);
  const deletedmd = getStashCellRows(stash.minionsdashboards?.[deletedTimestamp]);
  const deletedmi = getStashCellRows(stash.minionsinstructions?.[deletedTimestamp]);
  const rdeletedbd = filterPositiveIds(deletedbd);
  const rdeletedbi = filterPositiveIds(deletedbi);
  const rdeletedbs = filterPositiveIds(deletedbs);
  const rdeletedbf = filterPositiveIds(deletedbf);
  const rdeleteduf = filterPositiveIds(deleteduf);
  const rdeletedud = filterPositiveIds(deletedud);
  const rdeletedui = filterPositiveIds(deletedui);
  const rdeletedus = filterPositiveIds(deletedus);
  const rdeletedmf = filterPositiveIds(deletedmf);
  const rdeletedms = filterPositiveIds(deletedms);
  const rdeletedmd = filterPositiveIds(deletedmd);
  const rdeletedmi = filterPositiveIds(deletedmi);
  if (isRoutesEmpty({
    rdeletedbi, rdeletedbd, rdeletedbs, rdeletedbf, rdeleteduf, rdeletedui, rdeletedud,
    rdeletedus, rdeletedmf, rdeletedms, rdeletedmd, rdeletedmi,
  })) return {};
  mapDeletedBannerRoute(routes, "underbossesdashboards", rdeletedud, "underbossId");
  mapDeletedBannerRoute(routes, "minionsdashboards", rdeletedmd, "minionId");
  mapDeletedBannerRoute(routes, "bossesdashboards", rdeletedbd, "bossId");
  mapDeletedBannerRoute(routes, "bossesfilters", rdeletedbf, "bossId");
  mapDeletedBannerRoute(routes, "bossessifters", rdeletedbs, "bossId");
  mapDeletedBannerRoute(routes, "minionsfilters", rdeletedmf, "minionId");
  mapDeletedBannerRoute(routes, "minionssifters", rdeletedms, "minionId");
  mapDeletedBannerRoute(routes, "bossesinstructions", rdeletedbi, "bossId");
  mapDeletedBannerRoute(routes, "minionsinstructions", rdeletedmi, "minionId");
  mapDeletedBannerRoute(routes, "underbossesfilters", rdeleteduf, "underbossId");
  mapDeletedBannerRoute(routes, "underbossessifters", rdeletedus, "underbossId");
  mapDeletedBannerRoute(routes, "underbossesinstructions", rdeletedui, "underbossId");
  return buildDeleteResponse(routes, state);
};

export const getDeletesFromIncomingStash = (state: RootState): DeleteResponse | {} => {
  const routes: Record<string, DeletedItem[]> = {};
  const stash = state.stash;
  const deletedff = getStashCellRows(stash.foundationfilters?.[deletedTimestamp]);
  const deletedfs = getStashCellRows(stash.foundationsifters?.[deletedTimestamp]);
  const deletedfd = getStashCellRows(stash.foundationdashboards?.[deletedTimestamp]);
  const deletedfi = getStashCellRows(stash.foundationinstructions?.[deletedTimestamp]);
  const rdeletedfi = filterPositiveIds(deletedfi);
  const rdeletedfs = filterPositiveIds(deletedfs);
  const rdeletedff = filterPositiveIds(deletedff);
  const rdeletedfd = filterPositiveIds(deletedfd);
  if (isRoutesEmpty({ rdeletedfi, rdeletedfd, rdeletedfs, rdeletedff })) return {};
  if (rdeletedff.length > 0) routes["foundationfilters"] = deletedff.map(({ id }: DeletedItem) => ({ id }));
  if (rdeletedfs.length > 0) routes["foundationsifters"] = deletedfs.map(({ id }: DeletedItem) => ({ id }));
  if (rdeletedfd.length > 0) routes["foundationdashboards"] = deletedfd.map(({ id }: DeletedItem) => ({ id }));
  if (rdeletedfi.length > 0) routes["foundationinstructions"] = deletedfi.map(({ id }: DeletedItem) => ({ id }));
  return buildDeleteResponse(routes, state);
};

export const getDeletesFromTutorsStash = (state: RootState): DeleteResponse | {} => {
  const routes: Record<string, DeletedItem[]> = {};
  const stash = state.stash;
  const deletedb = getStashCellRows(stash.foundationbosses?.[deletedTimestamp]);
  const deletedm = getStashCellRows(stash.foundationminions?.[deletedTimestamp]);
  const deletedu = getStashCellRows(stash.foundationunderbosses?.[deletedTimestamp]);
  const rdeletedu = filterPositiveIds(deletedu);
  const rdeletedm = filterPositiveIds(deletedm);
  const rdeletedb = filterPositiveIds(deletedb);
  if (isRoutesEmpty({ rdeletedu, rdeletedm, rdeletedb })) return {};
  if (rdeletedb.length > 0) routes["foundationbosses"] = rdeletedb.map(({ id }: DeletedItem) => ({ id }));
  if (rdeletedm.length > 0) routes["foundationminions"] = rdeletedm.map(({ id }: DeletedItem) => ({ id }));
  if (rdeletedu.length > 0) routes["foundationunderbosses"] = rdeletedu.map(({ id }: DeletedItem) => ({ id }));
  return buildDeleteResponse(routes, state);
};

export const getDeletesFromQuizStash = (state: RootState): DeleteResponse | {} => {
  const routes: Record<string, DeletedItem[]> = {};
  const deletedfd = mergeDeletedStashRowsForApproute(state, "foundationdashboards", QUIZ_APP_INDEX);
  const deleteddf = mergeDeletedStashRowsForApproute(state, "dashboardsfilters", QUIZ_APP_INDEX);
  const deletedds = mergeDeletedStashRowsForApproute(state, "dashboardssifters", QUIZ_APP_INDEX);
  const deletedsf = mergeDeletedStashRowsForApproute(state, "siftersfilters", QUIZ_APP_INDEX);
  const deletedsi = mergeDeletedStashRowsForApproute(state, "siftersinstructions", QUIZ_APP_INDEX);
  const deletedfi = mergeDeletedStashRowsForApproute(state, "filtersinstructions", QUIZ_APP_INDEX);
  const rdeleteddf = filterPositiveIds(deleteddf);
  const rdeletedfd = filterPositiveIds(deletedfd);
  const rdeletedds = filterPositiveIds(deletedds);
  const rdeletedsf = filterPositiveIds(deletedsf);
  const rdeletedsi = filterPositiveIds(deletedsi);
  const rdeletedfi = filterPositiveIds(deletedfi);
  if (isRoutesEmpty({
    rdeletedfd, rdeleteddf, rdeletedds, rdeletedsf, rdeletedsi, rdeletedfi,
  })) return {};
  mapDeletedBannerRoute(routes, "dashboardsfilters", rdeleteddf, "dashboardId");
  if (rdeletedfd.length > 0) routes["foundationdashboards"] = rdeletedfd.map(({ id }: DeletedItem) => ({ id }));
  mapDeletedBannerRoute(routes, "dashboardssifters", rdeletedds, "dashboardId");
  mapDeletedBannerRoute(routes, "siftersfilters", rdeletedsf, "sifterId");
  mapDeletedBannerRoute(routes, "siftersinstructions", rdeletedsi, "sifterId");
  mapDeletedBannerRoute(routes, "filtersinstructions", rdeletedfi, "filterId");
  return buildDeleteResponse(routes, state);
};

export const getDeletesFromTutorialStash = (state: RootState): DeleteResponse | {} => {
  const routes: Record<string, DeletedItem[]> = {};
  const deletedff = mergeDeletedStashRowsForApproute(state, "foundationfilters", TUTORIAL_APP_INDEX);
  const deletedfi = mergeDeletedStashRowsForApproute(state, "filtersinstructions", TUTORIAL_APP_INDEX);
  const rdeletedff = filterPositiveIds(deletedff);
  const rdeletedfi = filterPositiveIds(deletedfi);
  if (isRoutesEmpty({ rdeletedff, rdeletedfi })) return {};
  if (rdeletedff.length > 0) routes["foundationfilters"] = rdeletedff.map(({ id }: DeletedItem) => ({ id }));
  mapDeletedBannerRoute(routes, "filtersinstructions", rdeletedfi, "filterId");
  return buildDeleteResponse(routes, state);
};

export const getDeletesFromCourseStash = (state: RootState): DeleteResponse | {} => {
  const routes: Record<string, DeletedItem[]> = {};
  const deletedsf = mergeDeletedStashRowsForApproute(state, "siftersfilters", COURSE_APP_INDEX);
  const deletedfi = mergeDeletedStashRowsForApproute(state, "filtersinstructions", COURSE_APP_INDEX);
  const deletedfs = mergeDeletedStashRowsForApproute(state, "foundationsifters", COURSE_APP_INDEX);
  const deletedsi = mergeDeletedStashRowsForApproute(state, "siftersinstructions", COURSE_APP_INDEX);
  const rdeletedsf = filterPositiveIds(deletedsf);
  const rdeletedfi = filterPositiveIds(deletedfi);
  const rdeletedfs = filterPositiveIds(deletedfs);
  const rdeletedsi = filterPositiveIds(deletedsi);
  if (isRoutesEmpty({ rdeletedsf, rdeletedfi, rdeletedfs, rdeletedsi })) return {};
  if (rdeletedfs.length > 0) routes["foundationsifters"] = rdeletedfs.map(({ id }: DeletedItem) => ({ id }));
  mapDeletedBannerRoute(routes, "siftersfilters", rdeletedsf, "sifterId");
  mapDeletedBannerRoute(routes, "filtersinstructions", rdeletedfi, "filterId");
  mapDeletedBannerRoute(routes, "siftersinstructions", rdeletedsi, "sifterId");
  return buildDeleteResponse(routes, state);
};

export const getAddsFromOutgoingStash = (state: RootState): AddResponse | {} => {
  const routes: Record<string, AddedItem[]> = {};
  const addedbf = mergeJoinedStashRowsForCurApproute(state, "bossesfilters");
  const addedbs = mergeJoinedStashRowsForCurApproute(state, "bossessifters");
  const addedbd = mergeJoinedStashRowsForCurApproute(state, "bossesdashboards");
  const addedbi = mergeJoinedStashRowsForCurApproute(state, "bossesinstructions");
  const addedud = mergeJoinedStashRowsForCurApproute(state, "underbossesdashboards");
  const addedui = mergeJoinedStashRowsForCurApproute(state, "underbossesinstructions");
  const addeduf = mergeJoinedStashRowsForCurApproute(state, "underbossesfilters");
  const addedus = mergeJoinedStashRowsForCurApproute(state, "underbossessifters");
  const addedmf = mergeJoinedStashRowsForCurApproute(state, "minionsfilters");
  const addedms = mergeJoinedStashRowsForCurApproute(state, "minionssifters");
  const addedmd = mergeJoinedStashRowsForCurApproute(state, "minionsdashboards");
  const addedmi = mergeJoinedStashRowsForCurApproute(state, "minionsinstructions");
  const raddedbd = filterPositiveIds(addedbd);
  const raddedbi = filterPositiveIds(addedbi);
  const raddedbs = filterPositiveIds(addedbs);
  const raddedbf = filterPositiveIds(addedbf);
  const raddeduf = filterPositiveIds(addeduf);
  const raddedud = filterPositiveIds(addedud);
  const raddedui = filterPositiveIds(addedui);
  const raddedus = filterPositiveIds(addedus);
  const raddedmf = filterPositiveIds(addedmf);
  const raddedms = filterPositiveIds(addedms);
  const raddedmd = filterPositiveIds(addedmd);
  const raddedmi = filterPositiveIds(addedmi);
  if (isRoutesEmpty({
    raddedbi, raddedbd, raddedbs, raddedbf, raddeduf, raddedui, raddedud,
    raddedus, raddedmf, raddedms, raddedmd, raddedmi,
  })) return {};
  mapAddedBannerRoute(routes, "underbossesdashboards", raddedud, "underbossId");
  mapAddedBannerRoute(routes, "minionsdashboards", raddedmd, "minionId");
  mapAddedBannerRoute(routes, "bossesdashboards", raddedbd, "bossId");
  mapAddedBannerRoute(routes, "bossesfilters", raddedbf, "bossId");
  mapAddedBannerRoute(routes, "bossessifters", raddedbs, "bossId");
  mapAddedBannerRoute(routes, "minionsfilters", raddedmf, "minionId");
  mapAddedBannerRoute(routes, "minionssifters", raddedms, "minionId");
  mapAddedBannerRoute(routes, "bossesinstructions", raddedbi, "bossId");
  mapAddedBannerRoute(routes, "minionsinstructions", raddedmi, "minionId");
  mapAddedBannerRoute(routes, "underbossesfilters", raddeduf, "underbossId");
  mapAddedBannerRoute(routes, "underbossessifters", raddedus, "underbossId");
  mapAddedBannerRoute(routes, "underbossesinstructions", raddedui, "underbossId");
  return buildAddResponse(routes, state);
};

export const getAddsFromIncomingStash = (state: RootState): AddResponse | {} => {
  const routes: Record<string, AddedItem[]> = {};
  const addedff = mergeJoinedStashRowsForCurApproute(state, "foundationfilters");
  const addedfs = mergeJoinedStashRowsForCurApproute(state, "foundationsifters");
  const addedfd = mergeJoinedStashRowsForCurApproute(state, "foundationdashboards");
  const addedfi = mergeJoinedStashRowsForCurApproute(state, "foundationinstructions");
  const raddedfi = filterPositiveIds(addedfi);
  const raddedfs = filterPositiveIds(addedfs);
  const raddedff = filterPositiveIds(addedff);
  const raddedfd = filterPositiveIds(addedfd);
  if (isRoutesEmpty({ raddedfi, raddedfd, raddedfs, raddedff })) return {};
  if (raddedff.length > 0) routes["foundationfilters"] = raddedff.map(toAddedIdOnly);
  if (raddedfs.length > 0) routes["foundationsifters"] = raddedfs.map(toAddedIdOnly);
  if (raddedfd.length > 0) routes["foundationdashboards"] = raddedfd.map(toAddedIdOnly);
  if (raddedfi.length > 0) routes["foundationinstructions"] = raddedfi.map(toAddedIdOnly);
  return buildAddResponse(routes, state);
};

export const getAddsFromTutorsStash = (state: RootState): AddResponse | {} => {
  const routes: Record<string, AddedItem[]> = {};
  const addedb = mergeJoinedStashRowsForCurApproute(state, "foundationbosses");
  const addedm = mergeJoinedStashRowsForCurApproute(state, "foundationminions");
  const addedu = mergeJoinedStashRowsForCurApproute(state, "foundationunderbosses");
  const raddedu = filterPositiveIds(addedu);
  const raddedm = filterPositiveIds(addedm);
  const raddedb = filterPositiveIds(addedb);
  if (isRoutesEmpty({ raddedu, raddedm, raddedb })) return {};
  if (raddedb.length > 0) routes["foundationbosses"] = raddedb.map(toAddedIdOnly);
  if (raddedm.length > 0) routes["foundationminions"] = raddedm.map(toAddedIdOnly);
  if (raddedu.length > 0) routes["foundationunderbosses"] = raddedu.map(toAddedIdOnly);
  return buildAddResponse(routes, state);
};

export const getAddsFromQuizStash = (state: RootState): AddResponse | {} => {
  const routes: Record<string, AddedItem[]> = {};
  const addedfd = mergeJoinedStashRowsForApproute(state, "foundationdashboards", QUIZ_APP_INDEX);
  const addeddf = mergeJoinedStashRowsForApproute(state, "dashboardsfilters", QUIZ_APP_INDEX);
  const addedds = mergeJoinedStashRowsForApproute(state, "dashboardssifters", QUIZ_APP_INDEX);
  const addedsf = mergeJoinedStashRowsForApproute(state, "siftersfilters", QUIZ_APP_INDEX);
  const addedsi = mergeJoinedStashRowsForApproute(state, "siftersinstructions", QUIZ_APP_INDEX);
  const addedfi = mergeJoinedStashRowsForApproute(state, "filtersinstructions", QUIZ_APP_INDEX);
  const raddeddf = filterPositiveIds(addeddf);
  const raddedfd = filterPositiveIds(addedfd);
  const raddedds = filterPositiveIds(addedds);
  const raddedsf = filterPositiveIds(addedsf);
  const raddedsi = filterPositiveIds(addedsi);
  const raddedfi = filterPositiveIds(addedfi);
  if (isRoutesEmpty({
    raddedfd, raddeddf, raddedds, raddedsf, raddedsi, raddedfi,
  })) return {};
  mapAddedBannerRoute(routes, "dashboardsfilters", raddeddf, "dashboardId");
  if (raddedfd.length > 0) routes["foundationdashboards"] = raddedfd.map(toAddedIdOnly);
  mapAddedBannerRoute(routes, "dashboardssifters", raddedds, "dashboardId");
  mapAddedBannerRoute(routes, "siftersfilters", raddedsf, "sifterId");
  mapAddedBannerRoute(routes, "siftersinstructions", raddedsi, "sifterId");
  mapAddedBannerRoute(routes, "filtersinstructions", raddedfi, "filterId");
  return buildAddResponse(routes, state);
};

export const getAddsFromTutorialStash = (state: RootState): AddResponse | {} => {
  const routes: Record<string, AddedItem[]> = {};
  const addedff = mergeJoinedStashRowsForApproute(state, "foundationfilters", TUTORIAL_APP_INDEX);
  const addedfi = mergeJoinedStashRowsForApproute(state, "filtersinstructions", TUTORIAL_APP_INDEX);
  const raddedff = filterPositiveIds(addedff);
  const raddedfi = filterPositiveIds(addedfi);
  if (isRoutesEmpty({ raddedff, raddedfi })) return {};
  if (raddedff.length > 0) routes["foundationfilters"] = raddedff.map(toAddedIdOnly);
  mapAddedBannerRoute(routes, "filtersinstructions", raddedfi, "filterId");
  return buildAddResponse(routes, state);
};

export const getAddsFromCourseStash = (state: RootState): AddResponse | {} => {
  const routes: Record<string, AddedItem[]> = {};
  const addedsf = mergeJoinedStashRowsForApproute(state, "siftersfilters", COURSE_APP_INDEX);
  const addedfi = mergeJoinedStashRowsForApproute(state, "filtersinstructions", COURSE_APP_INDEX);
  const addedfs = mergeJoinedStashRowsForApproute(state, "foundationsifters", COURSE_APP_INDEX);
  const addedsi = mergeJoinedStashRowsForApproute(state, "siftersinstructions", COURSE_APP_INDEX);
  const raddedsf = filterPositiveIds(addedsf);
  const raddedfi = filterPositiveIds(addedfi);
  const raddedfs = filterPositiveIds(addedfs);
  const raddedsi = filterPositiveIds(addedsi);
  if (isRoutesEmpty({ raddedsf, raddedfi, raddedfs, raddedsi })) return {};
  if (raddedfs.length > 0) routes["foundationsifters"] = raddedfs.map(toAddedIdOnly);
  mapAddedBannerRoute(routes, "siftersfilters", raddedsf, "sifterId");
  mapAddedBannerRoute(routes, "filtersinstructions", raddedfi, "filterId");
  mapAddedBannerRoute(routes, "siftersinstructions", raddedsi, "sifterId");
  return buildAddResponse(routes, state);
};

export const SAVE_ENTITY_TITLE_MAX_LENGTH = 50;

export const truncateSaveEntityTitle = (title: string): string =>
  title.length <= SAVE_ENTITY_TITLE_MAX_LENGTH
    ? title
    : title.slice(0, SAVE_ENTITY_TITLE_MAX_LENGTH);

export const withTruncatedSaveTitle = <T extends { title: string }>(entity: T): T => {
  const title = truncateSaveEntityTitle(entity.title);
  return title === entity.title ? entity : { ...entity, title };
};

export const withTruncatedSaveTitles = <T extends { title: string }>(entities: T[]): T[] =>
  entities.map(withTruncatedSaveTitle);
