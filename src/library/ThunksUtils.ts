import { jwtDecode } from 'jwt-decode';
import { createSelector, Dispatch } from '@reduxjs/toolkit';
import { fetchedHandles, Handler } from '../store/slices/errorSlice';
import { Content, setTutorials, Banner as TutorialBanner } from '../store/slices/tutorialSlice';
import { Banner, setCourses, SlideGroup } from '../store/slices/courseSlice';
import { IncomingMessage, OutgoingMessage, setIncomings, setOutgoings, setTutors, Tutor } from '../store/slices/commsSlice';
import { ToolKit, RECORDS, getCurAppName, getSimplePageIndexFromSearch, orderedWebappRoutes, Tree, timeout, getCurAppIndex } from '../utils';
import { appendRowz, ResultPayload } from '../store/slices/rowSlice';
import { getCounts, getExecutedQueries } from '../store/slices/statsSlice';
import { Quiz, setQuizzes } from '../store/slices/quizSlice';
import { CpanelRow } from '../components/Core/types';
import { QueryParams } from '../store/types';
import { viewRequestFetching } from '../store/slices/viewSlice';
import { insertStats } from './actions';
import { withReciepients } from '../Hooks/useCommunications/useCommunications';
import { RootState } from '../store';
import { initTotals } from './actions';
import { StatsMiddlewareState } from '../store/types';
import { B, M, U } from '../library/commsUtils';
import { buildRecordStateProps, type StatsPayload } from './requestIdsUtils';

export {
    bannerPred,
    pennantTutorialBannerPred,
    buildChapterPennantFallback,
    quizBannerPred,
    quizPred,
    bannerOrTutorialBannerOrQuizPred,
    highBannerPred,
    transformCourseSlideGroups,
    transformQuizSlideGroups,
    buildRecordStateProps,
    extractIDsAtRequest,
    type RecordStateProps,
    type StatsPayload,
} from './requestIdsUtils';

const expireMessage = 'Token has expired, sign out and sign in again';

let fetchSequenceAborted = false;
let fetchSequenceRunning = false;

export const resetFetchSequenceAbort = () => {
    fetchSequenceAborted = false;
};

export const abortFetchSequence = () => {
    fetchSequenceAborted = true;
    fetchSequenceRunning = false;
};

export const isFetchSequenceAborted = () => fetchSequenceAborted;

export const setFetchSequenceRunning = (running: boolean) => {
    fetchSequenceRunning = running;
};

export const isFetchSequenceRunning = () => fetchSequenceRunning;

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
    executedQueries: Record<string, Record<string, Executedquery>>;
    counts: Record<string, Record<string, Record<string, number>>>;
    path: string;
}

