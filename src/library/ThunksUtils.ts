import { jwtDecode } from 'jwt-decode';
import { createSelector, Dispatch } from '@reduxjs/toolkit';
import { Content, Banner as TutorialBanner } from '../store/slices/tutorialSlice';
import { Banner, SlideGroup } from './CourseUtils';
import { IncomingMessage, OutgoingMessage } from '../store/slices/commsSlice';
import { ToolKit, getCurAppName, timeout } from '../utils';
import { ResultPayload } from '../store/slices/rowSlice';
import { Quiz } from '../store/slices/quizSlice';
import { CpanelRow } from '../components/Core/types';
import { QueryParams } from '../store/types';
import { RootState } from '../store';
import { setOutgoings, setIncomings } from '../store/slices/commsSlice';



const expireMessage = 'Token has expired, sign out and sign in again';

interface RecordParams {
    curApp: number;
    search: string;
    mailer?: number;
    state: RootState;
    formatter: string;
    isPrivate?: boolean;
    convolution: string;
    requestTake: number;
    curToken?: string | null;
    fetchRole?: string | null;
    path: string;
}

const getAccountBody = async (params: RecordParams) => {
    const stateProps = {
        quizzes: [],
        pennants: [],
        banners: [],
        pennantz: [],
        content: [],
        selecteds: {},
        selectedT: -1,
        selectedC: -1,
        selectedQ: -1,
        webapp: params.curApp,
        contend: [],
    }
    const requestBody = {
        counts: {},
        queries: {},
        state: stateProps,
        searchedRoutes: null,
        mailer: params.mailer,
        search: params.search,
        curToken: params.curToken,
        isPrivate: params.isPrivate,
        formatter: params.formatter,
        mutateRole: params.fetchRole,
        convolution: params.convolution,
        requestTake: params.requestTake,
    };
    return JSON.stringify(requestBody);
}

export const getAccountRecords = async (params: RecordParams) => {
    const endpoint = params.path;
    const currentTime = new Date().getTime();
    if (!params.curToken) throw new Error('No token provided');
    const decodedToken = jwtDecode<{ exp: number }>(params.curToken);
    if (decodedToken.exp * 1000 < currentTime) throw new Error(expireMessage);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: await getAccountBody(params),
            signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (!response.ok) throw new Error('Failed to fetch account records');
        return await response.json();
    } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error(`Request timeout: Failed to fetch account records after ${timeout}ms`);
        }
        throw error;
    }
};


const getAnonymousBody = async (params: RecordParams) => {
    const stateProps = {
        quizzes: [],
        pennants: [],
        banners: [],
        pennantz: [],
        content: [],
        contend: [],
        selecteds: {},
        selectedT: -1,
        selectedC: -1,
        selectedQ: -1,
        webapp: params.curApp,
    };
    const requestBody = {
        counts: {},
        queries: {},
        state: stateProps,
        searchedRoutes: null,
        search: params.search,
        formatter: params.formatter,
        convolution: params.convolution,
        requestTake: params.requestTake,
    };
    return JSON.stringify(requestBody);
}
export const getAnonymousRecords = async (params: RecordParams) => {
    const endpoint = params.path;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: await getAnonymousBody(params),
            signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (!response.ok) throw new Error('Failed to fetch anonymous records');
        return await response.json();
    } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error(`Request timeout: Failed to fetch anonymous records after ${timeout}ms`);
        }
        throw error;
    }
};

export interface Executedquery {
    isPrivateView?: boolean;
    parentIDs?: number[];
    childIDs?: number[];
    search?: string;
    take?: number;
    skip?: number;
}

export interface FetchDataPayload {
    isMinimumFeatureMode?: boolean;
    convolution: string;
    webapp: string;
    search: string;
}

export interface MinimumFeatureModeFlags {
    isUnzipCourses: boolean;
    isUnzipQuizzes: boolean;
    isUnzipTutorials: boolean;
}

export const isMinimumFeatureModeFromFlags = (flags: MinimumFeatureModeFlags): boolean =>
    flags.isUnzipCourses || flags.isUnzipQuizzes || flags.isUnzipTutorials;

export const selectMinimumFeatureModeFlags = createSelector(
    [
        (state: RootState) => state.settings.isUnzipCourses,
        (state: RootState) => state.settings.isUnzipQuizzes,
        (state: RootState) => state.settings.isUnzipTutorials,
    ],
    (isUnzipCourses, isUnzipQuizzes, isUnzipTutorials): MinimumFeatureModeFlags => ({
        isUnzipCourses,
        isUnzipQuizzes,
        isUnzipTutorials,
    }),
);

