import { Buffer } from 'buffer';
import {
  BaseEntity, MenuItem,
  WebApps, Constraints,
  DataRow,
  MockedDataReturn,
  BaseFormattedData,
  Metadata,
  BaseForm,
  InstructionForm,
  UserForm,
} from './components/Core/types';
import { ParentData } from './store/slices/viewSlice';
import { showInfos, tabluarPrefixes, userApps, memberApps, adminsApps } from './constants';
import { EntityTypeMap } from './store/slices/rowSlice';
import { UserMockInput, BannerInput, PennantInput, StepInput, RootInput } from './library/RowMockingUtils';
import { IncomingMessage, OutgoingMessage, Tutor } from './store/slices/commsSlice';

export type FormKeys = BaseForm | InstructionForm | UserForm;
// Comprehensive interface for all possible BaseEntity properties
export interface EntityPropertyMap {
  name?: string;
  menu?: MenuItem[];
  lowermenu?: MenuItem[];
  highermenu?: MenuItem[];
  unlocked?: string[];
  webapps?: WebApps;
  fields?: string[];
  ordinals?: Record<string, string[]>;
  columns?: Array<Record<string, string>>;
  private?: Array<Record<string, string>>;
  anonymous?: Array<Record<string, string>>;
  prefixLen?: {
    private: number;
    public: number;
    anonymous: number;
  };
  public?: Array<Record<string, string>>;
  constraints?: Constraints;
  CSS?: () => string;
  connections?: string[];
  descendents?: null | string;
  form?: FormKeys;
  nonFormattedData?: (data: DataRow[]) => DataRow[]; // simply adding more fields to the data row
  formattedData?: (payload: DataRow[], links: string[]) => BaseFormattedData<EntityTypeMap[keyof EntityTypeMap]> | undefined;
  mockedData?: (metadatas: UserMockInput[] | BannerInput[] | PennantInput[] | StepInput[] | RootInput[] | Metadata[], connections: string[]) => MockedDataReturn;
}

export const RECORDS = "records";
export const BASIC = "ROLE_USER";
export const CHIEF = "ROLE_ADMIN";
export const MOD = "ROLE_MODERATOR";
export const DOWNWARDS = "DOWNWARDS";
export const UPWARDS = "UPWARDS";
export const VIEW_ROWS = "view_rows";
export const UNDO_CHANGES = "undo_changes";
export const SAVE_CHANGES = "save_changes";

export const UPDATE_ROWS = "updates";
export const DELETE_ROWS = "remove";
export const INSERT_ROWS = "insert";
export const REMOVE_ROWS = "unjoin";
export const SUCCESS = "success";
export const ADD_ROWS = "join";
export const ABORT = "cancel_operation";
export const BORDERLESS_UPWARDS = "append_content_top_noBorders";
export const BORDERLESS_DOWNWARDS = "append_content_bottom_noBorders";

export const TEXTS = "texts";
export const STATUSES = "statuses";
export const ORDINALS = "ordinals";
export const STATUSESTEXTS = "statusestexts";
export const STATUSESTEXTSORDINALS = "statusestextsordinals";
export const STATUSESORDINALS = "statusesordinals";
export const COMMUNICATIONS = "communications";
export const TEXTSORDINALS = "textsordinals";
export const EDITABILITY = "editability";
export const VISIBILITY = "visibility";
export const SOURCE = "source";

export interface MediaQuery {
  query: string;
}

export interface MediaQueries {
  Small: MediaQuery;
  Tablet: MediaQuery;
  Mobile: MediaQuery;
  Phablet: MediaQuery;
  DeskTop: MediaQuery;
  _15Inch: MediaQuery;
  _14Inch: MediaQuery;
}

export interface GlobalVars {
  globallyUniqueIDs: number;
  ingredients?: CookIngredientsProps | undefined;
}

export interface ToolKit {
  anonymousRecordsUrl: string;
  authenticatedRecordsUrl: string;
  authenticatedSkeletonsRecordsUrl: string;
  anonymousSkeletonsRecordsUrl: string;
  accountLoginUrl: string;
  anonymousFetcherUrl: string;
  authenticatedFetcherUrl: string;
  accountRegistrationUrl: string;
  accountUpdaterUrl: string;
  accountVerifierUrl: string;
  mutateAbilityUrl: string;
  mutateOrphansUrl: string;
  mutateQuotaUrl: string;
  mutateMimicedUrl: string;
  mutateVisibilityUrl: string;
  mutateHierachyUrl: string;
  mutateAgreementsUrl: string;
  executeMotionsUrl: string;
  sendPackagesUrl: string;
  sendPackageUrl: string;
  mutateIncomingUrl: string;
  mutateQuizUrl: string;
  mutateCourseUrl: string;
  mutateTutorsUrl: string;
  mutateOutgoingUrl: string;
  mutateTutorialUrl: string;
  quizFormatterUrl: string;
  courseFormatterUrl: string;
  questionFormatterUrl: string;
  pennantFormatterUrl: string;
  tutorialFormatterUrl: string;
  outgoingFormatterUrl: string;
  incomingFormatterUrl: string;
  tutorsFormatterUrl: string;
  mutateEntityUrl: string;
}

export interface TimeOptions {
  dateStyle: string;
  timeStyle: string;
}

export interface Structure {
  icons: string[];
  hasOutlier: string[];
  selOptions: Record<string, string>;
  noOutlier: string[];
}

export interface QueryParam {
  key: string;
  value: string;
}

export interface ValidParams {
  skip: number;
  take: number;
  seek?: string;
  isDefault: boolean;
}
export const outgoingMessage = "sending content... please wait";
export const editsMessage = "saving edits... please wait";
export const users = ["minions", "bosses", "underbosses"];
export const pncApps = ["tutorial", "course", "quiz"];
export const bannerRoutes = [
  "foundationfilters",
  "foundationsifters",
  "foundationdashboards",
];

export const escrowTimestamp = "dL00C393zIGUiRDSE6eu";
export const deletedTimestamp = "deleted3zIGUiRDSE6eu";
export const commentsTimestamp = "CT00C393zIGUiRDSE6eu";
export const visitedRoutes: Record<string, boolean> = {
  "/convolution/quiz": true,
  "/convolution/cpanel": true,
  "/convolution/search": true,
  "/convolution/course": true,
  "/convolution/tutors": true,
  "/convolution/tutorial": true,
  "/convolution/outgoing": true,
  "/convolution/incoming": true,
};

export const resetVistedRoutes = (value: boolean): void => {
  Object.keys(visitedRoutes).forEach((key) => (visitedRoutes[key] = value));
};

