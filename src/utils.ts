import { Buffer } from 'buffer';
import {
  DataRow,
  BaseFormattedData,
} from './components/Core/types';
import {  userApps, memberApps, adminsApps } from './constants';
import { EntityTypeMap } from './store/slices/rowSlice';
import Instruction from './components/Core/Instruction';


export interface EntityPropertyMap {
  name?: string;
  formattedData?: (payload: DataRow[], links: string[]) => BaseFormattedData<EntityTypeMap[keyof EntityTypeMap]> | undefined;
}


export interface GlobalVars {
  globallyUniqueIDs: number;
}

export interface ToolKit {
  anonymousRecordsUrl: string;
  authenticatedRecordsUrl: string;
  accountLoginUrl: string;
  anonymousFetcherUrl: string;
  authenticatedFetcherUrl: string;
}


export const userroles = ["ROLE_USER", "ROLE_ADMIN", "ROLE_MODERATOR"];


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





export const jsonToBase64 = (jsonObj: unknown): string => {
  const jsonString = JSON.stringify(jsonObj);
  return Buffer.from(jsonString).toString('base64');
};

export const getEncodeDataPartFromUrl = (url?: string): string => {
  const pathname = url ?? window.location.pathname;
  return pathname.substring(pathname.lastIndexOf("/") + 1)?.split(/[\?]+/)[0];
};



let take = 10;
export const timeout = 30000;
export const hydrationDelay = 100;
export const convolutionDelay = 1000;
export const convolutionTake = (): number => take;
export const setTake = (curtake: string | number): number => (take = parseInt(curtake as string));
export const globalVars: GlobalVars = { globallyUniqueIDs: -1 };
export const incrementID = (): number => globalVars.globallyUniqueIDs--;
export const signOut = (): string => {
  globalVars.globallyUniqueIDs = -1;
  take = 10;
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
  get accountLoginUrl() { return getBaseUrl() + "/api/settings/account-login"; },
  get anonymousFetcherUrl() { return getBaseUrl() + "/api/records/anonymous-fetcher"; },
  get authenticatedFetcherUrl() { return getBaseUrl() + "/api/records/authenticated-fetcher"; },
};

export const Tree = {
  query: undefined as string | undefined,
  entities: [] as Instruction[],
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
    } else if (this.query?.startsWith("higher")) {
      this.query = this.query.replace("higher", "");
    }
    if (this.entities && this.entities.length) {
      const parent = this.entities.find((e) => e.name === this.query);
      if (parent) return parent[this.prefixedMenu + propertyName] as EntityPropertyMap[K];
      return undefined;
    } else return undefined;
  },
  setEntities(entities: Instruction[]): void {
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

export const maxIndexOfApps = 4;
export const maxIndexOfUserApps = 6;
export function capitalizeFirstLetter(string: string | undefined): string {
  if (!string) return '';
  return string.charAt(0).toUpperCase() + string.slice(1);
}

export function unCapitalizeFirstLetter(string: string | undefined): string {
  if (!string) return '';
  return string.charAt(0).toLowerCase() + string.slice(1);
}
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



export const getCurAppIndex = (input: string): [string, string] | [] => {
  const pred = ([_, value]: [string, string]) => input.toLowerCase() === value.toLowerCase();
  return (
    Object.entries(userApps).find(pred) ??
    Object.entries(memberApps).find(pred) ??
    Object.entries(adminsApps).find(pred) ??
    []
  );
};






export const acceptedFiles = ".jpg,.jpeg,.webp,.png,.jif,.avif";




export const genaralApps: Record<number, string> = {
  0: "---CHOOSE_APPLICATION---",
};






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



export interface CookIngredientsResult {
  pfx: string;
  url: string;
  affix: string;
  search: string;
}





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

export const uniqueAliases = ["text", "quote", "content", "title", "imageurl", 'email'];