export const buildFetchDataPayload = (
    unzipFlags: MinimumFeatureModeFlags,
    payload: Omit<FetchDataPayload, 'isMinimumFeatureMode'>,
): FetchDataPayload => ({
    ...payload,
    isMinimumFeatureMode: isMinimumFeatureModeFromFlags(unzipFlags),
});

export const anonymousFetch = async (query: QueryParams): Promise<ResultPayload> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(ToolKit.anonymousFetcherUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(query),
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (!response.ok) throw new Error('Failed to fetch anonymous records');
        const data = await response.json();
        const sizeMb = new Blob([JSON.stringify(data)]).size / (1024 * 1024);
        console.log(`anonymousFetch response size: ${sizeMb.toFixed(2)} MB`);
        const keywords = [`${query.limit?.skip}-${query.limit?.take}`];
        const result = {
            keywords,
            payload: data,
            entity: query.entity || '',
            parent: query.parent || '',
            isAppend: query.type === "row/appendRowz"
        };
        return result;
    } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error(`Request timeout: Failed to fetch anonymous records after ${timeout}ms`);
        }
        throw error;
    }
};

export const authenticatedFetch = async (query: QueryParams): Promise<ResultPayload> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(ToolKit.authenticatedFetcherUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(query),
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (!response.ok) throw new Error('Failed to fetch authenticated records');
        const data = await response.json();
        const sizeMb = new Blob([JSON.stringify(data)]).size / (1024 * 1024);
        console.log(`authenticatedFetch response size: ${sizeMb.toFixed(2)} MB`);
        const keywords = [`${query.limit?.skip}-${query.limit?.take}`];
        const result = {
            keywords,
            payload: data,
            entity: query.entity || '',
            parent: query.parent || '',
            isAppend: query.type === "row/appendRowz"
        };
        return result;
    } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error(`Request timeout: Failed to fetch authenticated records after ${timeout}ms`);
        }
        throw error;
    }
};


export interface FetchedData {
    quizzes?: Quiz[];
    totals?: Record<string, number>;
    banners?: Banner[] | TutorialBanner[];
    counts: Record<string, Record<string, number>>;
    executedQueries?: Record<string, Executedquery>;
    content?: SlideGroup[] | Content[][] | OutgoingMessage[] | IncomingMessage[] | Record<string, Record<string, CpanelRow[]>>;
}

interface validateThenDispatchPayload {
    query: Record<string, Record<string, Executedquery>>;
    response: FetchedData;
    dispatch: Dispatch;
    state: RootState;
    curApp: number;
    requestId?: string;
}

export const validateThenDispatch = ({
    response,
    dispatch,
    curApp,
}: validateThenDispatchPayload): void => {

    const { content } = response;
    const routeReasons: string[] = [];
    if (content && Array.isArray(content) && content.length > 0) {
        if (isArrayOfType(content, isOutgoingMessage)) {
            console.log("is_outgoing_response");
            dispatch(setOutgoings(content));
        }
        else if (isArrayOfType(content, isIncomingMessage)) {
            console.log("is_incoming_response");
            dispatch(setIncomings(content));
        }
    } else {
        console.log("is_empty_response");
        const guardName = `has_route_slice_data_${getCurAppName(curApp)}`;
        if (routeReasons.length > 0) logGuardInvalidReasons(guardName, routeReasons, response);
    }


}

const isArrayOfType = <T>(arr: unknown[], typeGuard: (item: unknown) => item is T): arr is T[] => {
    return Array.isArray(arr) && arr.every((item) => typeGuard(item));
};


const isOutgoingMessage = (item: unknown): item is OutgoingMessage => {
    if (typeof item !== 'object' || item === null) return false;
    const o = item as Record<string, unknown>;
    // OutgoingMessage has mailer as undefined (not present), no email, status as object
    return typeof o.status === 'object' &&
        typeof o.mailer === 'undefined' &&
        !('email' in o);
};

const isIncomingMessage = (item: unknown): item is IncomingMessage => {
    if (typeof item !== 'object' || item === null) return false;
    const o = item as Record<string, unknown>;
    // IncomingMessage has mailer as number, no email, status as object
    return typeof o.status === 'object' &&
        typeof o.mailer === 'number' &&
        !('email' in o);
};

const logGuardInvalidReasons = (guardName: string, reasons: string[], response: unknown) => {
    if (reasons.length === 0) return;
    const keys =
        typeof response === 'object' && response !== null
            ? Object.keys(response as Record<string, unknown>).slice(0, 20)
            : [];
    console.log(`${guardName}: invalid`, { reasons, keys });
};


