import { Middleware } from '@reduxjs/toolkit';
import { saveEdits } from '../../library/actions';
import { RootState } from '../index';
import {
  enqueueSaveEdits,
  isSaveEditsQueueActive,
  startNextSaveEdits,
} from './saveEditsQueue';

const SaveQueuesManager: Middleware<{}, RootState> = ({ dispatch }) => (next) => (action) => {
  if (saveEdits.match(action)) {
    enqueueSaveEdits(action.payload);
    if (!isSaveEditsQueueActive())
      startNextSaveEdits(dispatch);
    return;
  }
  return next(action);
};

export default SaveQueuesManager;
