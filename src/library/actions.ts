import { createAction } from '@reduxjs/toolkit';
import { MutateEntityResponse } from './types';
import { Metadata, Status } from '../components/Core/types';
import { StatsMiddlewareState } from '../store/types';
import { Executedquery, FetchDataPayload } from './ThunksUtils';
import { ResultPayload } from '../store/slices/rowSlice';

/** Slices listen for this fulfilled type from the (historical) fetchSkeletons thunk. */
export const FETCH_SKELETONS_FULFILLED = 'fetchSkeletons/fulfilled';

export interface MetadataPayload {
  interaction?: boolean;
  data: Metadata[],
  GUID?: string;
  orig: string;
  dest: string;
}

export interface clearSelectedPayload {
  pathname: string;
  payload: erasePayload;
}

export interface erasePayload {
  Ids?: number[] | string[];
  IDs?: number[];
  route?: string;
  isShow: boolean;
}

export interface UpdatePayload {
  id: number;
  quote?: string;
  title?: string;
  ordinal?: number;
  content?: string;
  imageurl?: string;
  bannerId?: number;
  filterId?: number;
  sizeInBytes?: number;
  isDismissed?: boolean;
  isHighlighted?: boolean;
  status?: Status | number;
  descendentsSums?: Record<string, number>;
  modified?: boolean;
  edited?: boolean;
}

export interface OrdinalUpdate {
  id: number;
  ordinal: number;
  bannerIds: number[];
}

/** Negative ordinals are reserved for comment chaining and must not be sent as reorder updates. */
export const isPersistableOrdinal = (ordinal: number): boolean =>
  Number.isFinite(ordinal) && ordinal >= 0;

export const sanitizeNumericOrdinalBatch = (
  batch: Record<number, number>,
): Record<number, number> => {
  const sanitized: Record<number, number> = {};
  for (const [idStr, ordinal] of Object.entries(batch)) {
    if (isPersistableOrdinal(ordinal)) sanitized[Number(idStr)] = ordinal;
  }
  return sanitized;
};

export const sanitizeStringKeyOrdinalBatch = (
  batch: Record<string, number>,
): Record<string, number> => {
  const sanitized: Record<string, number> = {};
  for (const [key, ordinal] of Object.entries(batch)) {
    if (isPersistableOrdinal(ordinal)) sanitized[key] = ordinal;
  }
  return sanitized;
};

export interface MetadataUpdate {
  id: number;
  owner: boolean;
  ordinal: number;
  bannerId?: number;
}

const fetchedErasers: Record<string, string> = {
  "/convolution/quiz": "quiz/clearSelected",
  "/convolution/tutors": "comms/eraseTutors",
  "/convolution/course": "course/clearSelected",
  "/convolution/outgoing": "comms/eraseOutgoing",
  "/convolution/incoming": "comms/eraseIncoming",
  "/convolution/tutorial": "tutorial/clearSelected",
};

export const clearSelected = ({ pathname, payload }: clearSelectedPayload) => ({
  type: fetchedErasers[pathname],
  payload,
});

export interface InsertStatsPayload {
  screen: string;
  state: StatsMiddlewareState;
  totals: Record<string, number>;
  counts: Record<string, Record<string, number>>;
  query: Record<string, Record<string, Executedquery>>;
  requestId?: string;
}

export interface OwnershipPayload {
  ids: string[];
  owner: boolean;
  route: string;
}

export const mutateRows = createAction<MutateEntityResponse>('mutateRows');
export const linkRows = createAction<MutateEntityResponse>('linkRows');
export const hydrateRows = createAction<ResultPayload>('hydrateRows');
export const hydrateData = createAction<number>('hydrateData');

export const initTotals = createAction('initTotals');
export const insertStats = createAction<InsertStatsPayload>('insertStats');

export const fetchingCompleted = createAction<{ dest?: string, orig?: string }>('fetchingCompleted');
export const insertMetadata = createAction<MetadataPayload>('insertMetadata');
export const hydrateMetadata = createAction<MetadataPayload>('hydrateMetadata');

export const createSteps = createAction<string[]>('createSteps');
export const createQuizzes = createAction<string[]>('createQuizzes');
export const createCourses = createAction<string[]>('createCourses');
export const createTutorials = createAction<string[]>('createTutorials');
export const persistQuizzes = createAction<{ id: string; modified: boolean }[]>('persistQuizzes');
export const persistTutorials = createAction<{ id: string; modified: boolean }[]>('persistTutorials');
export const persistCourses = createAction<{ id: string; modified: boolean }[]>('persistCourses');
export const persistSteps = createAction<{ id: string; modified: boolean }[]>('persistSteps');

export const updateSteps = createAction<UpdatePayload[]>('updateSteps');
export const updateTutorials = createAction<UpdatePayload[]>('updateTutorials');
export const updateCourses = createAction<UpdatePayload[]>('updateCourses');
export const updateQuizzes = createAction<UpdatePayload[]>('updateQuizzes');
export const updateBosses = createAction<UpdatePayload[]>('updateBosses');
export const updateUnderbosses = createAction<UpdatePayload[]>('updateUnderbosses');
export const updateMinions = createAction<UpdatePayload[]>('updateMinions');

export const updateRootsMetadata = createAction<MetadataUpdate[]>('updateRootsMetadata');
export const updateQuizMetadata = createAction<MetadataUpdate[]>('updateQuizMetadata');
export const updateQuestionsMetadata = createAction<MetadataUpdate[]>('updateQuestionsMetadata');
export const updateStepsMetadata = createAction<MetadataUpdate[]>('updateStepsMetadata');
export const updateCoversMetadata = createAction<MetadataUpdate[]>('updateCoversMetadata');
export const updatePennantsMetadata = createAction<MetadataUpdate[]>('updatePennantsMetadata');
export const updateAnswersMetadata = createAction<MetadataUpdate[]>('updateAnswersMetadata');

export const UnzipAndHydrate = createAction('UnzipAndHydrate');
export const hydratedThenFetch = createAction<FetchDataPayload>('hydratedThenFetch');

export const initSettings = createAction('initSettings');
export const updateOwnerships = createAction<OwnershipPayload>('updateOwnerships');