const getCachedCounts = (
    counts: Record<string, Record<string, Record<string, number>>>, stateProps: StatsPayload) => {
    const { webapp, selectedT, selectedC, selectedQ, quizzes, pennantz, pennants, banners, selecteds, selectedRoute, curMailer } = stateProps;
    const app = getCurAppName(webapp);
    return getCounts({
        app,
        webapp,
        curMailer,
        selectedT,
        selectedC,
        selectedQ,
        quizzes,
        pennantz,
        pennants,
        banners,
        selecteds,
        selectedRoute
    }, counts)
}
const getCachedExecutedQueries = (
    executedQueries: Record<string, Record<string, Executedquery>>, stateProps: StatsPayload) => {
    const { webapp, selectedRoute, selectedT, selectedC, selectedQ, quizzes, pennantz, pennants, banners, selecteds, curMailer } = stateProps;
    const app = getCurAppName(webapp);
    return getExecutedQueries({
        app,
        webapp,
        curMailer,
        selectedT,
        selectedC,
        selectedQ,
        quizzes,
        pennantz,
        pennants,
        banners,
        selecteds,
        selectedRoute,
    }, executedQueries);
}
const getAccountBody = async (params: RecordParams) => {
    const state = params.state;
    const selectedRoute = state.search.selectedRoute;
    const stateProps = buildRecordStateProps(state, params.curApp);
    const newStateProps = { ...stateProps, app: '', curMailer: params.mailer ?? -1, selectedRoute };
    const searchedRoutes = getSearchedRoutes(stateProps.webapp, state.search.routesRef.current);
    const queries = getCachedExecutedQueries(params.executedQueries, newStateProps);
    const counts = getCachedCounts(params.counts, newStateProps);
    const requestBody = {
        counts,
        queries,
        searchedRoutes,
        state: stateProps,
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

const getSkeletonSkip = (params: RecordParams): number => {
    const convolution = params.convolution.toLowerCase();
    const take = convolution === 'tutorial'
        ? 1000
        : convolution === 'course'
            ? 80
            : convolution === 'quiz'
                ? 20
                : params.state.session.defaultTake ?? 10;
    const page = getSimplePageIndexFromSearch(params.search);
    if (convolution === 'tutorial'
        || convolution === 'course'
        || convolution === 'quiz')
        return page * take;
    return 0;
};

const getAccountSkeletons = async (params: RecordParams): Promise<string> => {
    const requestBody = {
        hasCounts: false,
        mailer: params.mailer,
        curToken: params.curToken,
        isPrivate: params.isPrivate,
        mutateRole: params.fetchRole,
        skip: getSkeletonSkip(params),
        convolution: params.convolution,
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
            body:
                endpoint === ToolKit.authenticatedSkeletonsRecordsUrl
                    ? await getAccountSkeletons(params)
                    : await getAccountBody(params),
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

const getSearchedRoutes = (webapp: number, searchedRoutes: Record<string, string>[]) => {
    const path = window.location.pathname.toLowerCase();
    if (path.startsWith("/convolution/search")) {
        if (searchedRoutes.length > 0)
            return searchedRoutes.reduce<Record<string, string>>((acc, cur) => ({ ...acc, ...cur }), {});
        const app = getCurAppName(webapp);
        return orderedWebappRoutes(Tree.entities, app);
    } else return null;
}
const getAnonymousSkeletons = async (params: RecordParams): Promise<string> => {
    const requestBody = {
        hasCounts: false,
        skip: getSkeletonSkip(params),
        convolution: params.convolution,
    };
    return JSON.stringify(requestBody);
}
const getAnonymousBody = async (params: RecordParams) => {
    const state = params.state;
    const selectedRoute = state.search.selectedRoute;
    const stateProps = buildRecordStateProps(state, params.curApp);
    stateProps.quizzes = stateProps.quizzes.map(({ id }) => ({ id }));
    const newStateProps = { ...stateProps, app: '', curMailer: params.mailer ?? -1, selectedRoute };
    const searchedRoutes = getSearchedRoutes(stateProps.webapp, state.search.routesRef.current);
    const queries = getCachedExecutedQueries(params.executedQueries, newStateProps);
    const counts = getCachedCounts(params.counts, newStateProps);
    const requestBody = {
        counts,
        queries,
        searchedRoutes,
        state: stateProps,
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
            body:
                endpoint === ToolKit.anonymousSkeletonsRecordsUrl
                    ? await getAnonymousSkeletons(params)
                    : await getAnonymousBody(params),
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

export interface Initials {
    [key: string]: FetchedData;
}

export interface Executedquery {
    isPrivateView?: boolean;
    parentIDs?: number[];
    childIDs?: number[];
    search?: string;
    take?: number;
    skip?: number;
}

export interface FetchDataPayload {
    fetchSequence?: { index: number; total: number };
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

const minimumFeatureAppIndices = [1, 2, 3, 4, 5, 6];

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

const COUNTS = 'counts';

/** Query map keys end with `records` or `counts`; strip to the route stem used in `orderedWebappRoutes`. */
const normalizeExecutedQueryRoute = (routeStem: string): string =>
    routeStem.endsWith('dashboard') && !routeStem.endsWith('dashboards')
        ? `${routeStem}s`
        : routeStem;

const routeStemFromExecutedQueryKey = (key: string): string | undefined => {
    if (key.endsWith(RECORDS)) return normalizeExecutedQueryRoute(key.slice(0, -RECORDS.length));
    if (key.endsWith(COUNTS)) return normalizeExecutedQueryRoute(key.slice(0, -COUNTS.length));
    return undefined;
};

const routesFromExecutedQueries = (executedQueries: Record<string, Executedquery>): string[] => {
    const routes = new Set<string>();
    for (const key of Object.keys(executedQueries)) {
        const route = routeStemFromExecutedQueryKey(key);
        if (route) routes.add(route);
    }
    return [...routes];
};

/** App index (1–6) whose route set contains every route key in the fetch response. */
export const resolveAppIndexFromExecutedQueryRoutes = (
    executedQueries: Record<string, Executedquery>,
): string | undefined => {
    const routes = routesFromExecutedQueries(executedQueries);
    if (routes.length === 0) return undefined;

    const matches = minimumFeatureAppIndices.filter((index) => {
        const appRoutes = orderedWebappRoutes(Tree.entities, getCurAppName(index));
        return routes.every((route) => appRoutes.includes(route));
    });

    if (matches.length === 0) return undefined;
    if (matches.length === 1) return matches[0].toString();

    return matches
        .reduce((tightest, candidate) => {
            const tightestRoutes = orderedWebappRoutes(Tree.entities, getCurAppName(tightest));
            const candidateRoutes = orderedWebappRoutes(Tree.entities, getCurAppName(candidate));
            return candidateRoutes.length < tightestRoutes.length ? candidate : tightest;
        })
        .toString();
};



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
            isAppend: query.type === appendRowz.type
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
            isAppend: query.type === appendRowz.type
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
    handlers?: Record<string, Handler[]>;
    banners?: Banner[] | TutorialBanner[];
    counts: Record<string, Record<string, number>>;
    executedQueries?: Record<string, Executedquery>;
    content?: SlideGroup[] | Content[][] | OutgoingMessage[] | IncomingMessage[] | Tutor[] | Record<string, Record<string, CpanelRow[]>>;
}

export interface QuizResponse {
    counts: Record<string, Record<string, number>>;
    handlers: Record<string, Handler[]>;
    totals: Record<string, number>;
    content: SlideGroup[];
    banners: Banner[];
    quizzes: Quiz[];
}

export interface CourseResponse {
    banners: Banner[];
    content: SlideGroup[];
    totals: Record<string, number>;
    handlers: Record<string, Handler[]>;
    counts: Record<string, Record<string, number>>;
}

export interface TutorialResponse {
    content: Content[][];
    banners: TutorialBanner[];
    totals: Record<string, number>;
    handlers: Record<string, Handler[]>;
    counts: Record<string, Record<string, number>>;
}

const emptyTotals = {} as Record<string, number>;
const emptyHandlers = {} as Record<string, Handler[]>;

export interface validatedSkeletonsResponse {
    response: FetchedData;
    screen: string;
}

export const validateSkeletonsThenDispatch = (response: FetchedData): validatedSkeletonsResponse => {
    if (isQuizResponse(response)) {
        console.log("is_quiz_skeletons_response");
        return { response, screen: 'quiz' };
    }
    else if (isCourseResponse(response)) {
        console.log("is_course_skeletons_response");
        return { response, screen: 'course' };
    }
    else if (isTutorialResponse(response)) {
        console.log("is_tutorial_skeletons_response");
        return { response, screen: 'tutorial' };
    }
    else {
        console.log("invalid_skeletons_response");
        return { response, screen: 'invalid' };
    }
}

interface validateThenDispatchPayload {
    query: Record<string, Record<string, Executedquery>>;
    fetchSequence?: FetchDataPayload['fetchSequence'];
    response: FetchedData;
    dispatch: Dispatch;
    state: RootState;
    curApp: number;
    requestId?: string;
}

export const validateThenDispatch = ({
    response,
    query,
    dispatch,
    curApp,
    state,
    fetchSequence,
    requestId
}: validateThenDispatchPayload): void => {
    const {
        session: { curMailer },
        search: { selectedRoute },
        pagination: { selectedRoutes },
        course: { banners: courseBanners, selected: courseSelected },
        quiz: { quizzes, banners: quizBanners, selected: quizSelected },
        tutorial: { banners: tutorialBanners, selected: tutorialSelected },
    } = state;

    const statsState: StatsMiddlewareState = {
        search: { selectedRoute },
        session: { curApp, curMailer },
        pagination: { selectedRoutes },
        course: { selected: courseSelected, banners: courseBanners },
        quiz: { selected: quizSelected, banners: quizBanners, quizzes },
        tutorial: { selected: tutorialSelected, banners: tutorialBanners },
    }
    const { content, counts, totals, handlers } = response;
    const routeReasons: string[] = [];
    let abortRemainingFetchSequence = false;

    if (isQuizResponse(response)) {
        console.log("is_quiz_response");
        const [app, _] = getCurAppIndex('quiz');
        if (!app) throw new Error('Invalid app index');
        const pageroute = selectedRoutes[app];
        dispatch(setQuizzes(response));
        dispatch(fetchedHandles(response.handlers ?? emptyHandlers));
        dispatch(insertStats({ screen: 'quiz', query, counts, totals: totals ?? emptyTotals, state: statsState, requestId }));
        if (fetchSequence && !hasRouteSliceData(response, pageroute, 'quiz', routeReasons)) abortRemainingFetchSequence = true;

    }
    else if (isCourseResponse(response)) {
        console.log("is_course_response");
        const [app, _] = getCurAppIndex('course');
        if (!app) throw new Error('Invalid app index');
        const pageroute = selectedRoutes[app];
        dispatch(setCourses(response));
        dispatch(fetchedHandles(response.handlers ?? emptyHandlers));
        dispatch(insertStats({ screen: 'course', query, counts, totals: totals ?? emptyTotals, state: statsState, requestId }));
        if (fetchSequence && !hasRouteSliceData(response, pageroute, 'course', routeReasons)) abortRemainingFetchSequence = true;
    }
    else if (isTutorialResponse(response)) {
        console.log("is_tutorial_response");
        const [app, _] = getCurAppIndex('tutorial');
        if (!app) throw new Error('Invalid app index');
        const pageroute = selectedRoutes[app];
        dispatch(setTutorials(response));
        dispatch(fetchedHandles(response.handlers ?? emptyHandlers));
        dispatch(insertStats({ screen: 'tutorial', query, counts, totals: totals ?? emptyTotals, state: statsState, requestId }));
        if (fetchSequence && !hasRouteSliceData(response, pageroute, 'tutorial', routeReasons)) abortRemainingFetchSequence = true;
    }
    else if (isCountsResponse(response)) {
        console.log("is_counts_response");
        if (fetchSequence) abortRemainingFetchSequence = true;
    }
    else {
        if (content && Array.isArray(content) && content.length > 0) {
            if (isArrayOfType(content, isTutor)) {
                console.log("is_tutors_response");
                dispatch(setTutors(content));
                dispatch(fetchedHandles(getHandlesFromTutors(content)));
                dispatch(insertStats({ screen: 'tutors', query, counts, totals: totals ?? emptyTotals, state: statsState, requestId }));
            }
            else if (isArrayOfType(content, isOutgoingMessage)) {
                console.log("is_outgoing_response");
                dispatch(fetchedHandles(handlers ?? emptyHandlers));
                dispatch(setOutgoings(withReciepients({ response: content, handlers: handlers ?? emptyHandlers })));
                dispatch(insertStats({ screen: 'outgoing', query, counts, totals: totals ?? emptyTotals, state: statsState, requestId }));
            }
            else if (isArrayOfType(content, isIncomingMessage)) {
                console.log("is_incoming_response");
                dispatch(setIncomings(content));
                dispatch(insertStats({ screen: 'incoming', query, counts, totals: totals ?? emptyTotals, state: statsState, requestId }));
            }

        } else {
            console.log("is_empty_response");
            if (routeReasons.length > 0) logGuardInvalidReasons(`has_route_slice_data_${getCurAppName(curApp)}`, routeReasons, response);
            dispatch(insertStats({ screen: getCurAppName(curApp), query, counts, totals: totals ?? emptyTotals, state: statsState, requestId }));
            if (fetchSequence && routeReasons.length > 0) abortRemainingFetchSequence = true;
        }
    }
    setTimeout(() => dispatch(initTotals()), 100);
    if (abortRemainingFetchSequence) abortFetchSequence();

    const isLastFetchInSequence =
        !fetchSequence || fetchSequence.index >= fetchSequence.total - 1;
    if (isLastFetchInSequence || abortRemainingFetchSequence) dispatch(viewRequestFetching(false));

}

const getHandleName = (type: string): string => {
    switch (type) {
        case B:
            return "HandlesBosses";
        case M:
            return "HandlesMinions";
        case U:
            return "HandlesUnderbosses";
    }
    return "";
};

const getHandlesFromTutors = (tutors: Tutor[]): Record<string, Handler[]> => {
    return tutors.reduce((acc: Record<string, Handler[]>, cur: Tutor) => {
        acc[getHandleName(cur.type)] = [...(acc[getHandleName(cur.type)] ?? []), { id: cur.id, keyword: cur.title }];
        return acc;
    }, {} as Record<string, Handler[]>);
};
const isArrayOfType = <T>(arr: unknown[], typeGuard: (item: unknown) => item is T): arr is T[] => {
    return Array.isArray(arr) && arr.every((item) => typeGuard(item));
};
// Add type guards before the useCommunications function
const isTutor = (item: unknown): item is Tutor => {
    if (typeof item !== 'object' || item === null) return false;
    const o = item as Record<string, unknown>;
    // Tutor has email and status as number, but no mailer property
    return typeof o.email === 'string' &&
        typeof o.status === 'number' &&
        !('mailer' in o);
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

const hasQuizzes = (response: FetchedData, reasons?: string[]): boolean => {
    if (typeof response !== 'object' || response === null) {
        reasons?.push('response is null or not an object');
        return false;
    }
    const o = response as unknown as Record<string, unknown>;
    if (!('quizzes' in o)) {
        reasons?.push("missing key 'quizzes'");
        return false;
    }
    if (!Array.isArray(o.quizzes)) {
        reasons?.push("'quizzes' is not an array");
        return false;
    }
    if (o.quizzes.length <= 0) {
        reasons?.push("'quizzes' array is empty");
        return false;
    }
    return true;
};

const hasCourseBanners = (response: FetchedData, reasons?: string[]): boolean => {
    if (typeof response !== 'object' || response === null) {
        reasons?.push('response is null or not an object');
        return false;
    }
    const o = response as unknown as Record<string, unknown>;
    if (!('banners' in o)) {
        reasons?.push("missing key 'banners'");
        return false;
    }
    if (!Array.isArray(o.banners)) {
        reasons?.push("'banners' is not an array");
        return false;
    }
    if (o.banners.length <= 0) {
        reasons?.push("'banners' array is empty");
        return false;
    }

    // Course banners have pennants array on the first banner.
    const first = o.banners[0];
    if (typeof first !== 'object' || first === null) {
        reasons?.push("'banners[0]' is not an object");
        return false;
    }
    if (!('pennants' in (first as Record<string, unknown>))) {
        reasons?.push("'banners[0]' missing key 'pennants'");
        return false;
    }
    return true;
};

const hasCourseContent = (response: FetchedData, reasons?: string[], requireNonEmpty = false): boolean => {
    if (typeof response !== 'object' || response === null) {
        reasons?.push('response is null or not an object');
        return false;
    }
    const o = response as unknown as Record<string, unknown>;
    if (!('content' in o)) {
        if (requireNonEmpty) reasons?.push("missing key 'content'");
        return !requireNonEmpty;
    }
    if (!Array.isArray(o.content)) {
        reasons?.push("'content' is not an array");
        return false;
    }

    if (o.content.length === 0) {
        if (requireNonEmpty) reasons?.push("'content' array is empty");
        return !requireNonEmpty;
    }

    const first = o.content[0];
    if (Array.isArray(first)) {
        reasons?.push("'content[0]' is an array (expected object with 'slides')");
        return false;
    }
    if (typeof first !== 'object' || first === null) {
        reasons?.push("'content[0]' is not an object (expected object with 'slides')");
        return false;
    }
    if (!('slides' in (first as Record<string, unknown>))) {
        reasons?.push("'content[0]' missing key 'slides'");
        return false;
    }
    return true;
};

const hasTutorialBanners = (response: FetchedData, reasons?: string[]): boolean => {
    if (typeof response !== 'object' || response === null) {
        reasons?.push('response is null or not an object');
        return false;
    }
    const o = response as unknown as Record<string, unknown>;
    if (!('banners' in o)) {
        reasons?.push("missing key 'banners'");
        return false;
    }
    if (!Array.isArray(o.banners)) {
        reasons?.push("'banners' is not an array");
        return false;
    }
    if (o.banners.length <= 0) {
        reasons?.push("'banners' array is empty");
        return false;
    }

    const first = o.banners[0];
    if (typeof first !== 'object' || first === null) {
        reasons?.push("'banners[0]' is not an object");
        return false;
    }
    if ('pennants' in (first as Record<string, unknown>)) {
        reasons?.push("'banners[0]' has key 'pennants' (expected to be absent)");
        return false;
    }
    return true;
};

const hasTutorialContent = (response: FetchedData, reasons?: string[], requireNonEmpty = false): boolean => {
    if (typeof response !== 'object' || response === null) {
        reasons?.push('response is null or not an object');
        return false;
    }
    const o = response as unknown as Record<string, unknown>;
    if (!('content' in o)) {
        if (requireNonEmpty) reasons?.push("missing key 'content'");
        return !requireNonEmpty;
    }
    if (!Array.isArray(o.content)) {
        reasons?.push("'content' is not an array");
        return false;
    }

    if (o.content.length === 0) {
        if (requireNonEmpty) reasons?.push("'content' array is empty");
        return !requireNonEmpty;
    }

    if (!Array.isArray(o.content[0])) {
        reasons?.push("'content[0]' is not an array (expected Content[][] shape)");
        return false;
    }
    return true;
};

const hasNonEmptyContent = (response: FetchedData, reasons?: string[]): boolean => {
    if (typeof response !== 'object' || response === null) {
        reasons?.push('response is null or not an object');
        return false;
    }
    const o = response as unknown as Record<string, unknown>;
    if (!('content' in o)) {
        reasons?.push("missing key 'content'");
        return false;
    }
    if (!Array.isArray(o.content)) {
        reasons?.push("'content' is not an array");
        return false;
    }
    if (o.content.length <= 0) {
        reasons?.push("'content' array is empty");
        return false;
    }
    return true;
};

const hasBannersWithNonEmptyPennants = (response: FetchedData, reasons?: string[]): boolean => {
    if (!hasCourseBanners(response, reasons)) return false;
    const banners = (response as unknown as Record<string, unknown>).banners as unknown[];
    const hasPennants = banners.some((banner) => {
        if (typeof banner !== 'object' || banner === null) return false;
        const pennants = (banner as Record<string, unknown>).pennants;
        return Array.isArray(pennants) && pennants.length > 0;
    });
    if (!hasPennants) reasons?.push('no banner has non-empty pennants');
    return hasPennants;
};

const hasContentSlidesNonEmpty = (response: FetchedData, reasons?: string[]): boolean => {
    if (!hasNonEmptyContent(response, reasons)) return false;
    const content = (response as unknown as Record<string, unknown>).content as unknown[];
    const hasSlides = content.some((group) => {
        if (typeof group !== 'object' || group === null || Array.isArray(group)) return false;
        const slides = (group as Record<string, unknown>).slides;
        return Array.isArray(slides) && slides.length > 0;
    });
    if (!hasSlides) reasons?.push('no content group has non-empty slides');
    return hasSlides;
};

const hasQuizSubmissions = (response: FetchedData, reasons?: string[]): boolean => {
    if (typeof response !== 'object' || response === null) {
        reasons?.push('response is null or not an object');
        return false;
    }
    const o = response as unknown as Record<string, unknown>;
    if (!('quizzes' in o) || !Array.isArray(o.quizzes)) {
        reasons?.push("missing or invalid 'quizzes' for submissions check");
        return false;
    }
    const hasSubmissions = o.quizzes.some((quiz) => {
        if (typeof quiz !== 'object' || quiz === null) return false;
        const pennants = (quiz as Record<string, unknown>).pennants;
        return Array.isArray(pennants) && pennants.length > 0;
    });
    if (!hasSubmissions) reasons?.push('no quiz has non-empty pennants (submissions)');
    return hasSubmissions;
};

/** Deep per-route slice check — used to decide if we should abort the fetch sequence. */
const hasRouteSliceData = (
    response: FetchedData,
    route: string | undefined,
    app: string,
    reasons?: string[],
): boolean => {
    if (!route) return true;

    switch (app) {
        case 'tutorial':
            switch (route) {
                case 'foundationfilters':
                    return hasTutorialBanners(response, reasons);
                case 'filtersinstructions':
                    return hasTutorialContent(response, reasons, true);
                default:
                    return true;
            }
        case 'course':
            switch (route) {
                case 'foundationsifters':
                    return hasCourseBanners(response, reasons);
                case 'siftersfilters':
                    return hasBannersWithNonEmptyPennants(response, reasons);
                case 'siftersinstructions':
                    return hasNonEmptyContent(response, reasons);
                case 'filtersinstructions':
                    return hasContentSlidesNonEmpty(response, reasons);
                default:
                    return true;
            }
        case 'quiz':
            switch (route) {
                case 'foundationdashboards':
                    return hasQuizzes(response, reasons);
                case 'dashboardssifters':
                    return hasCourseBanners(response, reasons);
                case 'dashboardsfilters':
                    return hasQuizSubmissions(response, reasons);
                case 'siftersfilters':
                    return hasBannersWithNonEmptyPennants(response, reasons);
                case 'siftersinstructions':
                    return hasNonEmptyContent(response, reasons);
                case 'filtersinstructions':
                    return hasContentSlidesNonEmpty(response, reasons);
                default:
                    return true;
            }
        default:
            return true;
    }
};

// Soft type guards for skeleton responses — distinguish app shape, not route depth.
const isQuizResponse = (response: FetchedData): response is QuizResponse => {
    const reasons: string[] = [];
    if (typeof response !== 'object' || response === null) {
        reasons.push('response is null or not an object');
    }
    else {
        const o = response as unknown as Record<string, unknown>;
        if (!('quizzes' in o)) reasons.push("missing key 'quizzes'");
        else if (!Array.isArray(o.quizzes)) reasons.push("'quizzes' is not an array");
        else if (o.quizzes.length <= 0) reasons.push("'quizzes' array is empty");
    }

    const ok = reasons.length === 0;
    if (!ok) logGuardInvalidReasons('is_quiz_response', reasons, response);
    return ok;
};

const isCourseResponse = (response: FetchedData): response is CourseResponse => {
    const reasons: string[] = [];
    const okBanners = hasCourseBanners(response, reasons);
    const okContent = hasCourseContent(response, reasons);
    const ok = okBanners && okContent;
    if (!ok) logGuardInvalidReasons('is_course_response', reasons, response);
    return ok;
};

const isTutorialResponse = (response: FetchedData): response is TutorialResponse => {
    const reasons: string[] = [];
    const okBanners = hasTutorialBanners(response, reasons);
    const okContent = hasTutorialContent(response, reasons);
    const ok = okBanners && okContent;
    if (!ok) logGuardInvalidReasons('is_tutorial_response', reasons, response);
    return ok;
};

const isCountsResponse = (response: FetchedData): response is FetchedData => {
    return 'counts' in response &&
        typeof response.counts === 'object' &&
        response.counts !== null &&
        !Array.isArray(response.counts) &&
        !Array.isArray(response.content) &&
        typeof response.content === 'object'
        && Object.keys(response.content).length === 0; // Only counts, no content or empty content
};

