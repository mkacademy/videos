import { jwtDecode } from "jwt-decode";
import { getCurAppIndex, userroles, timeout, getMoldsResolver } from "../utils";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { EntityTypeMap, ResultPayload } from "../store/slices/rowSlice";
import { getGraphqlResolver, ToolKit, RECORDS, Tree } from "../utils";
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
            const corData = data[RECORDS][graphqlResolver];
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

export const bytesFetcher = createAsyncThunk<UpdateTextsPayload[], BytesFetcherArg, { rejectValue: string; state: RootState }>(
    'row/bytesFetcher',
    async ({ query }, { rejectWithValue, getState }) => {
        try {
            const { isIncognito } = getState().session;
            const { payload: data, parent: fromEntity, entity: toEntity, } = isIncognito
                ? await anonymousFetch(query)
                : await authenticatedFetch(query);
            const { graphqlResolver, from, to } = getGraphqlResolver(fromEntity ?? '', toEntity ?? '');
            const { to: moldsTo } = getMoldsResolver(from, to);
            const corData = data[RECORDS][graphqlResolver];
            const entity = toEntity as keyof EntityTypeMap;
            const dataFormatter = Tree.getProperty(entity, "formattedData") as
                | ((payload: DataRow[]) => { texts?: UpdateTextsPayload[] })
                | undefined;
            return dataFormatter?.(corData[moldsTo.toLowerCase()])?.texts ?? [];
        } catch (error) {
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
        const { convolution, search, webapp } = payload;
        const {
            isUnzipCourses,
            isUnzipTutorials,
            isUnzipQuizzes,
            unzipCoursesType,
            unzipTutorialsType,
            unzipQuizzesType,
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
            unzipCoursesType,
            unzipTutorialsType,
            unzipQuizzesType,
            convolution,
            webapp,
            search,
        };
        const [unzippedApp, unzippedAppName, unzippedAppConvolution] = getUnzippedApp(args);
        try {
            const isAccount = !isIncognito && curToken;
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
                    requestTake: defaultTake,
                    convolution: unzippedAppName,
                    formatter: unzippedAppConvolution,
                    path: ToolKit.authenticatedRecordsUrl,
                }
                : {
                    state,
                    search,
                    curApp: unzippedApp,
                    requestTake: defaultTake,
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
    search: string;
    convolution: string;
    isUnzipCourses: boolean;
    isUnzipQuizzes: boolean;
    isUnzipTutorials: boolean;
    unzipCoursesType: string;
    unzipTutorialsType: string;
    unzipQuizzesType: string;
};

let curskip = 0;
export const getCurSkip = () => curskip;


let curPage = 0;
export const setCurPage = (page: number) => (curPage = page);
const getUnzippedApp = (args: UnzipFetchArgs): [number, string, string] => {
    const {
        curApp,
        webapp,
        convolution,
        isUnzipCourses,
        isUnzipTutorials,
        isUnzipQuizzes,
        unzipCoursesType,
        unzipTutorialsType,
        unzipQuizzesType,
    } = args;
    const _webapp = webapp.toLowerCase();
    switch (_webapp) {

        case 'course': {
            if (isUnzipCourses && unzipCoursesType === "incoming_and_outgoing") {
                const _app = curPage % 2 === 0 ? (curPage++, "outgoing") : (curPage++, "incoming");
                const [index, _] = getCurAppIndex(_app)
                const _a = index ?? curApp.toString();
                return [parseInt(_a), _app, _app];
            }
            if (isUnzipCourses && unzipCoursesType === "incoming") {
                curPage++;
                const _app = "incoming";
                const [index, _] = getCurAppIndex(_app)
                const _a = index ?? curApp.toString();
                return [parseInt(_a), _app, _app];
            }
            if (isUnzipCourses && unzipCoursesType === "outgoing") {
                curPage++;
                const _app = "outgoing";
                const [index, _] = getCurAppIndex(_app)
                const _a = index ?? curApp.toString();
                return [parseInt(_a), _app, _app];
            }
            return [curApp, webapp, convolution];
        }
        case 'tutorial': {
            if (isUnzipTutorials && unzipTutorialsType === "incoming_and_outgoing") {
                const _app = curPage % 2 === 0 ? (curPage++, "outgoing") : (curPage++, "incoming");
                const [index, _] = getCurAppIndex(_app)
                const _a = index ?? curApp.toString();
                return [parseInt(_a), _app, _app];
            }
            if (isUnzipTutorials && unzipTutorialsType === "incoming") {
                curPage++;
                const _app = "incoming";
                const [index, _] = getCurAppIndex(_app)
                const _a = index ?? curApp.toString();
                return [parseInt(_a), _app, _app];
            }
            if (isUnzipTutorials && unzipTutorialsType === "outgoing") {
                curPage++;
                const _app = "outgoing";
                const [index, _] = getCurAppIndex(_app)
                const _a = index ?? curApp.toString();
                return [parseInt(_a), _app, _app];
            }
            return [curApp, webapp, convolution];
        }
        case 'quiz': {
            if (isUnzipQuizzes && unzipQuizzesType === "incoming_and_outgoing") {
                const _app = curPage % 2 === 0 ? (curPage++, "outgoing") : (curPage++, "incoming");
                const [index, _] = getCurAppIndex(_app)
                const _a = index ?? curApp.toString();
                return [parseInt(_a), _app, _app];
            }
            if (isUnzipQuizzes && unzipQuizzesType === "incoming") {
                curPage++;
                const _app = "incoming";
                const [index, _] = getCurAppIndex(_app)
                const _a = index ?? curApp.toString();
                return [parseInt(_a), _app, _app];
            }
            if (isUnzipQuizzes && unzipQuizzesType === "outgoing") {
                curPage++;
                const _app = "outgoing";
                const [index, _] = getCurAppIndex(_app)
                const _a = index ?? curApp.toString();
                return [parseInt(_a), _app, _app];
            }
            return [curApp, webapp, convolution];
        }
        default:
            return [curApp, webapp, convolution];
    }
}