export const deleteShowInfos = (): void => {
  for (const key of Object.keys(showInfos)) delete showInfos[key];
};

export const placeholder = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAASABIAAD/4QAYRXhpZgAASUkqAAgAAAAAAAAAAAAAAP/hA29odHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMC1jMDYwIDYxLjEzNDc3NywgMjAxMC8wMi8xMi0xNzozMjowMCAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0UmVmPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VSZWYjIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtcE1NOk9yaWdpbmFsRG9jdW1lbnRJRD0ieG1wLmRpZDowMTgwMTE3NDA3MjA2ODExODhDNkUyRjBDQjIyQjYyQSIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDo1MURDREI3NERCODgxMUUyOEYxRkYyMkY4NEYyQTMwOSIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDo1MURDREI3M0RCODgxMUUyOEYxRkYyMkY4NEYyQTMwOSIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgQ1M1IE1hY2ludG9zaCI+IDx4bXBNTTpEZXJpdmVkRnJvbSBzdFJlZjppbnN0YW5jZUlEPSJ4bXAuaWlkOjA4ODAxMTc0MDcyMDY4MTE4OEM2RTJGMENCMjJCNjJBIiBzdFJlZjpkb2N1bWVudElEPSJ4bXAuZGlkOjAxODAxMTc0MDcyMDY4MTE4OEM2RTJGMENCMjJCNjJBIi8+IDwvcmRmOkRlc2NyaXB0aW9uPiA8L3JkZjpSREY+IDwveDp4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";

export const updPred = ({ deleted, checked, imageurl }: { deleted: boolean, checked: boolean, imageurl: string | undefined }) =>
  !deleted && checked && imageurl;

export const mq = [576, 768, 992, 1200, 1440, 1536, 1920].map(
  (bp) => `@media screen and (min-width: ${bp}px)`
);

export const userroles = ["ROLE_USER", "ROLE_ADMIN", "ROLE_MODERATOR"];

export function capitalizeFirstLetter(string: string | undefined): string {
  if (!string) return '';
  return string.charAt(0).toUpperCase() + string.slice(1);
}

export function unCapitalizeFirstLetter(string: string | undefined): string {
  if (!string) return '';
  return string.charAt(0).toLowerCase() + string.slice(1);
}



export type ConvSearch = {
  skip: number;
  take: number;
  search: string;
};

export const getConvSearch = (search: string): Record<string, ConvSearch> | null => {
  const queryObject = new URLSearchParams(search);
  const cs = queryObject.get('cs');
  if (cs) {
    return JSON.parse(Buffer.from(cs, 'base64').toString());
  }
  return null;
};

/** Convolution simple pager (skeleton skip); 0-based index in the query string. */
export const SIMPLE_PAGE_SEARCH_PARAM = 'simplePage';

/** Matches Classic pager: seven numbered items per window. */
export const SIMPLE_PAGER_WINDOW_SIZE = 7;

/** Inclusive last page index (700 pages → indices 0…699). */
export const SIMPLE_PAGER_DEFAULT_MAX_PAGE_INDEX = 699;

export const getSimplePageIndexFromSearch = (
  search: string,
  maxPageIndex: number = SIMPLE_PAGER_DEFAULT_MAX_PAGE_INDEX
): number => {
  const normalized = search.startsWith('?') ? search.slice(1) : search;
  const q = new URLSearchParams(normalized);
  const v = parseInt(q.get(SIMPLE_PAGE_SEARCH_PARAM) ?? '0', 10);
  if (Number.isNaN(v) || v < 0) return 0;
  return Math.min(maxPageIndex, v);
};

export const setSimplePageInSearch = (
  search: string,
  pageIndex: number,
  maxPageIndex: number = SIMPLE_PAGER_DEFAULT_MAX_PAGE_INDEX
): string => {
  const clamped = Math.min(maxPageIndex, Math.max(0, pageIndex));
  const normalized = search.startsWith('?') ? search.slice(1) : search;
  const q = new URLSearchParams(normalized);
  if (clamped <= 0) q.delete(SIMPLE_PAGE_SEARCH_PARAM);
  else q.set(SIMPLE_PAGE_SEARCH_PARAM, String(clamped));
  const s = q.toString();
  return s ? `?${s}` : '';
};
export const getEntityFromUrl = (pathname?: string): string => {
  const path = pathname ? pathname : window.location.pathname;
  const splits = path.split("/");
  if (splits.length < 3) throw new Error("invalidEntityUrl");
  return splits[splits.length - 2].toLowerCase();
};

export const getMessage = (todos: number): string => {
  return todos > 0
    ? `completed an action, ${todos} actions remaing`
    : "completed requested actions";
};

const actions = ["tabulator", "add", "remove"];
export const states = ["undo_changes", "save_changes"];

