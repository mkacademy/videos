import { configureStore } from '@reduxjs/toolkit';
import type { ThunkDispatch, UnknownAction } from '@reduxjs/toolkit';
import sessionReducer from './slices/sessionSlice';
import commsReducer from './slices/commsSlice';
import statsReducer from './slices/statsSlice';
import errorReducer from './slices/errorSlice';
import interactionReducer from './slices/interactionSlice';
import courseReducer from './slices/courseSlice';
import paginationReducer from './slices/paginationSlice';
import quizReducer from './slices/quizSlice';
import rowReducer from './slices/rowSlice';
import searchReducer from './slices/searchSlice';
import settingsReducer from './slices/settingsSlice';
import textReducer from './slices/textSlice';
import tutorialReducer from './slices/tutorialSlice';
import viewReducer from './slices/viewSlice';
import commentsReducer from './slices/commentsSlice';
import playbackReducer from './slices/playbackSlice';
import { preThunkMiddleware, postThunkMiddleware } from './middleware';

export const store = configureStore({
  reducer: {
    session: sessionReducer,
    comms: commsReducer,
    stats: statsReducer,
    error: errorReducer,
    interaction: interactionReducer,
    course: courseReducer,
    pagination: paginationReducer,
    quiz: quizReducer,
    row: rowReducer,
    search: searchReducer,
    settings: settingsReducer,
    text: textReducer,
    tutorial: tutorialReducer,
    view: viewReducer,
    comments: commentsReducer,
    playback: playbackReducer,
  },
  middleware: (getDefaultMiddleware) => 
    getDefaultMiddleware({
      thunk: true,
      serializableCheck: { warnAfter: 128 },
    })
      .prepend(...preThunkMiddleware)
      .concat(...postThunkMiddleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = ThunkDispatch<RootState, unknown, UnknownAction>; 