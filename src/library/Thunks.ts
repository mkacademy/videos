import { jwtDecode } from "jwt-decode";
import { getCurAppIndex, getSimplePageIndexFromSearch, signOut, userroles, timeout, getMoldsResolver, getConvSearch } from "../utils";
import { createAsyncThunk, type GetThunkAPI } from "@reduxjs/toolkit";
import { EntityTypeMap, ResultPayload } from "../store/slices/rowSlice";
import { clearEscrow, viewRequestSkeletons } from "../store/slices/viewSlice";
import { getGraphqlResolver, redirectUrl, ToolKit, RECORDS, UPDATE_ROWS, Tree } from "../utils";
import {
    saveCourseEditsPayload,
    saveOutgoingEditsPayload,
    saveQuizEditsPayload,
    saveTutorialEditsPayload,
    FETCH_SKELETONS_THUNK_TYPE,
} from "./actions";
import { appendRows, clearData as clearReducers } from "../store/slices/rowSlice";
import { UpdateTextsPayload } from "../store/slices/textSlice";
import { DataRow } from "../components/Core/types";
import {
    insertMetadata,
    mutateIncomingPayload,
    saveTutorsEditsPayload,
} from "./actions";
import {
    CourseThunkPayload,
    IncomingThunkPayload,
    OutgoingThunkPayload,
    PennantThunkPayload,
    QuestionThunkPayload,
    QuizThunkPayload,
    TutorsThunkPayload,
    TutorialThunkPayload
} from "../store/middleware/ContentExtractorJKL";
import { MutationDataAccumulator } from "../Hooks/useSaveMutations";
import { accountCreated, AccountResult } from "../store/slices/settingsSlice";
import { fetchedHandles, Handler } from "../store/slices/errorSlice";
import { enqueueHydrationStoreUpdate } from "../store/middleware/hydrationPayloadBuffer";
import { markHydrationAttemptedSeekIds } from "../store/middleware/hydrationQueue";
import { SlideGroup, SlideItem } from "../store/slices/courseSlice";
import { Banner } from "../store/slices/courseSlice";
import { Quiz } from "../store/slices/quizSlice";
import { InitializedLoadingPayload } from "../store/slices/sessionSlice";
import { IncomingMessage, OutgoingMessage, Tutor } from "../store/slices/commsSlice";
import { Banner as TutorialBanner, Content as TutorialContent } from "../store/slices/tutorialSlice";
import {
    CustomJwtPayload,
    AuthPayload,
    FormData,
    VerifyFormData,
    MutateVisibilityPayload,
    sendPackagePayload,
    MutateEntitiesResponse
} from "./types";
import { RootState } from "../store";
import { anonymousFetch, authenticatedFetch, FetchDataPayload, validatedSkeletonsResponse, validateSkeletonsThenDispatch } from "./ThunksUtils";
import { QueryParams } from "../store/middleware/ViewManagerSTU";
import { Executedquery, validateThenDispatch, buildRecordStateProps, extractIDsAtRequest } from "./ThunksUtils";
import { getAccountRecords, getAnonymousRecords } from "./ThunksUtils";
import { clearIDsAtRequest, registerIDsAtRequest } from "../store/slices/statsSlice";
import {
    quizFormatter as offlineQuizFormatter,
    courseFormatter as offlineCourseFormatter,
    questionFormatter as offlineQuestionFormatter,
    pennantFormatter as offlinePennantFormatter,
    outgoingFormatter as offlineOutgoingFormatter,
    incomingFormatter as offlineIncomingFormatter,
    tutorsFormatter as offlineTutorsFormatter,
    tutorialFormatter as offlineTutorialFormatter,
} from "../offlineFormatters/service/FormatService";

type FormatterThunkApi = GetThunkAPI<{ rejectValue: string }>;
type FormatterReject = ReturnType<FormatterThunkApi['rejectWithValue']>;

function rejectFormatterError(
    rejectWithValue: FormatterThunkApi['rejectWithValue'],
    error: unknown,
): FormatterReject {
    if (error instanceof Error) return rejectWithValue(error.message);
    return rejectWithValue('An unknown error occurred');
}