export const formatBytes = (bytes: number, decimals: number = 2): string => {
  if (!+bytes) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = [
    "Bytes",
    "KiB",
    "MiB",
    "GiB",
    "TiB",
    "PiB",
    "EiB",
    "ZiB",
    "YiB",
  ];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

export const getActionFromUrl = (): string => {
  const splits = window.location.pathname.split("/");
  const actionIndex = splits.findIndex((p) =>
    actions.includes(p.toLowerCase())
  );
  if (actionIndex > -1) return splits[actionIndex];
  return "view";
};

export const textFieldsExtractor = (unFormattedText: DataRow) => {
  const { frozen, checked, deleted, reordered, stated, status, ...text } =
    unFormattedText;
  return text;
};

export const getReloadEntity = (entity: string): string => {
  const urlEntity = getEntityFromUrl(window.location.pathname);
  if (urlEntity === entity) {
    if (entity === entity.toUpperCase()) return entity.toLowerCase();
    else if (entity === entity.toLowerCase()) return entity.toUpperCase();
  }
  return entity;
};

export const structure: Structure = {
  icons: [
    "Steps",
    "Admins",
    "Members",
    "Sifters",
    "Filters",
    "Mediators",
    "Partitions",
    "Overseers",
    "Sievers",
    "Classifiers",
    "Managers",
    "Root",
  ],
  hasOutlier: [],
  selOptions: {
    minions: "Members",
    instructions: "Steps",
    filters: "Filters",
    underbosses: "Mediators",
    sifters: "Sifters",
    bosses: "Administrators",
    lowersifters: "Sievers",
    highersifters: "Classifiers",
    dashboards: "Partitions",
    higherunderbosses: "Managers",
    lowerunderbosses: "Overseers",
    foundation: "Root",
  },
  noOutlier: [
    "Underboss",
    "Sifter",
    "Boss",
    "Dashboard",
    "Filter",
    "Minion",
    "Instruction",
  ],
};

export const jsonToBase64 = (jsonObj: unknown): string => {
  const jsonString = JSON.stringify(jsonObj);
  return Buffer.from(jsonString).toString('base64');
};

export const getEncodeDataPartFromUrl = (url?: string): string => {
  const pathname = url ?? window.location.pathname;
  return pathname.substring(pathname.lastIndexOf("/") + 1)?.split(/[\?]+/)[0];
};

export const queryString = (string: string): Record<string, string> => {
  return string
    .slice(1)
    .split("&")
    .map((queryParam) => {
      let data = queryParam.split("=");
      return { key: data[0], value: data[1] };
    })
    .reduce((query: Record<string, string>, data: QueryParam) => {
      query[data.key] = data.value;
      return query;
    }, {});
};

export const medias: MediaQueries = {
  Small: { query: `(min-width: 992px)` },
  Tablet: { query: `(min-width: 768px)` },
  Mobile: { query: `(min-width: 320px)` },
  Phablet: { query: `(min-width: 576px)` },
  DeskTop: { query: `(min-width: 1920px)` },
  _15Inch: { query: `(min-width: 1536px)` },
  _14Inch: { query: `(min-width: 1440px)` },
};

let take = 10;
export const timeout = 30000;
export const hydrationDelay = 100;
export const convolutionDelay = 1000;
export const convolutionTake = (): number => take;
export const setTake = (curtake: string | number): number => (take = parseInt(curtake as string));
export const globalVars: GlobalVars = { globallyUniqueIDs: -1, ingredients: undefined };
export const incrementID = (): number => globalVars.globallyUniqueIDs--;
export const redirectUrl = (ingredients: CookIngredientsProps | undefined): void => {
  globalVars.ingredients = ingredients;
};
export const signOut = (value: boolean): string => {
  globalVars.ingredients = undefined;
  globalVars.globallyUniqueIDs = -1;
  take = 10;
  deleteShowInfos();
  resetVistedRoutes(value);
  return "session/signedOut";
};

// Helper function to get the base URL based on environment
export const getBaseUrl = (): string => {
  // For development, use local backend server
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:8080';
  }

  // For preview mode (local testing of production build)
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return 'http://localhost:8080'; // Still use local backend for testing
  }

  // For real production, use empty string (relative URLs)
  return '';
};

export const ToolKit: ToolKit = {
  get anonymousRecordsUrl() { return getBaseUrl() + "/api/records/anonymous-app"; },
  get authenticatedRecordsUrl() { return getBaseUrl() + "/api/records/authenticated-app"; },
  get authenticatedSkeletonsRecordsUrl() { return getBaseUrl() + "/api/records/authenticated-skeletons-app"; },
  get anonymousSkeletonsRecordsUrl() { return getBaseUrl() + "/api/records/anonymous-skeletons-app"; },
  get accountLoginUrl() { return getBaseUrl() + "/api/settings/account-login"; },
  get accountVerifierUrl() { return getBaseUrl() + "/api/settings/account-verifier"; },
  get anonymousFetcherUrl() { return getBaseUrl() + "/api/records/anonymous-fetcher"; },
  get authenticatedFetcherUrl() { return getBaseUrl() + "/api/records/authenticated-fetcher"; },
  get accountRegistrationUrl() { return getBaseUrl() + "/api/settings/account-creator"; },
  get accountUpdaterUrl() { return getBaseUrl() + "/api/settings/account-updater"; },
  get mutateAbilityUrl() { return getBaseUrl() + "/api/settings/mutate-ability"; },
  get mutateOrphansUrl() { return getBaseUrl() + "/api/settings/mutate-orphans"; },
  get mutateQuotaUrl() { return getBaseUrl() + "/api/settings/mutate-quota"; },
  get mutateMimicedUrl() { return getBaseUrl() + "/api/settings/mutate-mimiced"; },
  get mutateVisibilityUrl() { return getBaseUrl() + "/api/settings/mutate-visibility"; },
  get mutateHierachyUrl() { return getBaseUrl() + "/api/settings/mutate-hierarchy"; },
  get mutateAgreementsUrl() { return getBaseUrl() + "/api/settings/account-agreements"; },
  get executeMotionsUrl() { return getBaseUrl() + "/api/records/execute-motions"; },
  get sendPackagesUrl() { return getBaseUrl() + "/api/records/send-packages"; },
  get sendPackageUrl() { return getBaseUrl() + "/api/records/send-package"; },
  get mutateIncomingUrl() { return getBaseUrl() + "/api/records/mutate-incoming"; },
  get mutateQuizUrl() { return getBaseUrl() + "/api/records/mutate-quiz"; },
  get mutateCourseUrl() { return getBaseUrl() + "/api/records/mutate-course"; },
  get mutateTutorsUrl() { return getBaseUrl() + "/api/records/mutate-tutors"; },
  get mutateOutgoingUrl() { return getBaseUrl() + "/api/records/mutate-outgoing"; },
  get mutateTutorialUrl() { return getBaseUrl() + "/api/records/mutate-tutorial"; },
  get quizFormatterUrl() { return getBaseUrl() + "/api/records/quiz-formatter"; },
  get courseFormatterUrl() { return getBaseUrl() + "/api/records/course-formatter"; },
  get questionFormatterUrl() { return getBaseUrl() + "/api/records/question-formatter"; },
  get pennantFormatterUrl() { return getBaseUrl() + "/api/records/pennant-formatter"; },
  get tutorialFormatterUrl() { return getBaseUrl() + "/api/records/tutorial-formatter"; },
  get outgoingFormatterUrl() { return getBaseUrl() + "/api/records/outgoing-formatter"; },
  get incomingFormatterUrl() { return getBaseUrl() + "/api/records/incoming-formatter"; },
  get tutorsFormatterUrl() { return getBaseUrl() + "/api/records/tutors-formatter"; },
  get mutateEntityUrl() { return getBaseUrl() + "/api/records/mutate-entity"; },
};

export const timeOptions: TimeOptions = {
  dateStyle: "short",
  timeStyle: "medium",
};

