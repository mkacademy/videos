import { UPDATE_ROWS } from "../utils";
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











export interface sendPackagePayload {
    quota: number,
    webapp: string,
    curToken: string,
    curMailer: number,
    mutateRole: string,
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
