import { jwtDecode } from "jwt-decode";
import { getCurAppIndex, userroles, timeout, getMoldsResolver, signOut } from "../utils";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { EntityTypeMap, ResultPayload } from "../store/slices/rowSlice";
import { getGraphqlResolver, ToolKit, Tree } from "../utils";
import { clearData as clearReducers } from "../store/slices/rowSlice";
import { UpdateTextsPayload } from "../store/slices/textSlice";
import { DataRow } from "../components/Core/types";
import { enqueueHydrationStoreUpdate } from "../store/middleware/hydrationPayloadBuffer";
import { markHydrationAttemptedSeekIds } from "../store/middleware/hydrationQueue";
import { SessionState } from "../store/slices/sessionSlice";
import {
    CustomJwtPayload,
    AuthPayload,
} from "./types";
import { RootState } from "../store";
import { anonymousFetch, authenticatedFetch, FetchDataPayload } from "./ThunksUtils";
import { QueryParams } from "../store/types";
import { Executedquery, validateThenDispatch } from "./ThunksUtils";
import { getAccountRecords, getAnonymousRecords } from "./ThunksUtils";
import { updateSteps } from "./actions";
import {
    buildEmptyImageHydrationCollapseUpdates,
    partitionImageHydrationRows,
} from "./imageHydrationCollapseUtils";



export const authenticate = createAsyncThunk<Partial<SessionState>, AuthPayload, { rejectValue: string }>(
    'authenticate',
    async (payload: AuthPayload, { rejectWithValue, dispatch }) => {
        const {
            email,
            password,
            seconds = 0,
            selectedRole,
        } = payload;
        const variables = { password, username: email, seconds };
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        try {
            const response = await fetch(ToolKit.accountLoginUrl, {
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(variables),
                method: 'POST',
                signal: controller.signal,
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText);
            }

            let token: string;
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                throw new Error('expected text but got json' + await response.json());
            } else {
                token = await response.text();
            }
            clearTimeout(timeoutId);
            const looksLikeToken = token.indexOf(".") > -1;
            if (looksLikeToken) {
                const { roles, quota, userid, roleIds, sub: username } = jwtDecode<CustomJwtPayload>(token);
                const baseRoleIndex = userroles.findIndex((r: string) => roles.includes(r));
                const roleIndex = roles.findIndex((r: string) => r === userroles[baseRoleIndex]);
                console.log("authenticate_roles", roles);
                dispatch(clearReducers());
                dispatch({ type: signOut() });
                const session = {
                    quota,
                    roles,
                    userid,
                    roleIds,
                    username,
                    roleIndex,
                    curToken: token,
                    fetchRole: roles[roleIndex],
                    mutateRole: roles[roleIndex],
                    authenticated: looksLikeToken,
                    curMailer: roleIds[roleIndex],
                    isIncognito: false,
                    isPrivate: true,
                };
                const fetchRoleIndex = roles.findIndex((r: string) => r === selectedRole);
                if (fetchRoleIndex > -1) {
                    return {
                        ...session,
                        roleIndex: fetchRoleIndex,
                        fetchRole: roles[fetchRoleIndex],
                        mutateRole: roles[fetchRoleIndex],
                    };
                }
                return session;
            } else {
                throw new Error(token);
            }
        } catch (error) {
            clearTimeout(timeoutId);
            if (error instanceof Error && error.name === 'AbortError') {
                return rejectWithValue(`Request timeout: Authentication failed after ${timeout}ms`);
            }
            if (error instanceof Error) {
                return rejectWithValue(error.message);
            }
            return rejectWithValue('An unknown error occurred');
        }
    }
);

export type DehydratedRowsFetchArg = {
    fetcher: () => Promise<ResultPayload>;
    hydrationSeekIds?: number[];
};

export const deHydratedRowsDataFetcher = createAsyncThunk<void, DehydratedRowsFetchArg, { rejectValue: string }>(
    'row/untabledDataFetcher',
    async ({ fetcher, hydrationSeekIds }, { rejectWithValue }) => {
        try {
            const { payload: data, parent: fromEntity, entity: toEntity, isAppend, keywords } = await fetcher();
            const { graphqlResolver, to, from } = getGraphqlResolver(fromEntity ?? '', toEntity ?? '');
            const corData = data['records'][graphqlResolver];
            enqueueHydrationStoreUpdate({
                rows: {
                    entity: toEntity as keyof EntityTypeMap,
                    payload: corData[to.toLowerCase()],
                    parent: fromEntity,
                    keywords,
                    isAppend,
                },
                metadata: {
                    dest: to,
                    orig: from,
                    data: corData[from],
                    interaction: true,
                },
            });
        }
        catch (error) {
            if (error instanceof Error)
                return rejectWithValue(error.message);
            return rejectWithValue('An unknown error occurred');
        }
        finally {
            if (hydrationSeekIds?.length) {
                markHydrationAttemptedSeekIds(hydrationSeekIds);
            }
        }
    }
);


export type BytesFetcherArg = { query: QueryParams };

const bytesFetcherSeekIds = (seek: QueryParams['seek']): number[] => {
    if (seek == null) return [];
    if (Array.isArray(seek)) {
        return seek.map((id) => Number(id)).filter((id) => Number.isFinite(id));
    }
    const n = Number(seek);
    return Number.isFinite(n) ? [n] : [];
};

