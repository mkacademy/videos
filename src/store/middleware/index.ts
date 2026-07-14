import { Middleware } from '@reduxjs/toolkit';
import updateStepsImageurlGuard from './updateStepsImageurlGuard';
import cascadingUnstasher from './cascadingUnstasher.ts';
import BlobsManager from './BlobsManagerPQR';
import UrlDataMatcher, { InsertGUID } from './UrlDataMatcherYZA';
import settingsInitializer from './settingsInitializerIJK';
import DismissalsManager from './DismissalsManagerOPQ';
import controlPanel from './controlPanelXYZ';
import { statsMiddleware } from './statsMiddleware';
import HydrationManager from './HydrationManager';

// Define the middleware chain before Redux Thunk
export const preThunkMiddleware: Middleware[] = [
  statsMiddleware,
  updateStepsImageurlGuard,
  cascadingUnstasher,
  BlobsManager,
];

// Define the middleware chain after Redux Thunk
export const postThunkMiddleware: Middleware[] = [
  InsertGUID,
  UrlDataMatcher,
  settingsInitializer,
  DismissalsManager,
  controlPanel,
  HydrationManager,
];