export const Tree = {
  query: undefined as string | undefined,
  entities: [] as BaseEntity[],
  prefixedMenu: "",
  isEntity(entity: string): boolean {
    this.query = entity?.toLowerCase();
    if (this.query?.startsWith("lower"))
      this.query = this.query.replace("lower", "");
    else if (this.query?.startsWith("higher"))
      this.query = this.query.replace("higher", "");
    if (this.entities && this.entities.length)
      return this.entities.findIndex((e) => e.name === this.query) > -1;
    else return false;
  },
  getProperty<K extends keyof EntityPropertyMap>(entity: string, propertyName: K): EntityPropertyMap[K] {
    this.prefixedMenu = "";
    this.query = entity?.toLowerCase();
    if (this.query?.startsWith("lower")) {
      this.query = this.query.replace("lower", "");
      this.prefixedMenu = propertyName === "menu" ? "lower" : "";
    } else if (this.query?.startsWith("higher")) {
      this.query = this.query.replace("higher", "");
      this.prefixedMenu = propertyName === "menu" ? "higher" : "";
    }
    if (this.entities && this.entities.length) {
      const parent = this.entities.find((e) => e.name === this.query);
      if (parent) return parent[this.prefixedMenu + propertyName] as EntityPropertyMap[K];
      return undefined;
    } else return undefined;
  },
  setEntities(entities: BaseEntity[]): void {
    if (this.entities) {
      if (entities && this.entities.length && entities.length) {
        this.entities = this.entities.map((entity) => {
          const newEntity = entities.find((e) => e.name === entity.name);
          return newEntity ? { ...entity, ...newEntity } : entity;
        });
      }
      else if (entities && entities.length)
        this.entities = entities;
      else return console.log(`provided:${entities} are not an in array`);
    }
    else throw new Error("this.entities not initialized");
    console.log(`${entities?.length}:entities updated`);
  },
};

/**
 * Plain `parentName + childName` route keys for one webapp, ordered root → leaf (BFS over `webapps[app]`).
 */
export function orderedWebappRoutes(entities: BaseEntity[], app: string): string[] {
  const entityByName = new Map(entities.map((e) => [e.name, e]));

  const childNames = new Set<string>();
  for (const e of entities) {
    for (const c of e.webapps[app] ?? []) {
      childNames.add(c);
    }
  }

  const ordered: string[] = [];
  const processed = new Set<string>();
  const queue: string[] = [];

  for (const e of entities) {
    if ((e.webapps[app]?.length ?? 0) > 0 && !childNames.has(e.name)) {
      queue.push(e.name);
    }
  }

  if (queue.length === 0) {
    const seed = entities.find((e) => (e.webapps[app]?.length ?? 0) > 0);
    if (seed) queue.push(seed.name);
  }

  while (queue.length) {
    const name = queue.shift()!;
    if (processed.has(name)) continue;
    processed.add(name);
    const entity = entityByName.get(name);
    if (!entity) continue;
    for (const child of entity.webapps[app] ?? []) {
      ordered.push(entity.name + child);
      const childEnt = entityByName.get(child);
      if (childEnt && (childEnt.webapps[app]?.length ?? 0) > 0) {
        queue.push(child);
      }
    }
  }

  const seen = new Set(ordered);
  for (const e of entities) {
    for (const child of e.webapps[app] ?? []) {
      const route = e.name + child;
      if (!seen.has(route)) {
        ordered.push(route);
        seen.add(route);
      }
    }
  }

  return ordered;
}

/**
 * Reorder entities BFS root → leaf using `webapps[app]` (all reachable nodes, including leaves); unreachable last in `entities` order.
 */
export function orderEntitiesRootToLeafForWebapp<T extends BaseEntity>(entities: T[], app: string): T[] {
  const entityByName = new Map(entities.map((e) => [e.name, e]));

  const childNames = new Set<string>();
  for (const e of entities) {
    for (const c of e.webapps[app] ?? []) {
      childNames.add(c);
    }
  }

  const orderedNames: string[] = [];
  const seen = new Set<string>();
  const queue: string[] = [];

  for (const e of entities) {
    if ((e.webapps[app]?.length ?? 0) > 0 && !childNames.has(e.name)) {
      queue.push(e.name);
    }
  }

  if (queue.length === 0) {
    const seed = entities.find((e) => (e.webapps[app]?.length ?? 0) > 0);
    if (seed) queue.push(seed.name);
  }

  while (queue.length) {
    const name = queue.shift()!;
    if (seen.has(name)) continue;
    seen.add(name);
    orderedNames.push(name);
    const entity = entityByName.get(name);
    if (!entity) continue;
    for (const child of entity.webapps[app] ?? []) {
      if (entityByName.has(child) && !seen.has(child)) {
        queue.push(child);
      }
    }
  }

  for (const e of entities) {
    if (!seen.has(e.name)) {
      seen.add(e.name);
      orderedNames.push(e.name);
    }
  }

  const byName = new Map(entities.map((e) => [e.name, e]));
  return orderedNames.map((n) => byName.get(n)).filter((e): e is T => e !== undefined);
}

/** Longest `entities` name prefix on `route` (plain, `lower`, or `higher` prefix). */
export function longestEntityRoutePrefix(
  entities: BaseEntity[],
  route: string
): { entity: BaseEntity; prefixLen: number } | undefined {
  let best: { entity: BaseEntity; prefixLen: number } | undefined;
  for (const e of entities) {
    for (const p of ["higher" + e.name, "lower" + e.name, e.name] as const) {
      if (route.startsWith(p) && (!best || p.length > best.prefixLen)) {
        best = { entity: e, prefixLen: p.length };
      }
    }
  }
  return best;
}

/**
 * Names in `allowedNames` ordered by walking `selectedRoutes`, then any leftovers in `allEntities` order.
 */
export function entityNamesOrderedBySelectedRoutes(
  allEntities: BaseEntity[],
  selectedRoutes: string[],
  allowedNames: Set<string>
): string[] {
  const ordered: string[] = [];
  const seen = new Set<string>();
  const push = (name: string) => {
    if (allowedNames.has(name) && !seen.has(name)) {
      seen.add(name);
      ordered.push(name);
    }
  };
  for (const route of selectedRoutes) {
    const hit = longestEntityRoutePrefix(allEntities, route);
    if (!hit) continue;
    push(hit.entity.name);
    push(route.slice(hit.prefixLen));
  }
  for (const e of allEntities) {
    if (allowedNames.has(e.name) && !seen.has(e.name)) {
      seen.add(e.name);
      ordered.push(e.name);
    }
  }
  return ordered;
}

export const maxIndexOfApps = 4;
export const maxIndexOfUserApps = 6;

export const getValidParams = (search: string, defaultTake: number): ValidParams => {
  const { seek, take, skip } = queryString(search);
  if (skip === undefined || take === undefined || isNaN(parseInt(skip)) || isNaN(parseInt(take))) {
    if (seek === undefined)
      return { skip: 0, take: defaultTake, isDefault: true };
    return { skip: 0, take: defaultTake, seek, isDefault: true };
  }
  const parsedtake = parseInt(take);
  const parsedskip = parseInt(skip);
  const validskip = parsedskip >= 0;
  const validtake = parsedtake > 0 && parsedtake <= 100;
  if (validskip && validtake && seek)
    return {
      seek,
      isDefault: false,
      skip: parsedskip,
      take: parsedtake,
    };
  else if (validskip && validtake)
    return {
      isDefault: false,
      skip: parsedskip,
      take: parsedtake,
    };
  else
    return seek
      ? { skip: 0, take: defaultTake, seek, isDefault: true }
      : { skip: 0, take: defaultTake, isDefault: true };
};

