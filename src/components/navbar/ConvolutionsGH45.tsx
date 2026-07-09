import { getCurAppName } from '../../utils';
import Quizzes from '../convolutions/Quizzes';
import Course from '../convolutions/Course';
import Tutorial from '../convolutions/Tutorial';
import Cpanel from '../convolutions/Cpanel';
import Search from '../convolutions/Search';
import { RootState } from '../../store/types';
import { mutateCurApp } from '../../store/slices/sessionSlice';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import React, { useEffect, useState } from 'react';
import Communications from '../convolutions/Communications';
import {
    initLoading,
    activateTutors,
    markIncoming,
    sendOutgoing,
    InitLoadingPayload
} from '../../library/actions';
import { dispatchSaveEditsForAllWebapps } from '../../store/middleware/saveEditsQueue';
import { useConvolutionator } from '../../Hooks/useQueryMedia';
import Forbidden from '../views/Forbidden.tsx';
const commApps = ['tutors', 'incoming', 'outgoing'];
const TestComponent: React.FC = () => {
    useConvolutionator();
    const dispatch = useDispatch();
    // Get all props from Redux store
    const noRecords = useSelector((state: RootState) =>
        !Object.entries(state.pagination.selectedRoutes || {}).some(
            ([appId, route]) =>
                parseInt(appId) === state.session.curApp &&
                state.response.responseData[route as keyof typeof state.response.responseData]?.visibles?.length > 0
        )
    );
    const webapp = useSelector((state: RootState) => state.session.curApp);
    const noQuizzes = useSelector((state: RootState) => state.quiz.noQuizzes);
    const routesRef = useSelector((state: RootState) => state.search.routesRef);
    const noCourses = useSelector((state: RootState) => state.course.noCourses);
    const defaultTake = useSelector((state: RootState) => state.session.defaultTake);
    const noTutorials = useSelector((state: RootState) => state.tutorial.noTutorials);
    const searchHistory = useSelector((state: RootState) => state.session.searchHistory);
    const isUnzipCourses = useSelector((state: RootState) => state.settings.isUnzipCourses);
    const isUnzipQuizzes = useSelector((state: RootState) => state.settings.isUnzipQuizzes);
    const isUnzipTutorials = useSelector((state: RootState) => state.settings.isUnzipTutorials);

    const allUnzipDisabled =
        !isUnzipCourses && !isUnzipQuizzes && !isUnzipTutorials;
    const showCourseRoute = allUnzipDisabled || isUnzipCourses;
    const showQuizRoute = allUnzipDisabled || isUnzipQuizzes;
    const showTutorialRoute = allUnzipDisabled || isUnzipTutorials;

    const { pathname } = useLocation();
    const initialLocalApp = pathname?.toLowerCase()?.split("/").pop()!;
    const isAppUrl = initialLocalApp !== 'search' && initialLocalApp !== 'cpanel';
    const [localapp, setLocalApp] = useState(isAppUrl ? initialLocalApp : getCurAppName(webapp));
    useEffect(() => {
        dispatch(mutateCurApp(localapp));
    }, [localapp, dispatch]);


    const tutorsManager = () => dispatch(activateTutors());
    const incomingManager = () => dispatch(markIncoming());
    const outgoingManager = () => dispatch(sendOutgoing());
    const persister = (webapp: string) => {
        dispatchSaveEditsForAllWebapps(dispatch, webapp);
    };
    const cpanelManager = (payload: InitLoadingPayload) => dispatch(initLoading(payload));


    const CommunicationsRoute: React.FC = () => {
        const { pathname } = useLocation();
        useEffect(() => {
            const urlApp = pathname?.toLowerCase()?.split("/").pop();
            if (urlApp) setLocalApp(urlApp);
        }, [pathname]);
        return (
            commApps.includes(localapp) ? (
                <Communications
                    pathname={pathname}
                    incomingManager={incomingManager}
                    outgoingManager={outgoingManager}
                    tutorsManager={tutorsManager}
                    convolution={localapp}
                    webapp={localapp}
                />
            ) : null
        );
    };

    return (
        <Routes>
            {allUnzipDisabled && <React.Fragment>
                <Route index element={<Navigate to="search" replace />} />
                <Route path="search" element={
                    <Search
                        webapp={localapp}
                        convolution="cpanel"
                        routesRef={routesRef}
                        setWebApp={setLocalApp}
                        searchHistory={searchHistory}
                        cpanelManager={cpanelManager}
                    />
                } />
                {commApps.map((path) => (
                    <Route key={path} path={path} element={<CommunicationsRoute />} />
                ))}
                <Route path="cpanel" element={
                    <Cpanel
                        setWebApp={setLocalApp}
                        cpanelManager={cpanelManager}
                        convolution="cpanel"
                        defaultTake={defaultTake}
                        noRecords={noRecords}
                        webapp={localapp}
                    />
                } />
            </React.Fragment>}
            {showTutorialRoute && (
                <Route path="tutorial" element={
                    <Tutorial
                        webapp="tutorial"
                        convolution="tutorial"
                        setWebApp={setLocalApp}
                        noTutorials={noTutorials}
                        tutorialPersister={() => persister('tutorial')}
                    />
                } />
            )}
            {showCourseRoute && (
                <Route path="course" element={
                    <Course
                        webapp="course"
                        convolution="course"
                        noCourses={noCourses}
                        setWebApp={setLocalApp}
                        coursePersister={() => persister('course')}
                    />
                } />
            )}
            {showQuizRoute && (
                <Route path="quiz" element={
                    <Quizzes
                        webapp="quiz"
                        convolution="quiz"
                        noQuizzes={noQuizzes}
                        setWebApp={setLocalApp}
                        quizPersister={() => persister('quiz')}
                    />
                } />
            )}
            {allUnzipDisabled && <Route path="*" element={<Navigate to="/login" replace />} />}
            <Route path="*" element={<Forbidden />} />
        </Routes>
    );
};

export default TestComponent;