async function postFormatterJson<T>(
    formatterLabel: string,
    url: string,
    variables: Record<string, unknown>,
    rejectWithValue: FormatterThunkApi['rejectWithValue'],
): Promise<T | FormatterReject> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(url, {
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(variables),
            method: 'POST',
            signal: controller.signal,
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText);
        }
        clearTimeout(timeoutId);
        return await response.json() as T;
    } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === 'AbortError') {
            return rejectWithValue(`Request timeout: ${formatterLabel} formatter failed after ${timeout}ms`);
        }
        return rejectFormatterError(rejectWithValue, error);
    }
}

export const authenticate = createAsyncThunk<InitializedLoadingPayload, AuthPayload, { rejectValue: string }>(
    'authenticate',
    async (payload: AuthPayload, { rejectWithValue, dispatch, getState }) => {
        const state = getState() as RootState;
        const { pauseFetchers } = state.session;
        const {
            email,
            password,
            seconds = 0,
            ingredients,
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
                dispatch(clearEscrow());
                dispatch({ type: signOut(pauseFetchers) });
                redirectUrl(ingredients);
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

export const registration = createAsyncThunk<InitializedLoadingPayload, FormData, { rejectValue: string }>(
    'registration',
    async (payload: FormData, { rejectWithValue, dispatch, getState }) => {
        const state = getState() as RootState;
        const { pauseFetchers } = state.session;
        const {
            email_txb,
            oldpassword_txb,
            newpassword_txb,
            username_txb,
            attempts,
        } = payload;
        const variables = {
            username: username_txb,
            oldPassword: oldpassword_txb,
            newPassword: newpassword_txb,
            email: email_txb,
        };
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        try {
            const response = await fetch(ToolKit.accountRegistrationUrl, {
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
            setTimeout(() => dispatch(accountCreated({ success: looksLikeToken, attempts: (attempts ?? 0) + 1 })));
            if (looksLikeToken) {
                const { roles, quota, userid, roleIds, sub: username } = jwtDecode<CustomJwtPayload>(token);
                const baseRoleIndex = userroles.findIndex((r: string) => roles.includes(r));
                const roleIndex = roles.findIndex((r: string) => r === userroles[baseRoleIndex]);
                dispatch(clearEscrow());
                dispatch(clearReducers());
                dispatch({ type: signOut(pauseFetchers) });
                const session = {
                    quota,
                    roles,
                    userid,
                    roleIds,
                    username,
                    roleIndex,
                    curToken: token,
                    isIncognito: false,
                    isPrivate: true,
                    fetchRole: roles[roleIndex],
                    mutateRole: roles[roleIndex],
                    authenticated: looksLikeToken,
                    curMailer: roleIds[roleIndex],
                };
                return session;
            } else {
                throw new Error(token);
            }
        } catch (error) {
            clearTimeout(timeoutId);
            if (error instanceof Error && error.name === 'AbortError') {
                return rejectWithValue(`Request timeout: Registration failed after ${timeout}ms`);
            }
            if (error instanceof Error) {
                return rejectWithValue(error.message);
            }
            return rejectWithValue('An unknown error occurred');
        }
    }
);

export const amendment = createAsyncThunk<AccountResult, FormData, { rejectValue: string }>(
    'amendment',
    async (payload: FormData, { rejectWithValue, dispatch, getState }) => {
        const state = getState() as RootState;
        const { pauseFetchers } = state.session;
        const {
            oldpassword_txb,
            newpassword_txb,
            username_txb,
            mutateRole,
            email_txb,
            curToken,
            attempts,
        } = payload;
        const variables = {
            curToken,
            mutateRole,
            seconds: 0,
            email: email_txb,
            username: username_txb,
            newPassword: newpassword_txb,
            oldPassword: oldpassword_txb,
        };
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        try {
            const response = await fetch(ToolKit.accountUpdaterUrl, {
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(variables),
                method: 'POST',
                signal: controller.signal,
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText);
            }
            let success: boolean;
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/text')) {
                throw new Error('expected json but got text' + await response.text());
            } else {
                const data = await response.json();
                success = Boolean(data);
            }
            clearTimeout(timeoutId);
            if (success) setTimeout(() => {
                dispatch(clearEscrow());
                dispatch(clearReducers());
                dispatch({ type: signOut(pauseFetchers) });
            }, 100);
            return { success: success, attempts: (attempts ?? 0) + 1 };
        } catch (error) {
            clearTimeout(timeoutId);
            if (error instanceof Error && error.name === 'AbortError') {
                return rejectWithValue(`Request timeout: Account update failed after ${timeout}ms`);
            }
            if (error instanceof Error) {
                return rejectWithValue(error.message);
            }
            return rejectWithValue('An unknown error occurred');
        }
    }
);

export const verification = createAsyncThunk<AccountResult, VerifyFormData, { rejectValue: string }>(
    'verification',
    async (payload: VerifyFormData, { rejectWithValue }) => {
        const {
            verificationcode_txb,
            attempts,
        } = payload;
        const variables = {
            verificationCode: verificationcode_txb,
        };
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        try {
            const response = await fetch(ToolKit.accountVerifierUrl, {
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(variables),
                method: 'POST',
                signal: controller.signal,
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText);
            }

            let success: boolean;
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/text')) {
                throw new Error('expected json but got text' + await response.text());
            } else {
                const data = await response.json();
                success = Boolean(data);
            }
            clearTimeout(timeoutId);
            return { success: success, attempts: (attempts ?? 0) + 1 };
        } catch (error) {
            clearTimeout(timeoutId);
            if (error instanceof Error && error.name === 'AbortError') {
                return rejectWithValue(`Request timeout: Verification failed after ${timeout}ms`);
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
                handles: corData[RECORDS],
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


export type TabledFetcherArg = { query: QueryParams };

export const tabledFetcher = createAsyncThunk<void, TabledFetcherArg, { rejectValue: string; state: RootState }>(
    'row/tabledFetcher',
    async ({ query }, { rejectWithValue, dispatch, getState }) => {
        try {
            const { isIncognito } = getState().session;
            const { payload: data, parent: fromEntity, entity: toEntity, isAppend, keywords } = isIncognito
                ? await anonymousFetch(query)
                : await authenticatedFetch(query);
            const { graphqlResolver, from, to } = getGraphqlResolver(fromEntity ?? '', toEntity ?? '');
            const { from: moldsFrom, to: moldsTo } = getMoldsResolver(from, to);
            const corData = data[RECORDS][graphqlResolver];
            dispatch(appendRows({
                entity: toEntity as keyof EntityTypeMap,
                payload: corData[moldsTo.toLowerCase()],
                parent: fromEntity,
                keywords,
                isAppend,
            }));
            setTimeout(() =>
                dispatch(insertMetadata({
                    dest: to,
                    orig: from,
                    data: corData[moldsFrom],
                    interaction: true,
                }))
            );
            if (corData[RECORDS])
                setTimeout(() => dispatch(fetchedHandles(corData[RECORDS])));
        } catch (error) {
            if (error instanceof Error)
                return rejectWithValue(error.message);
            return rejectWithValue('An unknown error occurred');
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
            const links = Tree.getProperty(entity, "connections") as string[];
            const dataFormatter = Tree.getProperty(entity, "formattedData") as
                | ((payload: DataRow[], links: string[]) => { texts?: UpdateTextsPayload[] })
                | undefined;
            return dataFormatter?.(corData[moldsTo.toLowerCase()], links ?? [])?.texts ?? [];
        } catch (error) {
            if (error instanceof Error)
                return rejectWithValue(error.message);
            return rejectWithValue('An unknown error occurred');
        }
    }
);





export const mutateVisibility = createAsyncThunk<string, MutateVisibilityPayload, { rejectValue: string }>(
    'mutateVisibility',
    async (payload: MutateVisibilityPayload, { rejectWithValue }) => {
        const { curToken, mutateRole, quota, curMailer, target, entity, resolvers, [UPDATE_ROWS]: { childIds, parentIds, visibility } } = payload;
        const variables = { curToken, mutateRole, quota, curMailer, target, entity, resolvers, [UPDATE_ROWS]: { childIds, parentIds, visibility } };
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        try {
            const response = await fetch(ToolKit.mutateVisibilityUrl, {
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(variables),
                method: 'POST',
                signal: controller.signal,
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText);
            }
            const text = await response.json();
            clearTimeout(timeoutId);

            return text;
        } catch (error) {
            clearTimeout(timeoutId);

            if (error instanceof Error && error.name === 'AbortError') {
                return rejectWithValue(`Request timeout: Mutate visibility failed after ${timeout}ms`);
            }
            if (error instanceof Error)
                return rejectWithValue(error.message);
            return rejectWithValue('An unknown error occurred');
        }
    }
);




export const sendPackage = createAsyncThunk<MutateEntitiesResponse[], sendPackagePayload, { rejectValue: string }>(
    'sendPackage',
    async (payload: sendPackagePayload, { rejectWithValue }) => {
        const { resolvers, unlocked, quota, webapp, curToken, mutateRole, curMailer, foundations, formatter } = payload;
        const variables = { resolvers, unlocked, quota, webapp, curToken, mutateRole, curMailer, foundations, formatter };
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        try {
            const response = await fetch(ToolKit.sendPackageUrl, {
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(variables),
                method: 'POST',
                signal: controller.signal,
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText);
            }
            const data = await response.json();
            clearTimeout(timeoutId);
            return data;
        } catch (error) {
            clearTimeout(timeoutId);
            if (error instanceof Error && error.name === 'AbortError') {
                return rejectWithValue(`Request timeout: Send package failed after ${timeout}ms`);
            }
            if (error instanceof Error)
                return rejectWithValue(error.message);
            return rejectWithValue('An unknown error occurred');
        }
    }
);


export const mutateIncoming = createAsyncThunk<MutateEntitiesResponse[], mutateIncomingPayload, { rejectValue: string }>(
    'mutateIncoming',
    async (payload: mutateIncomingPayload, { rejectWithValue }) => {
        const { curToken, mutateRole, curMailer, updates, deleted, added, formatter, quota, ordinals } = payload;
        const variables = { curToken, mutateRole, curMailer, updates, deleted, added, formatter, quota, ordinals };
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        try {
            const response = await fetch(ToolKit.mutateIncomingUrl, {
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(variables),
                method: 'POST',
                signal: controller.signal,
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText);
            }
            const text = await response.json();
            clearTimeout(timeoutId);
            return text;
        } catch (error) {
            clearTimeout(timeoutId);
            if (error instanceof Error && error.name === 'AbortError') {
                return rejectWithValue(`Request timeout: Mutate incoming failed after ${timeout}ms`);
            }
            if (error instanceof Error)
                return rejectWithValue(error.message);
            return rejectWithValue('An unknown error occurred');
        }
    }
);

export const mutateTutors = createAsyncThunk<MutateEntitiesResponse[], saveTutorsEditsPayload, { rejectValue: string }>(
    'mutateTutors',
    async (payload: saveTutorsEditsPayload, { rejectWithValue }) => {
        const { curToken, mutateRole, curMailer, updates, deleted, added, formatter, quota, ordinals } = payload;
        const variables = { curToken, mutateRole, curMailer, updates, deleted, added, formatter, quota, ordinals };
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        try {
            const response = await fetch(ToolKit.mutateTutorsUrl, {
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(variables),
                method: 'POST',
                signal: controller.signal,
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText);
            }
            const text = await response.json();
            clearTimeout(timeoutId);
            return text;
        } catch (error) {
            clearTimeout(timeoutId);
            if (error instanceof Error && error.name === 'AbortError') {
                return rejectWithValue(`Request timeout: Mutate tutors failed after ${timeout}ms`);
            }
            if (error instanceof Error)
                return rejectWithValue(error.message);
            return rejectWithValue('An unknown error occurred');
        }
    }
);

export const mutateOutgoing = createAsyncThunk<MutateEntitiesResponse[], saveOutgoingEditsPayload, { rejectValue: string }>(
    'mutateOutgoing',
    async (payload: saveOutgoingEditsPayload, { rejectWithValue }) => {
        const { curToken, mutateRole, curMailer, updates, deleted, added, inserted, formatter, sent, quota, ordinals } = payload;
        const variables = { curToken, mutateRole, curMailer, updates, deleted, added, inserted, formatter, sent, quota, ordinals };
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        try {
            const response = await fetch(ToolKit.mutateOutgoingUrl, {
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(variables),
                method: 'POST',
                signal: controller.signal,
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText);
            }
            const text = await response.json();
            clearTimeout(timeoutId);
            return text;
        } catch (error) {
            clearTimeout(timeoutId);
            if (error instanceof Error && error.name === 'AbortError') {
                return rejectWithValue(`Request timeout: Mutate outgoing failed after ${timeout}ms`);
            }
            if (error instanceof Error)
                return rejectWithValue(error.message);
            return rejectWithValue('An unknown error occurred');
        }
    }
);

export const mutateTutorial = createAsyncThunk<MutateEntitiesResponse[], saveTutorialEditsPayload, { rejectValue: string }>(
    'mutateTutorial',
    async (payload: saveTutorialEditsPayload, { rejectWithValue }) => {
        const { curToken, mutateRole, curMailer, quota, updates, deleted, added, inserted, formatter, ordinals } = payload;
        const variables = { curToken, mutateRole, curMailer, quota, updates, deleted, added, inserted, formatter, ordinals };
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        try {
            const response = await fetch(ToolKit.mutateTutorialUrl, {
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(variables),
                method: 'POST',
                signal: controller.signal,
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText);
            }
            const text = await response.json();
            clearTimeout(timeoutId);
            return text;
        } catch (error) {
            clearTimeout(timeoutId);
            if (error instanceof Error && error.name === 'AbortError') {
                return rejectWithValue(`Request timeout: Mutate tutorial failed after ${timeout}ms`);
            }
            if (error instanceof Error)
                return rejectWithValue(error.message);
            return rejectWithValue('An unknown error occurred');
        }
    }
);

export const mutateQuiz = createAsyncThunk<MutateEntitiesResponse[], saveQuizEditsPayload, { rejectValue: string }>(
    'mutateQuiz',
    async (payload: saveQuizEditsPayload, { rejectWithValue }) => {
        const { curToken, curMailer, updates, deleted, added, inserted, formatter, mutateRole, quota, ordinals } = payload;
        const variables = { curToken, curMailer, updates, deleted, added, inserted, formatter, mutateRole, quota, ordinals };
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        try {
            const response = await fetch(ToolKit.mutateQuizUrl, {
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(variables),
                method: 'POST',
                signal: controller.signal,
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText);
            }
            const text = await response.json();
            clearTimeout(timeoutId);
            return text;
        } catch (error) {
            clearTimeout(timeoutId);
            if (error instanceof Error && error.name === 'AbortError') {
                return rejectWithValue(`Request timeout: Mutate quiz failed after ${timeout}ms`);
            }
            if (error instanceof Error)
                return rejectWithValue(error.message);
            return rejectWithValue('An unknown error occurred');
        }
    }
);

export const mutateCourse = createAsyncThunk<MutateEntitiesResponse[], saveCourseEditsPayload, { rejectValue: string }>(
    'mutateCourse',
    async (payload: saveCourseEditsPayload, { rejectWithValue }) => {
        const { curToken, mutateRole, curMailer, updates, deleted, added, inserted, formatter, quota, ordinals } = payload;
        const variables = { curToken, mutateRole, curMailer, updates, deleted, added, inserted, formatter, quota, ordinals };
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        try {
            const response = await fetch(ToolKit.mutateCourseUrl, {
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(variables),
                method: 'POST',
                signal: controller.signal,
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText);
            }
            const text = await response.json();
            clearTimeout(timeoutId);
            return text;
        } catch (error) {
            clearTimeout(timeoutId);
            if (error instanceof Error && error.name === 'AbortError') {
                return rejectWithValue(`Request timeout: Mutate course failed after ${timeout}ms`);
            }
            if (error instanceof Error)
                return rejectWithValue(error.message);
            return rejectWithValue('An unknown error occurred');
        }
    }
);

export const mutateEntity = createAsyncThunk<MutateEntitiesResponse[], MutationDataAccumulator, { rejectValue: string }>(
    'mutateEntity',
    async (payload: MutationDataAccumulator, { rejectWithValue }) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        try {
            const response = await fetch(ToolKit.mutateEntityUrl, {
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                method: 'POST',
                signal: controller.signal,
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText);
            }
            clearTimeout(timeoutId);
            const data = await response.json();
            return data;
        } catch (error) {
            clearTimeout(timeoutId);
            if (error instanceof Error && error.name === 'AbortError') {
                return rejectWithValue(`Request timeout: Mutate entity failed after ${timeout}ms`);
            }
            if (error instanceof Error)
                return rejectWithValue(error.message);
            return rejectWithValue('An unknown error occurred');
        }
    }
);

export const QuizFormatter = createAsyncThunk<{ quizzes: Quiz[] }, QuizThunkPayload, { rejectValue: string }>(
    'QuizFormatter',
    async (payload: QuizThunkPayload, { rejectWithValue, getState }): Promise<{ quizzes: Quiz[] } | FormatterReject> => {
        const { content } = payload;
        if ((getState() as RootState).session.offlineFormatter) {
            try {
                return offlineQuizFormatter({ content }) as { quizzes: Quiz[] };
            } catch (error) {
                return rejectFormatterError(rejectWithValue, error);
            }
        }
        return postFormatterJson<{ quizzes: Quiz[] }>('Quiz', ToolKit.quizFormatterUrl, { content }, rejectWithValue);
    }
);

export const CourseFormatter = createAsyncThunk<
    { banners: Banner[]; content: SlideGroup[] },
    CourseThunkPayload, { rejectValue: string }>(
        'CourseFormatter',
        async (payload: CourseThunkPayload, { rejectWithValue, getState }): Promise<{ banners: Banner[]; content: SlideGroup[] } | FormatterReject> => {
            const { content } = payload;
            if ((getState() as RootState).session.offlineFormatter) {
                try {
                    return offlineCourseFormatter({ content }) as { banners: Banner[]; content: SlideGroup[] };
                } catch (error) {
                    return rejectFormatterError(rejectWithValue, error);
                }
            }
            return postFormatterJson<{ banners: Banner[]; content: SlideGroup[] }>('Course', ToolKit.courseFormatterUrl, { content }, rejectWithValue);
        }
    );

export const QuestionFormatter = createAsyncThunk<
    { banners: Banner[], handlers: Record<string, Handler[]> },
    QuestionThunkPayload, { rejectValue: string }>(
        'QuestionFormatter',
        async (payload: QuestionThunkPayload, { rejectWithValue, getState }): Promise<{ banners: Banner[]; handlers: Record<string, Handler[]> } | FormatterReject> => {
            const { content } = payload;
            if ((getState() as RootState).session.offlineFormatter) {
                try {
                    return offlineQuestionFormatter({ content }) as { banners: Banner[]; handlers: Record<string, Handler[]> };
                } catch (error) {
                    return rejectFormatterError(rejectWithValue, error);
                }
            }
            return postFormatterJson<{ banners: Banner[]; handlers: Record<string, Handler[]> }>('Question', ToolKit.questionFormatterUrl, { content }, rejectWithValue);
        }
    );
export const PennantFormatter = createAsyncThunk<
    { banners: Banner[]; content: SlideItem[][] },
    PennantThunkPayload, { rejectValue: string }>(
        'PennantFormatter',
        async (payload: PennantThunkPayload, { rejectWithValue, getState }): Promise<{ banners: Banner[]; content: SlideItem[][] } | FormatterReject> => {
            const { content } = payload;
            if ((getState() as RootState).session.offlineFormatter) {
                try {
                    return offlinePennantFormatter({ content }) as { banners: Banner[]; content: SlideItem[][] };
                } catch (error) {
                    return rejectFormatterError(rejectWithValue, error);
                }
            }
            return postFormatterJson<{ banners: Banner[]; content: SlideItem[][] }>('Pennant', ToolKit.pennantFormatterUrl, { content }, rejectWithValue);
        }
    );
export const OutgoingFormatter = createAsyncThunk<
    { content: OutgoingMessage[], handlers: Record<string, Handler[]> },
    OutgoingThunkPayload, { rejectValue: string }>(
        'OutgoingFormatter',
        async (payload: OutgoingThunkPayload, { rejectWithValue, getState }): Promise<{ content: OutgoingMessage[]; handlers: Record<string, Handler[]> } | FormatterReject> => {
            const { content } = payload;
            if ((getState() as RootState).session.offlineFormatter) {
                try {
                    return offlineOutgoingFormatter({ content }) as { content: OutgoingMessage[]; handlers: Record<string, Handler[]> };
                } catch (error) {
                    return rejectFormatterError(rejectWithValue, error);
                }
            }
            return postFormatterJson<{ content: OutgoingMessage[]; handlers: Record<string, Handler[]> }>('Outgoing', ToolKit.outgoingFormatterUrl, { content }, rejectWithValue);
        }
    );
export const IncomingFormatter = createAsyncThunk<
    { content: IncomingMessage[] },
    IncomingThunkPayload, { rejectValue: string }>(
        'IncomingFormatter',
        async (payload: IncomingThunkPayload, { rejectWithValue, getState }): Promise<{ content: IncomingMessage[] } | FormatterReject> => {
            const { content, mailer } = payload;
            if ((getState() as RootState).session.offlineFormatter) {
                try {
                    return offlineIncomingFormatter({ content, mailer }) as { content: IncomingMessage[] };
                } catch (error) {
                    return rejectFormatterError(rejectWithValue, error);
                }
            }
            return postFormatterJson<{ content: IncomingMessage[] }>('Incoming', ToolKit.incomingFormatterUrl, { content, mailer }, rejectWithValue);
        }
    );
export const TutorsFormatter = createAsyncThunk<
    { content: Tutor[] },
    TutorsThunkPayload, { rejectValue: string }>(
        'TutorsFormatter',
        async (payload: TutorsThunkPayload, { rejectWithValue, getState }): Promise<{ content: Tutor[] } | FormatterReject> => {
            const { content } = payload;
            if ((getState() as RootState).session.offlineFormatter) {
                try {
                    return offlineTutorsFormatter({ content }) as { content: Tutor[] };
                } catch (error) {
                    return rejectFormatterError(rejectWithValue, error);
                }
            }
            return postFormatterJson<{ content: Tutor[] }>('Tutors', ToolKit.tutorsFormatterUrl, { content }, rejectWithValue);
        }
    );
export const TutorialFormatter = createAsyncThunk<
    { banners: TutorialBanner[]; content: TutorialContent[][] },
    TutorialThunkPayload, { rejectValue: string }>(
        'TutorialFormatter',
        async (payload: TutorialThunkPayload, { rejectWithValue, getState }): Promise<{ banners: TutorialBanner[]; content: TutorialContent[][] } | FormatterReject> => {
            const { content } = payload;
            if ((getState() as RootState).session.offlineFormatter) {
                try {
                    return offlineTutorialFormatter({ content }) as { banners: TutorialBanner[]; content: TutorialContent[][] };
                } catch (error) {
                    return rejectFormatterError(rejectWithValue, error);
                }
            }
            return postFormatterJson<{ banners: TutorialBanner[]; content: TutorialContent[][] }>('Tutorial', ToolKit.tutorialFormatterUrl, { content }, rejectWithValue);
        }
    );

export const fetchSkeletons = createAsyncThunk<
    validatedSkeletonsResponse,
    FetchDataPayload,
    { rejectValue: string }
>(
    FETCH_SKELETONS_THUNK_TYPE,
    async (payload: FetchDataPayload, { rejectWithValue, getState, dispatch }) => {
        const state = getState() as RootState;
        const { convolution, search } = payload;
        const {
            curApp,
            curToken,
            isPrivate,
            fetchRole,
            isIncognito,
            curMailer: mailer,
            defaultTake,
        } = state.session;
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
                    curApp: curApp,
                    convolution: convolution,
                    formatter: convolution,
                    requestTake: defaultTake,
                    executedQueries: {},
                    counts: {},
                    path: ToolKit.authenticatedSkeletonsRecordsUrl,
                }
                : {
                    state,
                    search,
                    curApp: curApp,
                    convolution: convolution,
                    formatter: convolution,
                    requestTake: defaultTake,
                    executedQueries: {},
                    counts: {},
                    path: ToolKit.anonymousSkeletonsRecordsUrl,
                };

            console.log("skeletonsHook_fired");
            const content = isAccount
                ? await getAccountRecords(params)
                : await getAnonymousRecords(params);
            const validatedResponse = validateSkeletonsThenDispatch(content);
            dispatch(viewRequestSkeletons(false));
            console.log(validatedResponse);
            return validatedResponse;
        } catch (error) {
            if (error instanceof Error) return rejectWithValue(error.message);
            return rejectWithValue('An unknown error occurred while fetching data');
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
        const { counts, executedQueries: inputsPayloads } = state.stats;
        const { convolution, search, webapp, fetchSequence } = payload;
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
            isCleared,
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
            fetchSequence,
            convolution,
            webapp,
            search,
        };
        const [unzippedApp, unzippedAppName, unzippedAppConvolution] = getUnzippedApp(args);
        const _inputsPayloads = setSkipOnExecutedQueries(args, defaultTake, inputsPayloads);
        const recordStateProps = buildRecordStateProps(state, unzippedApp);
        dispatch(registerIDsAtRequest({ requestId, ids: extractIDsAtRequest(recordStateProps) }));
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
                    curApp: unzippedApp,
                    requestTake: defaultTake,
                    convolution: unzippedAppName,
                    formatter: unzippedAppConvolution,
                    counts: isCleared[unzippedApp] ? {} : counts,
                    executedQueries: isCleared[unzippedApp] ? {} : _inputsPayloads,
                    path: ToolKit.authenticatedRecordsUrl,
                }
                : {
                    state,
                    search,
                    curApp: unzippedApp,
                    requestTake: defaultTake,
                    convolution: unzippedAppName,
                    formatter: unzippedAppConvolution,
                    counts: isCleared[unzippedApp] ? {} : counts,
                    executedQueries: isCleared[unzippedApp] ? {} : _inputsPayloads,
                    path: ToolKit.anonymousRecordsUrl,
                };

            console.log("recordsHook_fired");
            const content = isAccount
                ? await getAccountRecords(params)
                : await getAnonymousRecords(params);
            const { executedQueries: query, ...fetchedData } = content ?? { counts: {} };
            validateThenDispatch({
                fetchSequence: payload.fetchSequence,
                response: fetchedData,
                curApp: unzippedApp,
                dispatch,
                query,
                state,
                requestId,
            });
            dispatch(clearIDsAtRequest(requestId));
            console.log(content);
            return query || {};
        } catch (error) {
            if (error instanceof Error) return rejectWithValue(error.message);
            return rejectWithValue('An unknown error occurred while fetching data');
        }
    }
);

/** Mirrors `getUnzippedApp` unzip branches: enabled + one of incoming/outgoing/both. */
const isUnzipTypeActive = (isUnzip: boolean, unzipType: string): boolean =>
    isUnzip &&
    (unzipType === 'incoming_and_outgoing' ||
        unzipType === 'incoming' ||
        unzipType === 'outgoing');

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
    fetchSequence?: { index: number; total: number };
};

let curskip = 0;
export const getCurSkip = () => curskip;
const setSkipOnExecutedQueries = (
    args: UnzipFetchArgs,
    defaultTake: number,
    inputsPayloads: Record<string, Record<string, Executedquery>>
): Record<string, Record<string, Executedquery>> => {
    const { webapp, search, fetchSequence } = args;
    const w = webapp.toLowerCase();
    const applies =
        (w === 'course' && isUnzipTypeActive(args.isUnzipCourses, args.unzipCoursesType)) ||
        (w === 'tutorial' && isUnzipTypeActive(args.isUnzipTutorials, args.unzipTutorialsType)) ||
        (w === 'quiz' && isUnzipTypeActive(args.isUnzipQuizzes, args.unzipQuizzesType));
    if (fetchSequence || !applies) {
        const searchRoutes = getConvSearch(search);
        if (!searchRoutes || Object.keys(searchRoutes).length === 0)
            return inputsPayloads;

        const out: Record<string, Record<string, Executedquery>> = {};
        for (const [outerKey, inner] of Object.entries(inputsPayloads)) {
            out[outerKey] = {};
            for (const [innerKey, q] of Object.entries(inner))
                out[outerKey][innerKey] = { ...q };
        }

        for (const [route, csEntry] of Object.entries(searchRoutes)) {
            if (!csEntry || typeof csEntry !== 'object' || !('skip' in csEntry)) continue;
            const skip = (csEntry as { skip: number }).skip;
            const queryKey = route + RECORDS;
            for (const outerKey of Object.keys(out)) {
                if (out[outerKey][queryKey])
                    out[outerKey][queryKey] = { ...out[outerKey][queryKey], skip };
            }
        }
        if (searchRoutes) console.log("conv_search", searchRoutes, out);
        return out;
    }
    else {
        curskip = getSimplePageIndexFromSearch(search);
        const skip = curskip * defaultTake;
        const out: Record<string, Record<string, Executedquery>> = {};
        for (const [outerKey, inner] of Object.entries(inputsPayloads)) {
            out[outerKey] = {};
            for (const [innerKey, q] of Object.entries(inner))
                out[outerKey][innerKey] = { ...q, skip };
        }
        if (curskip !== 0) console.log("simple_page", curskip, out);
        return out;
    }
};

let curPage = 0;
export const setCurPage = (page: number) => (curPage = page);
const getUnzippedApp = (args: UnzipFetchArgs): [number, string, string] => {
    const {
        curApp,
        webapp,
        convolution,
        fetchSequence,
        isUnzipCourses,
        isUnzipTutorials,
        isUnzipQuizzes,
        unzipCoursesType,
        unzipTutorialsType,
        unzipQuizzesType,
    } = args;
    const _webapp = webapp.toLowerCase();
    if (fetchSequence) return [curApp, webapp, convolution];
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