export const bytesFetcher = createAsyncThunk<UpdateTextsPayload[], BytesFetcherArg, { rejectValue: string; state: RootState }>(
    'row/bytesFetcher',
    async ({ query }, { rejectWithValue, getState, dispatch }) => {
        const seekIds = bytesFetcherSeekIds(query.seek);
        const collapseMisses = (ids: number[]) => {
            if (!ids.length) return;
            const collapseUpdates = buildEmptyImageHydrationCollapseUpdates(ids, getState());
            if (collapseUpdates.length > 0) {
                // Videos has no mediaHydration action — collapse via updateSteps with
                // { id, imageurl } only (no edited/modified) so slots are not dirty-saved.
                dispatch(updateSteps(collapseUpdates));
            }
        };

        try {
            const { isIncognito } = getState().session;
            const { payload: data, parent: fromEntity, entity: toEntity, } = isIncognito
                ? await anonymousFetch(query)
                : await authenticatedFetch(query);
            const { graphqlResolver, from, to } = getGraphqlResolver(fromEntity ?? '', toEntity ?? '');
            const { to: moldsTo } = getMoldsResolver(from, to);
            const corData = data['records'][graphqlResolver];
            const entity = toEntity as keyof EntityTypeMap;
            const dataFormatter = Tree.getProperty(entity, "formattedData") as
                | ((payload: DataRow[]) => { texts?: UpdateTextsPayload[] })
                | undefined;
            const rawRows = corData[moldsTo.toLowerCase()];
            const rowsPayload: DataRow[] = Array.isArray(rawRows) ? rawRows : [];

            // Only forward rows with real media; collapse empty misses to bare sentinels
            // so mime-only slots are not re-queued forever by the chunk buffer chain.
            if (seekIds.length > 0) {
                const { hydratedRows, collapseSeekIds } = partitionImageHydrationRows(
                    seekIds,
                    rowsPayload,
                );
                collapseMisses(collapseSeekIds);
                return dataFormatter?.(hydratedRows)?.texts ?? [];
            }

            return dataFormatter?.(rowsPayload)?.texts ?? [];
        } catch (error) {
            collapseMisses(seekIds);
            if (error instanceof Error)
                return rejectWithValue(error.message);
            return rejectWithValue('An unknown error occurred');
        }
    }
);



export const fetchData = createAsyncThunk<
    Record<string, Executedquery>,
    FetchDataPayload,
    { rejectValue: string }
>(
    'fetchData',
    async (payload: FetchDataPayload, { rejectWithValue, getState, dispatch, requestId }) => {
        const state = getState() as RootState;
        const { convolution, search, webapp, requestTake: payloadTake, queriesOverride } = payload;
        const {
            isUnzipCourses,
            isUnzipTutorials,
            isUnzipQuizzes,
        } = state.settings;
        const {
            curApp,
            curToken,
            isPrivate,
            fetchRole,
            isIncognito,
            defaultTake,
            curMailer: mailer,
        } = state.session;
        const args = {
            curApp,
            isUnzipCourses,
            isUnzipTutorials,
            isUnzipQuizzes,
            convolution,
            webapp,
        };
        const [unzippedApp, unzippedAppName, unzippedAppConvolution] = getUnzippedApp(args);
        try {
            const isAccount = !isIncognito && curToken;
            const requestTake = payloadTake ?? defaultTake;
            const params = isAccount
                ? {
                    state,
                    search,
                    mailer,
                    curToken,
                    isPrivate,
                    fetchRole,
                    counts: {} ,
                    curApp: unzippedApp,
                    executedQueries:  {} ,
                    requestTake,
                    queriesOverride,
                    convolution: unzippedAppName,
                    formatter: unzippedAppConvolution,
                    path: ToolKit.authenticatedRecordsUrl,
                }
                : {
                    state,
                    search,
                    curApp: unzippedApp,
                    requestTake,
                    queriesOverride,
                    convolution: unzippedAppName,
                    formatter: unzippedAppConvolution,
                    counts: {} ,
                    executedQueries:  {} ,
                    path: ToolKit.anonymousRecordsUrl,
                };

            console.log("recordsHook_fired");
            const content = isAccount
                ? await getAccountRecords(params)
                : await getAnonymousRecords(params);
            const { executedQueries: query, ...fetchedData } = content ?? { counts: {} };
            validateThenDispatch({
                response: fetchedData,
                curApp: unzippedApp,
                dispatch,
                query,
                state,
                requestId,
            });
            console.log(content);
            return query || {};
        } catch (error) {
            if (error instanceof Error) return rejectWithValue(error.message);
            return rejectWithValue('An unknown error occurred while fetching data');
        }
    }
);



type UnzipFetchArgs = {
    curApp: number;
    webapp: string;
    convolution: string;
    isUnzipCourses: boolean;
    isUnzipQuizzes: boolean;
    isUnzipTutorials: boolean;
};

let curskip = 0;
export const getCurSkip = () => curskip;

export const setCurPage = (_page: number) => { };
const getUnzippedApp = (args: UnzipFetchArgs): [number, string, string] => {
    const {
        curApp,
        webapp,
        convolution,
        isUnzipCourses,
        isUnzipTutorials,
        isUnzipQuizzes,
    } = args;
    const _webapp = webapp.toLowerCase();
    const remapToSession =
        _webapp === 'session'
        || (_webapp === 'tutorial' && isUnzipTutorials)
        || (_webapp === 'course' && isUnzipCourses)
        || (_webapp === 'quiz' && isUnzipQuizzes);
    if (remapToSession) {
        const [index] = getCurAppIndex('session');
        return [parseInt(index ?? '7'), 'session', 'session'];
    }
    return [curApp, webapp, convolution];
}