export const getCurSource = (action: string): string => {
  switch (action) {
    case "instructions":
      return "message";
    case "filters":
      return "tutorial";
    case "sifters":
      return "course";
    case "dashboards":
      return "quiz";
    case "outgoing":
    case "incoming":
      return action;
    default:
      throw new Error("unknown unknow source/destination app for -> " + action);
  }
};

export const getCurAppName = (input: string | number): string => {
  const appIndex = parseInt(input as string);
  return appIndex <= maxIndexOfApps
    ? userApps[appIndex].toLowerCase()
    : appIndex > maxIndexOfApps && appIndex <= maxIndexOfUserApps
      ? memberApps[appIndex].toLowerCase()
      : adminsApps[appIndex].toLowerCase();
};

/** Tutorial, course, or quiz (`userApps` 1–3). */
export const isPncUserApp = (appIndex: string | number): boolean =>
  pncApps.includes(getCurAppName(appIndex));

export const getCurAppIndex = (input: string): [string, string] | [] => {
  const pred = ([_, value]: [string, string]) => input.toLowerCase() === value.toLowerCase();
  return (
    Object.entries(userApps).find(pred) ??
    Object.entries(memberApps).find(pred) ??
    Object.entries(adminsApps).find(pred) ??
    []
  );
};

export const roleAliases: Record<string, string> = {
  ROLE_USER: "MEMBER",
  ROLE_ADMIN: "ADMINISTRATOR",
  ROLE_MODERATOR: "MODERATOR",
};

export const actionAliases: Record<string, string> = {
  add: "ADD_ROWS",
  remove: "REMOVE_ROWS",
  tabulator: "VIEW_ROWS",
};

export const connectsAliases: Record<string, string> = {
  UNSELECTED: "--CHOOSE_WHO_CAN_CONNECT_TO_SELECTED--",
  NONE: "UNLISTED_AND_NOBODY_CAN_CONNECT_TO_SELECTED",
  ANONYMOUS: "LISTED_BUT_NOBODY_CAN_CONNECT_TO_SELECTED",
  EVERYBODY: "LISTED_AND_REGISTERED_CAN_CONNECT_TO_SELECTED",
  NOTANONYMOUS: "UNLISTED_BUT_REGISTERED_CAN_CONNECT_TO_SELECTED",
  MINIONS: "UNLISTED_AND_MEMEBERS_CAN_CONNECT_TO_SELECTED",
  NOTBOSSESANDUNDERBOSSES: "LISTED_AND_MEMEBERS_CAN_CONNECT_TO_SELECTED",
  UNDERBOSSES: "UNLISTED_AND_MEDIATORS_CAN_CONNECT_TO_SELECTED",
  NOTBOSSESANDMINIONS: "LISTED_AND_MEDIATORS_CAN_CONNECT_TO_SELECTED",
  BOSSES: "UNLISTED_AND_ADMINS_CAN_CONNECT_TO_SELECTED",
  NOTUNDERBOSSESANDMINIONS: "LISTED_AND_ADMINS_CAN_CONNECT_TO_SELECTED",
  NOTMINIONS: "LISTED_AND_MEMEBERS_CANNOT_CONNECT_TO_SELECTED",
  NOTANONYMOUSANDMINIONS: "UNLISTED_AND_MEMEBERS_CANNOT_CONNECT_TO_SELECTED",
  NOTUNDERBOSSES: "LISTED_AND_MEDIATORS_CANNOT_CONNECT_TO_SELECTED",
  NOTANONYMOUSANDUNDERBOSSES: "UNLISTED_AND_MEDIATORS_CANNOT_CONNECT_TO_SELECTED",
  NOTBOSSES: "LISTED_AND_ADMINS_CANNOT_CONNECT_TO_SELECTED",
  NOTANONYMOUSANDBOSSES: "UNLISTED_AND_ADMINS_CANNOT_CONNECT_TO_SELECTED",
};

export const commentsVisibilityAliases: Record<string, string> = {
  UNSELECTED: "--CHOOSE_WHO_CAN_VIEW_COMMENT--",
  NONE: "NOBODY_CAN_VIEW_COMMENT",
  ANONYMOUS: "ANONYMOUS_CAN_VIEW_COMMENT",
  EVERYBODY: "EVERYBODY_CAN_VIEW_COMMENT",
  NOTANONYMOUS: "NOT_ANONYMOUS_CAN_VIEW_COMMENT",
  MINIONS: "MEMBERS_CAN_VIEW_COMMENT",
  NOTBOSSESANDUNDERBOSSES: "MEMBERS_AND_MEDIATORS_CAN_VIEW_COMMENT",
  UNDERBOSSES: "MEDIATORS_CAN_VIEW_COMMENT",
  NOTBOSSESANDMINIONS: "MEDIATORS_AND_ADMINS_CAN_VIEW_COMMENT",
  BOSSES: "ADMINS_CAN_VIEW_COMMENT",
  NOTUNDERBOSSESANDMINIONS: "ADMINS_AND_MEMBERS_CANNOT_VIEW_COMMENT",
  NOTMINIONS: "MEMBERS_CANNOT_VIEW_COMMENT",
  NOTANONYMOUSANDMINIONS: "MEMBERS_AND_MEDIATORS_CANNOT_VIEW_COMMENT",
  NOTUNDERBOSSES: "MEDIATORS_CANNOT_VIEW_COMMENT",
  NOTANONYMOUSANDUNDERBOSSES: "MEDIATORS_AND_MEMBERS_CANNOT_VIEW_COMMENT",
  NOTBOSSES: "ADMINS_CANNOT_VIEW_COMMENT",
  NOTANONYMOUSANDBOSSES: "ADMINS_AND_MEDIATORS_CANNOT_VIEW_COMMENT",
};

export const isValidPermission = (connects: string): boolean => {
  return connectsAliases[connects] !== undefined
    && connectsAliases[connects] !== "--CHOOSE_WHO_CAN_CONNECT_TO_SELECTED--";
};

export const isValidCommentsVisibility = (visibility: string): boolean => {
  return commentsVisibilityAliases[visibility] !== undefined
    && commentsVisibilityAliases[visibility] !== "--CHOOSE_WHO_CAN_VIEW_COMMENT--";
};

