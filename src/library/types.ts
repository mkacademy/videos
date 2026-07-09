import { UPDATE_ROWS } from "../utils";
import { TutorType } from "../store/slices/commsSlice";
import { CookIngredientsProps } from "../utils";
export interface CustomJwtPayload {
    sub: string;
    quota: number;
    userid: number;
    roles: string[];
    roleIds: number[];
}

export interface AuthPayload {
    email: string;
    seconds: number;
    password: string;
    selectedRole: string;
    ingredients: CookIngredientsProps;
}

export interface FormData {
    mutateRole?: string;
    username_txb: string;
    oldpassword_txb: string;
    newpassword_txb?: string;
    email_txb?: string;
    curToken?: string;
    attempts?: number;
}

export interface VerifyFormData {
    verificationcode_txb: string;
    attempts?: number;
}

export interface MutateAbilityPayload {
    curToken: string;
    mutateRole: string;
    enabled: boolean;
    candidates: number[];
}

export interface MutateAbilityResponse {
    enabled: boolean;
    candidates: number[];
}

export interface MutateOrphansPayload {
    curToken: string,
    mutateRole: string,
    limit: number,
}

export interface MutateQuotaPayload {
    curToken: string,
    mutateRole: string,
    quota: number,
    ids: number[],
}

export interface MutateMimicedPayload {
    curToken: string,
    mutateRole: string,
    member: number,
    seconds: number,
}

export interface MutateVisibilityPayload {
    curToken: string,
    mutateRole: string,
    quota: number,
    curMailer: number,
    target: string;
    entity: string;
    resolvers: string[];
    [UPDATE_ROWS]: {
        childIds: number[],
        parentIds: number[],
        visibility: string,
    }
}

export interface MutateHierachyPayload {
    curToken: string,
    mutateRole: string,
    candidates: {
        id: number;
        type: number;
    }[],
    selector: string,
}

export interface MutateHierachyResponse {
    selector: string,
    candidates: string[],
}

export interface mutateMotionsPayload {
    mutateRole: string,
    modified: {
        id: number;
        motion?: {
            prev: TutorType;
            cur: TutorType;
            token: string;
        };
    }[],
    curMailer: number,
    curToken: string,
    quota: number,
}

export interface mutateMotionsResponse {
    modified: {
        id: number;
        motion?: {
            prev: TutorType;
            cur: TutorType;
            token: string;
        };
    }[],
}

export interface sendPackagesPayload {
    quota: number,
    curToken: string,
    mutateRole: string,
    modified: {
        id: number;
        targets?: (string | number)[];
        status: {
            communications?: string;
            primary: { disabled: boolean; label: string };
            danger: { disabled: boolean; label: string };
        };
    }[],
}

export interface sendPackagesResponse {
    packages: {
        quota: number;
        curToken: string;
        mutateRole: string;
        curMailer: number;
        webapp: string;
        formatter?: string;
        resolvers: string[];
        unlocked: string[];
        foundations: Record<string, Record<string, Record<string, number[]>>>;
    }[];
    sent: Record<string, {
        id: number;
        type: string;
        targets: (string | number)[];
        status: {
            communications?: string;
            primary: { disabled: boolean; label: string };
            danger: { disabled: boolean; label: string };
        };
    }[]>;
}

export interface sendPackagePayload {
    quota: number,
    webapp: string,
    curToken: string,
    curMailer: number,
    mutateRole: string,
    unlocked: string[],
    resolvers: string[],
    formatter?: string,
    foundations: Record<string, Record<string, Record<string, number[]>>>,
}

export interface mutateAgreementsPayload {
    curToken: string,
    mutateRole: string,
    connections: {
        isActive: boolean;
        tutor: number;
    }[],
    abilities: {
        isActive: boolean;
        tutor: number;
    }[],
}

export interface mutateAgreementsResponse {
    agreements: string[],
    abilities: string[],
}

export interface MutateEntitiesResponse {
    type: string;
    payload?: MutateEntityResponse | string;
}

export interface MutateEntityResponse {
    task?: string;
    reply?: string;
    route?: string;
}
