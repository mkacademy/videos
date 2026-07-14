import { SearchState } from './slices/searchSlice';
import { SessionState } from './slices/sessionSlice';
import { ViewState } from './slices/viewSlice';
import { ErrorState } from './slices/errorSlice';
import { CourseState } from './slices/courseSlice';
import { PaginationState } from './slices/paginationSlice';
import { QuizState } from './slices/quizSlice';
import { TutorialState } from './slices/tutorialSlice';
import { CommsState } from './slices/commsSlice';
import { TextState } from './slices/textSlice';
import { RowState } from './slices/rowSlice';
import { InteractionState } from './slices/interactionSlice';
import { SettingsState } from './slices/settingsSlice';
import { StatsState } from './slices/statsSlice';
import { CommentsState } from './slices/commentsSlice';
import { PlaybackState } from './slices/playbackSlice';
import type { ThunkDispatch, UnknownAction } from '@reduxjs/toolkit';

export interface RootState {
  session: SessionState;
  view: ViewState;
  error: ErrorState;
  comms: CommsState;
  tutorial: TutorialState;
  course: CourseState;
  quiz: QuizState;
  pagination: PaginationState;
  search: SearchState;
  text: TextState;
  row: RowState;
  interaction: InteractionState;
  settings: SettingsState;
  stats: StatsState;
  comments: CommentsState;
  playback: PlaybackState;
}

export interface QueryParams {
  type?: string;
  IDs?: number[];
  entity?: string;
  webapp?: string;
  parent?: string;
  hasCounts?: boolean;
  convolution?: string;
  isPrivateView?: boolean
  seek?: number[] | string;
  curToken?: string | null;
  mutateRole?: string | null;
  mailer?: number | undefined;
  limit?: { take: number | undefined; skip: number | undefined };
}

export type AppDispatch = ThunkDispatch<RootState, unknown, UnknownAction>;

export interface StatsMiddlewareState {
  session: {
    curApp: SessionState['curApp'];
    curMailer: SessionState['curMailer'];
  };
  search: {
    selectedRoute: SearchState['selectedRoute'];
  };
  pagination: {
    selectedRoutes: PaginationState['selectedRoutes'];
  };
  tutorial: {
    selected: TutorialState['selected'];
    banners: TutorialState['banners'];
  };
  course: {
    selected: CourseState['selected'];
    banners: CourseState['banners'];
  };
  quiz: {
    selected: QuizState['selected'];
    banners: QuizState['banners'];
    quizzes: QuizState['quizzes'];
  };
}

export interface CacheTotalsMiddlewareState {
  session: {
    curApp: SessionState['curApp'];
    curMailer: SessionState['curMailer'];
  };
  search: {
    selectedRoute: SearchState['selectedRoute'];
  };
  stats: {
    totals: StatsState['totals'];
  };
  pagination: {
    selectedRoutes: PaginationState['selectedRoutes'];
  };
  tutorial: {
    banners: TutorialState['banners'];
    selected: TutorialState['selected'];
  };
  course: {
    banners: CourseState['banners'];
    selected: CourseState['selected'];
  };
  quiz: {
    quizzes: QuizState['quizzes'];
    banners: QuizState['banners'];
    selected: QuizState['selected'];
  };
} 