export const acceptedFiles = ".jpg,.jpeg,.webp,.png,.jif,.avif";

export const createAliases: Record<number, string> = {
  1: "CREATE_ONE_ITEM",
  5: "CREATE_FIVE_ITEMS",
  10: "CREATE_TEN_ITEMS",
  15: "CREATE_FIFTHTEEN_ITEMS",
  25: "CREATE_TWENTY_FIVE_ITEMS",
  50: "CREATE_FIFTY_ITEMS",
  100: "CREATE_HUNDRED_ITEMS",
  500: "CREATE_FIVE_HUNDRED_ITEMS",
  1000: "CREATE_ONE_THOUSAND_ITEMS",
};


export const genaralApps: Record<number, string> = {
  0: "---CHOOSE_APPLICATION---",
};

export const queryLimits: Record<number, string> = {
  50: "QUERY_LIMIT_FIFTY",
  75: "QUERY_LIMIT_SEVENTY_FIVE",
  100: "QUERY_LIMIT_ONE_HUNDRED",
  150: "QUERY_LIMIT_ONE_HUNDRED_FIFTY",
  200: "QUERY_LIMIT_TWO_HUNDRED",
  250: "QUERY_LIMIT_TWO_HUNDRED_FIFTY",
  300: "QUERY_LIMIT_THREE_HUNDRED",
};

export const QUERY_LIMIT_VALUES = Object.keys(queryLimits)
  .map(Number)
  .sort((a, b) => a - b);

/** Coerces persisted or legacy values onto a supported {@link queryLimits} entry. */
export const normalizeQueryLimit = (value: number): number => {
  if (value in queryLimits) return value;
  const max = QUERY_LIMIT_VALUES[QUERY_LIMIT_VALUES.length - 1] ?? 300;
  return QUERY_LIMIT_VALUES.find((limit) => limit >= value) ?? max;
};

export const takeAliases: Record<number, string> = {
  1: "TAKE_ONE_ITEM",
  10: "TAKE_TEN_ITEMS",
  15: "TAKE_FIFTHTEEN_ITEMS",
  25: "TAKE_TWENTY_FIVE_ITEMS",
  50: "TAKE_FIFTY_ITEMS",
  100: "TAKE_HUNDRED_ITEMS",
  500: "TAKE_FIVE_HUNDRED_ITEMS",
  1000: "TAKE_ONE_THOUSAND_ITEMS",
  5000: "TAKE_FIVE_THOUSAND_ITEMS",
};

export const fsqAliases: Record<number, string> = {
  1: "EXECUTE_ONE_FETCH",
  10: "EXECUTE_TEN_FETCHES",
  100: "EXECUTE_HUNDRED_FETCHES",
  1000: "EXECUTE_ONE_THOUSAND_FETCHES",
  5000: "EXECUTE_FIVE_THOUSAND_FETCHES",
};

export const randomizedTypeAliases: Record<'Imageurls' | 'details' | 'both', string> = {
  Imageurls: "RANDOMIZE_IMAGES",
  details: "RANDOMIZE_DETAILS",
  both: "RANDOMIZE_IMAGES_N_DETAILS",
};

export const takeCountOrder = Object.keys(takeAliases)
  .map(Number)
  .sort((a, b) => a - b);

/** Hydration only: use take options > 1; when take is 1, use the next option (5). */
export const getHydrationDefaultTake = (defaultTake: number): number => {
  if (defaultTake > 1) return defaultTake;
  if (defaultTake !== 1) return defaultTake;
  const oneIndex = takeCountOrder.indexOf(1);
  const next = oneIndex >= 0 ? takeCountOrder[oneIndex + 1] : takeCountOrder.find((n) => n > 1);
  return next ?? defaultTake;
};

export const catalinaSizes: Record<number, string> = {
  0: "SAVE_ZERO_LINES",
  1: "SAVE_ONE_LINE",
  5000: "SAVE_LAST_5000_LINES",
  10000: "SAVE_LAST_10000_LINES",
  20000: "SAVE_LAST_20000_LINES",
  50000: "SAVE_LAST_50000_LINES",
  500000: "SAVE_LAST_500000_LINES",
};

export const deltionSizes: Record<number, string> = {
  0: "ZERO_ORPHANS",
  100: "DELETE_100_ORPHANS",
  500: "DELETE_500_ORPHANS",
  1000: "DELETE_1000_ORPHANS",
  5000: "DELETE_5000_ORPHANS",
  10000: "DELETE_10000_ORPHANS",
};

export const quotaOptions: Record<number, string> = {
  0: "0_MEGABYTES",
  10485760: "10_MEGABYTES",
  54857600: "50_MEGABYTES",
  104857600: "100_MEGABYTES",
  524288000: "500_MEGABYTES",
  1073741824: "ONE_GIGABYTE",
  2147483648: "TWO_GIGABYTES",
  4294967296: "FOUR_GIGABYTES",
  8589934592: "EIGHT_GIGABYTES",
  17179869184: "SIXTEEN_GIGABYTES",
  34359738368: "THIRTY_TWO_GIGABYTES",
  68719476736: "SIXTY_FOUR_GIGABYTES",
  137438953472: "ONE_HUNDRED_TWENTY_EIGHT_GIGABYTES",
  274877906944: "TWO_HUNDRED_FIFTY_SIX_GIGABYTES",
  549755813888: "FIVE_HUNDRED_TWELVE_GIGABYTES",
  1073741824000: "ONE_TERABYTE",
  2147483648000: "TWO_TERABYTES",
  4294967296000: "FOUR_TERABYTES",
  8589934592000: "EIGHT_TERABYTES",
  17179869184000: "SIXTEEN_TERABYTES",
  34359738368000: "THIRTY_TWO_TERABYTES",
  68719476736000: "SIXTY_FOUR_TERABYTES",
  137438953472000: "ONE_HUNDRED_TWENTY_EIGHT_TERABYTES",
  274877906944000: "TWO_HUNDRED_FIFTY_SIX_TERABYTES",
  549755813888000: "FIVE_HUNDRED_TWELVE_TERABYTES",
};

export const sessionSizes: Record<number, string> = {
  0: "ZERO_SECONDS",
  7200: "TWO_HOURS",
  3600: "THREE_HOURS",
  14100: "FIVE_MINUTES",
  10800: "SIXTY_MINUTES",
  12600: "THIRTY_MINUTES",
  13500: "FIFTEEN_MINUTES",
};

export const applications: string[][] = [
  [],
  ["root", "filters"],
  ["root"],
  ["root", "sifters", "filters"],
  ["root", "dashboards"],
  ["root"],
  ["members", "mediators", "admins"],
  structure.icons.map((name) => name.toLowerCase()),
];

