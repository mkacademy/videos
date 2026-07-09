import { useLocation } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { fetchData } from '../library/Thunks';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { buildFetchDataPayload, selectMinimumFeatureModeFlags } from '../library/ThunksUtils';
import { convolutionDelay, visitedRoutes } from '../utils';
import { ThunkDispatch, UnknownAction } from '@reduxjs/toolkit';
import { viewRequestFetching } from '../store/slices/viewSlice';
import { initTotals } from '../library/actions';

interface UseRecordsProps {
    convolution: string;
    webapp: string;
}
export const useRecords = ({
    convolution,
    webapp,
}: UseRecordsProps) => {
    const { search, pathname } = useLocation();
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const dispatch = useDispatch<ThunkDispatch<RootState, unknown, UnknownAction>>();
    const unzipFlags = useSelector(selectMinimumFeatureModeFlags);

    useEffect(() => {
        // Clear any existing timeout
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
        if (!visitedRoutes[pathname]) {
            dispatch(viewRequestFetching(true));
            timeoutRef.current = setTimeout(() => {
                visitedRoutes[pathname] = true;
                const payload = buildFetchDataPayload(unzipFlags, { convolution, webapp, search });
                dispatch(fetchData(payload));
                timeoutRef.current = null;
            }, convolutionDelay);
        } else setTimeout(() => dispatch(initTotals()), 100);

        // Cleanup function to clear timeout on unmount or dependency change
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }
        };
    }, [pathname, search, webapp, convolution, dispatch, unzipFlags]);

}; 