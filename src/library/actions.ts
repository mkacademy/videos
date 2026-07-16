import { createAction } from '@reduxjs/toolkit';
import { Metadata } from '../components/Core/types';
import { FetchDataPayload } from './ThunksUtils';
import { ResultPayload } from '../store/slices/rowSlice';

export interface MetadataPayload {
  interaction?: boolean;
  data: Metadata[],
  GUID?: string;
  orig: string;
  dest: string;
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
  status?: number;
  descendentsSums?: Record<string, number>;
  modified?: boolean;
  edited?: boolean;
}

export interface MetadataUpdate {
  id: number;
  owner: boolean;
  ordinal: number;
  bannerId?: number;
}

export const hydrateRows = createAction<ResultPayload>('hydrateRows');
export const hydrateData = createAction<number>('hydrateData');

export const fetchingCompleted = createAction<{ dest?: string, orig?: string }>('fetchingCompleted');
export const insertMetadata = createAction<MetadataPayload>('insertMetadata');
export const hydrateMetadata = createAction<MetadataPayload>('hydrateMetadata');

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