export const MEMBER = 1;
export const ANONYMOUS = 0;
export const MODERATOR = 2;
export const ADMINISTRATOR = 3;

export const getAlias = (entityName: string): string => {
  const aliases: Record<string, string> = {
    boss: "admin",
    bosses: "admins",
    minion: "member",
    minions: "members",
    instruction: "step",
    instructions: "steps",
    underboss: "mediator",
    dashboard: "partition",
    dashboards: "partitions",
    underbosses: "mediators",
    lowersifter: "siever",
    lowersifters: "sievers",
    lowerunderboss: "overseer",
    higherunderboss: "manager",
    highersifter: "classifier",
    highersifters: "classifiers",
    higherunderbosses: "managers",
    lowerunderbosses: "overseers",
    foundation: "root",
  };
  const name = aliases[entityName?.toLowerCase()];
  return name ? name : entityName;
};

export const getRouteAlias = (route: string, curApp: string): string => {
  const aliases: Record<string, string> = {
    foundationbosses: "Admins",
    foundationminions: "Members",
    foundationsifters: "Courses",
    foundationfilters: "Tutorials",
    foundationunderbosses: "Tutors",
    foundationdashboards: "Quizzes",
    foundationinstructions: "Messages",
    dashboardsfilters: "Attempts of Quiz",
    dashboardssifters: "Questions of Quiz",
    minionssifters: "Courses Sent to Members",
    minionsfilters: "Tutorials Sent to Members",
    minionsdashboards: "Quizzes Sent to Members",
    minionsinstructions: "Messages Sent to Members",
    underbossessifters: "Courses Sent to Mediators",
    underbossesinstructions: "Messages Sent to Mediators",
    underbossesdashboards: "Quizzes Sent to Mediators",
    underbossesfilters: "Tutorials Sent to Mediators",
    bossesinstructions: "Messages Sent to Admins",
    bossesdashboards: "Quizzes Sent to Admins",
    bossesfilters: "Tutorials Sent to Admins",
    bossessifters: "Courses Sent to Admins",
  };
  const name = aliases[route?.toLowerCase()];
  return name ? name : resolveAmbiguousRoute(route, curApp);
};

const resolveAmbiguousRoute = (route: string, curApp: string): string => {
  const aliases: Record<string, string> = {
    tutorialfiltersinstructions: "Steps of Tutorial",
    coursefiltersinstructions: "Steps of Chapter",
    coursesiftersfilters: "Chapters of Course",
    coursesiftersinstructions: "Covers of Course",
    quizsiftersinstructions: "Options of Question",
    quizsiftersfilters: "Followup Questions of Question",
    quizfiltersinstructions: "Options of Followup Question",
  };
  const name = aliases[curApp + route?.toLowerCase()];
  return name ? name : 'Unknown Route';
};
export const getEntity = (alias: string): string => {
  const lowercasedAlias = alias?.toLowerCase();
  switch (lowercasedAlias) {
    case "admins":
      return "bosses";
    case "members":
      return "minions";
    case "partitions":
      return "dashboards";
    case "steps":
      return "instructions";
    case "mediators":
      return "underbosses";
    case "sievers":
      return "lowersifters";
    case "classifiers":
      return "highersifters";
    case "overseers":
      return "lowerunderbosses";
    case "managers":
      return "higherunderbosses";
    case "root":
      return "foundation";
    default:
      return lowercasedAlias;
  }
};

export const getSingular = (plural: string): string => {
  switch (plural?.toLowerCase()) {
    case "instructions":
      return "instruction";
    case "lowerunderbosses":
    case "higherunderbosses":
    case "underbosses":
      return "underboss";
    case "dashboards":
      return "dashboard";
    case "filters":
      return "filter";
    case "highersifters":
    case "lowersifters":
    case "sifters":
      return "sifter";
    case "minions":
      return "minion";
    case "bosses":
      return "boss";
    case "courses":
      return "course";
    case "quizzes":
      return "quiz";
    case "tutorials":
      return "tutorial";
    case "tutors":
      return "tutor";
    case "foundation":
      return "foundation";
    default:
      throw Error(`"${plural}" conversion to singular failed`);
  }
};

export const getPlural = (singular: string): string => {
  switch (singular.toLowerCase()) {
    case "boss":
      return "bosses";
    case "minion":
      return "minions";
    case "sifter":
      return "sifters";
    case "filter":
      return "filters";
    case "instruction":
      return "instructions";
    case "dashboard":
      return "dashboards";
    case "underboss":
      return "underbosses";
    case "higherunderboss":
      return "higherunderbosses";
    case "lowerunderboss":
      return "lowerunderbosses";
    case "highersifter":
      return "highersifters";
    case "lowersifter":
      return "lowersifters";
    case "tutors":
    case "tutor":
      return "tutors";
    case "quizzes":
    case "quiz":
      return "quizzes";
    case "tutorials":
    case "tutorial":
      return "tutorials";
    case "courses":
    case "course":
      return "courses";
    case "foundation":
      return "foundation";
    default:
      throw Error(`"${singular}" conversion to plural failed`);
  }
};

export const getSingularKeepPrefix = (plural: string): string => {
  switch (plural.toLowerCase()) {
    case "lowerunderbosses":
      return "lowerunderboss";
    case "higherunderbosses":
      return "higherunderboss";
    case "highersifters":
      return "highersifter";
    case "lowersifters":
      return "lowersifter";
    default:
      return getSingular(plural);
  }
};

export const getInteractionIDs = (begining: string, destination: string): { parentID: string | null; childID: string | null } => {
  const parentID = begining ? getInteractionID(begining) : null;
  const childID = destination ? getInteractionID(destination) : null;
  const { from: _parentID, to: _childID } = getMoldsResolver(parentID ?? '', childID ?? '');
  return parentID !== childID
    ? { parentID: _parentID, childID: _childID }
    : { parentID: _parentID, childID: "lower" + _childID };
};

const getInteractionID = (entity: string): string => {
  switch (entity.toLowerCase()) {
    case "bosses":
      return "bossId";
    case "dashboards":
      return "dashboardId";
    case "filters":
      return "filterId";
    case "instructions":
      return "instructionId";
    case "minions":
      return "minionId";
    case "sifters":
      return "sifterId";
    case "underbosses":
      return "underbossId";
    case "higherunderbosses":
      return "higherunderbossId";
    case "lowerhigherunderbosses":
      return "lowerhigherunderbossId";
    case "lowerunderbosses":
      return "lowerunderbossId";
    case "lowerlowerunderbosses":
      return "lowerlowerunderbossId";
    case "highersifters":
      return "highersifterId";
    case "lowersifters":
      return "lowersifterId";
    case "lowerhighersifters":
      return "lowerhighersifterId";
    case "lowerlowersifters":
      return "lowerlowersifterId";
    case "foundation":
      return "foundationId";
    default:
      throw Error(`"${entity}" is not an enttity`);
  }
};

