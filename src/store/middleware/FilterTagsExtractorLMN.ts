import { Middleware } from '@reduxjs/toolkit';
import { contentDelay } from '../../constants';
import { REMOVE_ROWS } from '../../utils';
import {
  viewYoinks,
} from '../slices/viewSlice';
import {
  setFoundationRows,
  extractKeywords,
} from '../../library/actions';
import { removeContent } from '../slices/contentSlice';
import { removeRows } from '../slices/rowSlice';
import { clickInteractions, unclickInteractions } from '../slices/interactionSlice';
import { RootState } from '../types';

const FilterTagsExtractor: Middleware<{}, RootState> = (store) => (next) => (action) => {
  if (extractKeywords.match(action)) {
    const state = store.getState();
    const {
      view: { pages, yoinks, fetchedData: texts = [] },
    } = state;

    const predicate = (prev: string[], text: { keywords?: string[] }) => [...prev, ...(text.keywords || [])];
    const allkeys = new Set([
      ...texts.reduce(predicate, []),
      ...pages,
      ...yoinks,
    ]);

    const declare = (k: string) => pages.findIndex((p: string) => p === k) === -1;
    const keywords = [...allkeys].filter(declare);

    return next(viewYoinks(keywords));
  }

  if (setFoundationRows.match(action)) {
    const { payload } = action;
    const { operation } = payload || {};
    if (operation === REMOVE_ROWS) {
      const state = store.getState();
      const { row: rows } = state;
      const ids = rows.filter((r) => r.checked).map(({ id }) => id);
      const parsedIds = ids.map((id) => parseInt(id.toString()));

      setTimeout(() => store.dispatch(removeContent(parsedIds)));
      return next(removeRows(ids));
    } else {
      return next(action);
    }
  }

  if (clickInteractions.match(action)) {
    const state = store.getState();
    const { row: rows } = state;

    setTimeout(() => store.dispatch(unclickInteractions()), contentDelay + 1000);
    const ids = rows.filter((r) => r.checked).map(({ id }) => id);
    const parsedIds = ids.map((id) => parseInt(id));

    return next(clickInteractions(parsedIds));
  }

  return next(action);
};

export default FilterTagsExtractor; 