
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


