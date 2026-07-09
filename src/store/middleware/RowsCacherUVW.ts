import { Middleware } from '@reduxjs/toolkit';
import { RootState } from '../types';
import {
  cacheContent,
  appendTraversals,
} from '../../library/actions';
import { appendTraversal } from '../slices/traversalSlice';
import { appendRoute as stashRows, StashPayload } from '../slices/stashSlice';
import { selectContent as contentPicker } from '../slices/contentSlice';
import { selectRows as tabularPicker } from '../slices/rowSlice';
import { DataRow } from '../../components/Core/types';

const RowsCacher: Middleware<{}, RootState> = ({ getState, dispatch }) => (next) => (action) => {
  if (cacheContent.match(action)) {
    const { payload } = action;
    const state = getState();
    const {
      content: texts,
      settings: { cacher },
      view: { entity: to, parent: from },
      session: { isPrivate, isIncognito },
    } = state;

    const isImported = !isPrivate && !isIncognito
    const content = texts.filter((content: DataRow) => content.checked === true);
    const contentIds = content.map(({ id }) => ({
      id: id.toString(),
      checked: false,
    }));
    const identities = { urlID: payload, contentIds: contentIds.map(({ id }) => parseInt(id)) };
    const stash: StashPayload = {
      approute: (from || '') + (to || ''),
      timestamp: new Date().toLocaleTimeString(),
      content: isImported ? content.map((row: DataRow) => ({ ...row, metadata: undefined })) : content,
    };

    if (contentIds.length === 0) return next(action);

    if (cacher === "ids") {
      setTimeout(() => dispatch(tabularPicker(contentIds)));
      setTimeout(() => dispatch(contentPicker(content.map(c => ({ id: c.id, checked: false })))));
      return next(appendTraversal(identities));
    } else if (cacher === "rows") {
      setTimeout(() => dispatch(tabularPicker(contentIds)));
      setTimeout(() => dispatch(contentPicker(content.map(c => ({ id: c.id, checked: false })))));
      return next(stashRows(stash));
    } else {
      setTimeout(() => dispatch(tabularPicker(contentIds)));
      setTimeout(() => dispatch(contentPicker(content.map(c => ({ id: c.id, checked: false })))));
      setTimeout(() => dispatch(stashRows(stash)));
      return next(appendTraversal(identities));
    }
  }

  if (appendTraversals.match(action)) {
    const { payload } = action;
    if (Array.isArray(payload)) {
      payload.forEach((traversal) => {
        const action = appendTraversal(traversal);
        setTimeout(() => dispatch(action));
      });
    }
    return next(action);
  }

  return next(action);
};

export default RowsCacher; 