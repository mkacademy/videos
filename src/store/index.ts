import { configureStore } from '@reduxjs/toolkit';
import actionReducer from './slices/actionSlice';
import sessionReducer from './slices/sessionSlice';
import commsReducer from './slices/commsSlice';
import contentReducer from './slices/contentSlice';
import statsReducer from './slices/statsSlice';
import decendentReducer from './slices/decendentSlice';
import errorReducer from './slices/errorSlice';
import interactionReducer from './slices/interactionSlice';
import courseReducer from './slices/courseSlice';
import paginationReducer from './slices/paginationSlice';
import quizReducer from './slices/quizSlice';
import responseReducer from './slices/responseSlice';
import rowReducer from './slices/rowSlice';
import searchReducer from './slices/searchSlice';
import settingsReducer from './slices/settingsSlice';
import sidebarReducer from './slices/sidebarSlice';
import stashReducer from './slices/stashSlice';
import textReducer from './slices/textSlice';
import traversalReducer from './slices/traversalSlice';
import tutorialReducer from './slices/tutorialSlice';
import viewReducer from './slices/viewSlice';
import commentsReducer from './slices/commentsSlice';
import playbackReducer from './slices/playbackSlice';
import { preThunkMiddleware, postThunkMiddleware } from './middleware';

export const store = configureStore({
  reducer: {
    action: actionReducer,
    session: sessionReducer,
    comms: commsReducer,
    content: contentReducer,
    stats: statsReducer,
    decendent: decendentReducer,
    error: errorReducer,
    interaction: interactionReducer,
    course: courseReducer,
    pagination: paginationReducer,
    quiz: quizReducer,
    response: responseReducer,
    row: rowReducer,
    search: searchReducer,
    settings: settingsReducer,
    sidebar: sidebarReducer,
    stash: stashReducer,
    text: textReducer,
    traversal: traversalReducer,
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
export type AppDispatch = typeof store.dispatch; 