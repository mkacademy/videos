import { Middleware } from '@reduxjs/toolkit';
import { getTotals, setTotal } from '../slices/statsSlice';
import { RootState, CacheTotalsMiddlewareState } from '../types';
import { getCurAppName } from '../../utils';
import { initTotals } from '../../library/actions';

export const cacheTotalsMiddleware: Middleware<{}, RootState> = ({ getState, dispatch }) => (next) => (action) => {
    const state = getState();
    if (initTotals.match(action)) {
        const {
            search: { selectedRoute },
            stats: { totals: allTotals },
            session: { curApp, curMailer },
            pagination: { selectedRoutes: selecteds },
            tutorial: { banners, selected: selectedT },
            course: { banners: pennants, selected: selectedC },
            quiz: { quizzes, banners: pennantz, selected: selectedQ },
        }: CacheTotalsMiddlewareState = state;
        const webapp = curApp;
        const app = getCurAppName(webapp);
        switch (app) {
            case 'tutorial': {
                const totals = getTotals({
                    app,
                    webapp,
                    curMailer,
                    selectedT,
                    selectedC: -1,
                    selectedQ: -1,
                    quizzes: [],
                    pennantz: [],
                    pennants: [],
                    banners,
                    selecteds,
                    selectedRoute
                }, allTotals);
                dispatch(setTotal({ total: totals }));
                break;
            }
            case 'course': {

                const totals = getTotals({
                    app,
                    webapp,
                    curMailer,
                    selectedC,
                    selectedT: -1,
                    selectedQ: -1,
                    quizzes: [],
                    pennantz: [],
                    pennants,
                    banners: [],
                    selecteds,
                    selectedRoute
                }, allTotals);
                dispatch(setTotal({ total: totals }));
                break;
            }
            case 'quiz': {
                const totals = getTotals({
                    app,
                    curMailer,
                    webapp,
                    selectedQ,
                    selectedT: -1,
                    selectedC: -1,
                    quizzes,
                    pennantz,
                    pennants: [],
                    banners: [],
                    selecteds,
                    selectedRoute
                }, allTotals);

                dispatch(setTotal({ total: totals }));
                break;
            }
            case 'outgoing': {
                const totals = getTotals({
                    app,
                    webapp,
                    curMailer,
                    selectedT: -1,
                    selectedC: -1,
                    selectedQ: -1,
                    quizzes: [],
                    pennantz: [],
                    pennants: [],
                    banners: [],
                    selecteds,
                    selectedRoute
                }, allTotals);
                dispatch(setTotal({ total: totals }));
                break;
            }
            case 'incoming': {
                const totals = getTotals({
                    app,
                    webapp,
                    curMailer,
                    selectedT: -1,
                    selectedC: -1,
                    selectedQ: -1,
                    quizzes: [],
                    pennantz: [],
                    pennants: [],
                    banners: [],
                    selecteds,
                    selectedRoute
                }, allTotals);
                dispatch(setTotal({ total: totals }));
                break;
            }
            case 'tutors': {
                const totals = getTotals({
                    app,
                    webapp,
                    curMailer,
                    selectedT: -1,
                    selectedC: -1,
                    selectedQ: -1,
                    quizzes: [],
                    pennantz: [],
                    pennants: [],
                    banners: [],
                    selecteds,
                    selectedRoute
                }, allTotals);
                dispatch(setTotal({ total: totals }));
                break;
            }
            default:
                break;
        }
    }

    return next(action);
};
