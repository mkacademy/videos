import { Middleware } from '@reduxjs/toolkit';
import updateStepsImageurlGuard from './updateStepsImageurlGuard';
import cascadingUnstasher from './cascadingUnstasher.ts';
import BlobsManager from './BlobsManagerPQR';
import DismissalsManager from './DismissalsManagerOPQ';
import controlPanel from './controlPanelXYZ';
import HydrationManager from './HydrationManager';

// Define the middleware chain before Redux Thunk
export const preThunkMiddleware: Middleware[] = [
  updateStepsImageurlGuard,
  cascadingUnstasher,
  BlobsManager,
];

// Define the middleware chain after Redux Thunk
export const postThunkMiddleware: Middleware[] = [
  DismissalsManager,
  controlPanel,
  HydrationManager,
];
