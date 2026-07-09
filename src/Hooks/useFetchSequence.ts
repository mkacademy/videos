import { useEffect, useRef, type MouseEvent } from 'react';
import { ThunkDispatch, UnknownAction } from '@reduxjs/toolkit';
import { useDispatch, useSelector } from 'react-redux';
import { convolutionDelay } from '../utils';
import { viewRequestFetching } from '../store/slices/viewSlice';
import { fetchData } from '../library/Thunks';
import { RootState } from '../store';
import {
  abortFetchSequence,
  buildFetchDataPayload,
  isFetchSequenceAborted,
  resetFetchSequenceAbort,
  selectMinimumFeatureModeFlags,
  setFetchSequenceRunning,
} from '../library/ThunksUtils';

const FETCH_SEQUENCE_DELAY_MS = 200;

export const getFsqCount = (search: string): number => {
  const fsq = new URLSearchParams(search).get('fsq');
  const parsed = fsq ? parseInt(fsq, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

const isPncWebapp = (webapp: string): webapp is 'tutorial' | 'course' | 'quiz' =>
  webapp === 'tutorial' || webapp === 'course' || webapp === 'quiz';

const getSelectedForWebapp = (
  webapp: string,
  selected: { tutorial: number; course: number; quiz: number }
): number | null => {
  if (webapp === 'tutorial') return selected.tutorial;
  if (webapp === 'course') return selected.course;
  if (webapp === 'quiz') return selected.quiz;
  return null;
};

const chaptersEqual = (a: number[], b: number[]): boolean =>
  a.length === b.length && a.every((value, index) => value === b[index]);

type UseFetchSequenceParams = {
  webapp: string;
  formatter?: string;
  isLoading: boolean;
  search: string;
};

export function useFetchSequence({ webapp, formatter, isLoading, search }: UseFetchSequenceParams) {
  const dispatch = useDispatch<ThunkDispatch<RootState, unknown, UnknownAction>>();
  const selectedTutorial = useSelector((state: RootState) => state.tutorial.selected);
  const selectedCourse = useSelector((state: RootState) => state.course.selected);
  const selectedQuiz = useSelector((state: RootState) => state.quiz.selected);
  const courseChapters = useSelector((state: RootState) => state.course.chapters);
  const unzipFlags = useSelector(selectMinimumFeatureModeFlags);
  const sequenceActiveRef = useRef(false);
  const selectionSnapshotRef = useRef<number | null>(null);
  const chaptersSnapshotRef = useRef<number[] | null>(null);
  const initialTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const interFetchTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const fsqCount = getFsqCount(search);
  const cancelPendingFetches = () => {
    abortFetchSequence();
    if (initialTimeoutRef.current) {
      clearTimeout(initialTimeoutRef.current);
      initialTimeoutRef.current = null;
    }
    interFetchTimeoutsRef.current.forEach(clearTimeout);
    interFetchTimeoutsRef.current = [];
  };

  useEffect(() => {
    return () => {
      if (!sequenceActiveRef.current) return;
      cancelPendingFetches();
      sequenceActiveRef.current = false;
      selectionSnapshotRef.current = null;
      chaptersSnapshotRef.current = null;
      dispatch(viewRequestFetching(false));
    };
  }, [dispatch]);

  useEffect(() => {
    if (!sequenceActiveRef.current || !isPncWebapp(webapp)) return;
    const current = getSelectedForWebapp(webapp, {
      tutorial: selectedTutorial,
      course: selectedCourse,
      quiz: selectedQuiz,
    });
    if (selectionSnapshotRef.current !== null && current !== selectionSnapshotRef.current) {
      cancelPendingFetches();
      sequenceActiveRef.current = false;
      selectionSnapshotRef.current = null;
      chaptersSnapshotRef.current = null;
      dispatch(viewRequestFetching(false));
    }
  }, [selectedTutorial, selectedCourse, selectedQuiz, webapp, dispatch]);

  useEffect(() => {
    if (!sequenceActiveRef.current || webapp !== 'course') return;
    const snapshot = chaptersSnapshotRef.current;
    if (snapshot !== null && !chaptersEqual(snapshot, courseChapters)) {
      cancelPendingFetches();
      sequenceActiveRef.current = false;
      selectionSnapshotRef.current = null;
      chaptersSnapshotRef.current = null;
      dispatch(viewRequestFetching(false));
    }
  }, [courseChapters, webapp, dispatch]);

  const waitBetweenFetches = (ms: number): Promise<void> =>
    new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        interFetchTimeoutsRef.current = interFetchTimeoutsRef.current.filter((id) => id !== timeoutId);
        resolve();
      }, ms);
      interFetchTimeoutsRef.current.push(timeoutId);
    });

  const sequenceQueryHandler = (e: MouseEvent) => {
    e.preventDefault();
    if (!isLoading && formatter) {
      resetFetchSequenceAbort();
      sequenceActiveRef.current = true;
      selectionSnapshotRef.current = isPncWebapp(webapp)
        ? getSelectedForWebapp(webapp, {
          tutorial: selectedTutorial,
          course: selectedCourse,
          quiz: selectedQuiz,
        })
        : null;
      chaptersSnapshotRef.current = webapp === 'course' ? [...courseChapters] : null;
      dispatch(viewRequestFetching(true));
      const payload = buildFetchDataPayload(unzipFlags, { convolution: formatter, webapp, search });
      initialTimeoutRef.current = setTimeout(() => {
        initialTimeoutRef.current = null;
        const runFetches = async () => {
          const total = fsqCount || 1;
          const isMultiFetchSequence = total > 1;
          if (isMultiFetchSequence) setFetchSequenceRunning(true);
          try {
            for (let index = 0; index < total; index++) {
              if (isFetchSequenceAborted()) return;
              await dispatch(fetchData({ ...payload, fetchSequence: { index, total } })).unwrap();
              if (isFetchSequenceAborted()) return;
              if (index < total - 1) await waitBetweenFetches(FETCH_SEQUENCE_DELAY_MS);
            }
          } catch {
            cancelPendingFetches();
            dispatch(viewRequestFetching(false));
          } finally {
            if (isMultiFetchSequence) setFetchSequenceRunning(false);
            sequenceActiveRef.current = false;
            selectionSnapshotRef.current = null;
            chaptersSnapshotRef.current = null;
          }
        };
        void runFetches();
      }, convolutionDelay);
    }
  };

  return { sequenceQueryHandler, isFsqActive: fsqCount > 0 };
}
