import { Middleware } from '@reduxjs/toolkit';
import { insertStats } from '../../library/actions';
import {
    insertTutorialCounts,
    insertCourseCounts,
    insertQuizzesCounts,
    insertTutorsCounts,
    insertIncomingCounts,
    insertOutgoingCounts,
} from '../slices/statsSlice';
import { RootState, StatsMiddlewareState } from '../types';
import { getCurAppName } from '../../utils';

export const statsMiddleware: Middleware<{}, RootState> = ({ dispatch }) => (next) => (action) => {
    if (insertStats.match(action)) {
        const {
            search: { selectedRoute },
            session: { curApp, curMailer },
            pagination: { selectedRoutes: routes },
            tutorial: { selected: selectedT, banners },
            course: { selected: selectedC, banners: pennants },
            quiz: { selected: selectedQ, banners: pennantz, quizzes },
        }: StatsMiddlewareState = action.payload.state;
        const { screen, counts, totals, query, requestId } = action.payload;
        switch (screen) {
            case 'cpanel':
                dispatch(insertStats({ screen: getCurAppName(curApp), counts, totals, query, state: action.payload.state, requestId }));
            case 'tutorial': {
                const payload = {
                    selected: selectedT,
                    selectedRoute,
                    totals,
                    routes,
                    banners,
                    curApp,
                    curMailer,
                    counts,
                    query,
                    requestId,
                }
                return next(insertTutorialCounts(payload));
            }
            case 'course': {
                const payload = {
                    selected: selectedC,
                    selectedRoute,
                    totals,
                    pennants,
                    routes,
                    curApp,
                    curMailer,
                    counts,
                    query,
                    requestId,
                }
                return next(insertCourseCounts(payload));
            }
            case 'quiz': {
                const payload = {
                    selected: selectedQ,
                    selectedRoute,
                    totals,
                    quizzes,
                    pennantz,
                    routes,
                    curApp,
                    curMailer,
                    counts,
                    query,
                    requestId,
                }
                return next(insertQuizzesCounts(payload));
            }
            case 'tutors': {
                const payload = {
                    selectedRoute,
                    curApp,
                    totals,
                    curMailer,
                    counts,
                    routes,
                    query,
                    requestId,
                }
                return next(insertTutorsCounts(payload));
            }
            case 'incoming': {
                const payload = {
                    selectedRoute,
                    curApp,
                    totals,
                    curMailer,
                    counts,
                    routes,
                    query,
                    requestId,
                }
                return next(insertIncomingCounts(payload))
            }
            case 'outgoing': {
                const payload = {
                    selectedRoute,
                    curApp,
                    totals,
                    curMailer,
                    counts,
                    routes,
                    query,
                    requestId,
                }
                return next(insertOutgoingCounts(payload));
            }
            default:
                console.warn(`Unknown screen type: ${screen}. No specific count action dispatched.`);
                console.warn(`Action: ${action.type}`);
                break;
        }
    }
    return next(action);
};
