import { Middleware, ThunkDispatch, UnknownAction } from '@reduxjs/toolkit';
import {
    Tree,
    getAlias,
    getCurAppName,
    maxIndexOfApps,
    maxIndexOfUserApps,
    orderEntitiesRootToLeafForWebapp,
    validatedCombination,
    capitalizeFirstLetter,
} from "../../utils";
import { RootState } from '../../store';
import { ViewState } from '../../store/slices/viewSlice';
import { mutateSettings, toggleUnzipCourses, toggleUnzipQuizzes, toggleUnzipTutorials } from "../slices/settingsSlice";
import { accountMutation, initSettings } from "../../library/actions";
import { DataRow, WebApps } from '../../components/Core/types';
import { predicate as predicate2 } from "../../Hooks/useSettings";
import { amendment, registration } from '../../library/Thunks';

const getProfile = (viewReducer: ViewState) => {
    const predicate = (c: DataRow) => c.checked && !c.modified;
    const userobj = viewReducer.fetchedData?.find(predicate);
    if (userobj === undefined) return {};
    else return { username: userobj.minion ?? "", email: userobj.email ?? "" };
};

const settingsInitializer: Middleware<{}, RootState> = (store) => {
    const { getState, dispatch } = store;
    const thunkDispatch = dispatch as ThunkDispatch<RootState, unknown, UnknownAction>;
    return (next) => (action) => {
        if (initSettings.match(action)) {
            const { session, view, settings } = getState() as RootState;
            const curAppIndex = session.curApp;
            const app = getCurAppName(curAppIndex);
            const predicate0 = (props: { webapps: WebApps }) => props.webapps[app]?.length > 0;
            const predicate1 = (props: { webapps: WebApps, name: string, lowermenu?: boolean, highermenu?: boolean }) => {
                const { webapps, name: n, lowermenu: l, highermenu: h } = props;
                const higherRoutes = h ? webapps[app].map((d: string) => "higher" + n + d) : [];
                const lowerRoutes = l ? webapps[app].map((d: string) => "lower" + n + d) : [];
                const curRoutes = webapps[app].map((descendent: string) => n + descendent);
                return curRoutes.concat(lowerRoutes).concat(higherRoutes);
            };
            const ent = getAlias(view.entity || '');
            const par = getAlias(view.parent || '');
            const a = view.entity ? capitalizeFirstLetter(ent) : "[TO]";
            const b = view.parent ? capitalizeFirstLetter(par) : "[FROM]";
            const isUserApps =
                curAppIndex > maxIndexOfApps && curAppIndex <= maxIndexOfUserApps;
            const curPrefix = session.prefix;
            const initialSettings = mutateSettings({
                catalina: 1,
                verifyAttempts: 0,
                prefix: curPrefix,
                registerAttempts: 0,
                ...getProfile(view),
                affix: session.affix,
                eXport: session.exData,
                iMport: session.imData,
                padding: session.padCount,
                take: session.defaultTake,
                creates: session.addCount,
                action: session.tableAction,
                domain: !session.isIncognito,
                exRoots: session.exAlgorithm,
                source: curAppIndex.toString(),
                exHistory: session.exTraversals,
                availability: session.isPrivate,
                role: session.fetchRole ?? undefined,
                isTabled: !curPrefix.endsWith("/app/"),
                memberapp: isUserApps ? curAppIndex : 0,
                includeBase64: session.defaultTake === 1,
                connects: "--CHOOSE_WHO_CAN_CONNECT_TO_SELECTED--",
                userapp: curAppIndex <= maxIndexOfApps ? curAppIndex : 0,
                adminapp: curAppIndex > maxIndexOfUserApps ? curAppIndex : 0,
                selectedRoutes: orderEntitiesRootToLeafForWebapp(Tree.entities, app).map(predicate2).flat(),
                amendAttempts: settings?.registerAttempts === -1 || settings?.amendAttempts === -1 ? 1 : 0,
                ...validatedCombination({ selectedParent: b, selectedChild: a }, false, app),
                characters: !session.isIncognito ? (session.roles?.length ?? 0) : 0,
                permittedRoutes: orderEntitiesRootToLeafForWebapp(Tree.entities, app)
                    .filter(predicate0)
                    .map(predicate1)
                    .flat(),
            });
            return next(initialSettings);
        }

        if (accountMutation.match(action)) {
            const { payload } = action;
            const { session } = getState() as RootState;
            if (session.authenticated) {
                const { curToken, mutateRole } = session;
                const frieght = { ...payload, curToken: curToken ?? undefined, mutateRole: mutateRole ?? undefined };
                thunkDispatch(amendment(frieght));
            } else thunkDispatch(registration(payload));
            return next(action);
        }

        if (toggleUnzipTutorials.match(action)
            || toggleUnzipCourses.match(action)
            || toggleUnzipQuizzes.match(action)) {
            const { settings } = getState() as RootState;
            const { isUnzipTutorials, isUnzipCourses, isUnzipQuizzes } = settings;
            
            // Count how many are currently true
            const trueCount = [isUnzipTutorials, isUnzipCourses, isUnzipQuizzes].filter(Boolean).length;
            
            // Prevent the action if it would set all three properties to false
            // This happens when exactly one is true and we're toggling that one
            if (trueCount === 1) {
                if ((toggleUnzipTutorials.match(action) && isUnzipTutorials) ||
                    (toggleUnzipCourses.match(action) && isUnzipCourses) ||
                    (toggleUnzipQuizzes.match(action) && isUnzipQuizzes)) {
                    return action; // Prevent the action as it would set all to false
                }
            }
            
            return next(action);
        }

        return next(action);
    };
};

export default settingsInitializer; 