interface UrlParts {
  affix: string;
  index: number;
}

const urlParts: UrlParts = {
  affix: "/app/",
  index: 0,
};

interface SetUrlPartsParams {
  affix?: string;
  index?: number;
}

export const setUrlParts = (parts: SetUrlPartsParams): void => {
  if (parts === undefined) return;
  const { affix, index } = parts;
  urlParts.affix = affix ?? urlParts.affix;
  urlParts.index = index ?? urlParts.index;
};

let request = 0;

export interface CookIngredientsProps {
  entity?: string;
  search?: string;
  prefix?: string;
  toggle?: boolean;
  defaultTake?: number;
  contentIds?: number[];
  parentData?: ParentData;
}

export interface CookIngredientsResult {
  pfx: string;
  url: string;
  affix: string;
  search: string;
}

export const cookIngredients = (props: CookIngredientsProps): CookIngredientsResult | undefined => {
  const {
    entity,
    search,
    toggle,
    prefix,
    parentData,
    defaultTake: take,
  } = props;
  if (parentData && entity) {
    const query = search ? search : `?skip=0&take=${take}&req=${request++}`;
    if (prefix) {
      urlParts.affix = prefix;
      urlParts.index = tabluarPrefixes.indexOf(prefix);
      urlParts.index = urlParts.index > -1 ? urlParts.index : 0;
    }
    const curPrefix = toggle ? getPrefix() : urlParts.affix;
    if (toggle === undefined && urlParts.index > 0)
      urlParts.affix = tabluarPrefixes[(urlParts.index = 0)];
    const suffix = jsonToBase64(parentData) + query;
    const url = curPrefix + entity + "/" + suffix;
    return { pfx: curPrefix, url, affix: urlParts.affix, search: query };
  }
};

const getPrefix = (): string => {
  const url = window.location.pathname.toLowerCase();
  const index = tabluarPrefixes.findIndex((p) => url.startsWith(p));
  const prefix = (urlParts.affix =
    index === -1 ? tabluarPrefixes[urlParts.index] : "/app/");
  if (index > -1) urlParts.index = index;
  return prefix;
};

const stripLowerHigherAndId = (s: string, prefix: "lower" | "higher") =>
  s.replace(new RegExp(prefix, "gi"), "").replace(/Id$/i, "");

export const getMoldsResolver = (fromEntity: string, toEntity: string): { from: string, to: string } => {
  if (toEntity.toLowerCase().startsWith("lower")) {
    const base = stripLowerHigherAndId(toEntity, "lower");
    const hadId = /Id$/i.test(toEntity);
    return { to: base + (hadId ? "Id" : ""), from: base + (hadId ? "lowerId" : "lower") };
  } else if (toEntity.toLowerCase().startsWith("higher")) {
    const base = stripLowerHigherAndId(toEntity, "higher");
    const hadId = /Id$/i.test(toEntity);
    return { to: base + (hadId ? "Id" : ""), from: base + (hadId ? "higherId" : "higher") };
  } else {
    return { from: fromEntity, to: toEntity };
  }
};

export const getGraphqlResolver = (fromEntity: string, toEntity: string) => {
  const toLowerEntity = toEntity.toLowerCase();
  const isToLowerEntity = fromEntity === toLowerEntity;
  return !isToLowerEntity
    ? {
      graphqlResolver: fromEntity + capitalizeFirstLetter(toEntity),
      to: capitalizeFirstLetter(toEntity),
      from: fromEntity,
    }
    : {
      graphqlResolver: fromEntity + "Lower" + toLowerEntity,
      to: "Lower" + toLowerEntity,
      from: fromEntity,
    };
};

interface Selection {
  selectedChild: string;
  selectedParent: string;
}

interface ValidatedCombinationResult {
  selectedChild: string;
  selectedParent: string;
  isValid: boolean;
}

export const validatedCombination = (
  selection: Selection,
  notReturnAliases: boolean,
  webapp: string,
  log?: boolean
): ValidatedCombinationResult => {
  const entity = getEntity(selection.selectedChild);
  const parent = getEntity(selection.selectedParent);
  const webapps = Tree.getProperty(parent, "webapps");
  const unlocked = Tree.getProperty(parent, "unlocked");
  const permitted = webapps?.[webapp as keyof WebApps] ?? unlocked;
  const isValid =
    (unlocked?.indexOf(entity) ?? -1) > -1 && (permitted?.indexOf(entity) ?? -1) > -1;
  if (!isValid && log) console.log("valid_routes", parent, unlocked);
  if (notReturnAliases)
    return { selectedChild: entity, selectedParent: parent, isValid };
  else return { ...selection, isValid };
};

export const uniqueAliases = ["text", "quote", "content", "title", "imageurl", 'email'];

export const calcBytes = (r: Partial<DataRow> | OutgoingMessage | IncomingMessage | Tutor, to: string | string[] = getEntityFromUrl()) => {
  const isString = typeof to === "string";
  const fields = isString ? Tree.getProperty(to, "fields") : to;
  return (fields ?? []).reduce((t: number, k: string) => t + Buffer.byteLength(String(r[k as keyof DataRow] ?? ""), "utf8"), 0);
};

export const textEllipsis = (
  str: string,
  maxLength = 500,
  { side = "end", ellipsis = "..." } = {}
) => {
  if (str && str.length > maxLength) {
    switch (side) {
      case "start":
        return ellipsis + str.slice(-(maxLength - ellipsis.length));
      case "end":
      default:
        return str.slice(0, maxLength - ellipsis.length) + ellipsis;
    }
  }
  return str;
};
type possibleTypes = number | string | boolean | object | null | undefined;
export const truncateFields = (obj: possibleTypes, maxLength: number = 10): possibleTypes => {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    return obj.length > maxLength ? obj.substring(0, maxLength) + '...' : obj;
  }

  if (typeof obj === 'number' || typeof obj === 'boolean') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => truncateFields(item, maxLength));
  }

  if (typeof obj === 'object') {
    const truncated: object = {};
    for (const [key, value] of Object.entries(obj)) {
      truncated[key] = truncateFields(value, maxLength);
    }
    return truncated;
  }

  return obj;
};

export const truncatedStringify = (obj: possibleTypes, maxLength: number = 10, space?: string | number): string => {
  return JSON.stringify(truncateFields(obj, maxLength), null, space);
};

