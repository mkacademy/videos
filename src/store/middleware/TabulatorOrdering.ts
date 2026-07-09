import { Middleware } from '@reduxjs/toolkit';
import { RootState } from '../index';
import { toggleRow, clearData, reOrderRows } from '../slices/rowSlice';
import { setTabulatorOrderStartId, resetTabulatorOrderStartId } from '../slices/sessionSlice';
import {
  expandTabulatorRowOrderRange,
  getTabulatorRouteKey,
  parseTabulatorOrderTogglePayload,
} from './TabulatorOrderingUtils';

const TabulatorOrdering: Middleware<{}, RootState> =
  ({ getState, dispatch }) =>
    (next) =>
    (action) => {
      if (clearData.match(action)) {
        dispatch(resetTabulatorOrderStartId());
        return next(action);
      }

      if (!toggleRow.match(action)) {
        return next(action);
      }

      const parsed = parseTabulatorOrderTogglePayload(action.payload);
      if (parsed === null) {
        return next(action);
      }

      const state = getState();
      const routeKey = getTabulatorRouteKey(state);

      if (parsed.intent === 'start') {
        if (!parsed.rowId) return;
        const cur = state.session.tabulatorOrderStartId[routeKey] ?? null;
        if (cur === parsed.rowId) return;
        dispatch(setTabulatorOrderStartId({ routeKey, id: parsed.rowId }));
        return;
      }

      if (parsed.intent === 'reset') {
        dispatch(setTabulatorOrderStartId({ routeKey, id: null }));
        return;
      }

      if (parsed.intent === 'end' || parsed.intent === 'group-end') {
        const anchorId = state.session.tabulatorOrderStartId[routeKey] ?? null;
        const endId = parsed.rowId;
        if (!anchorId || !endId) return;

        const { ids, direction } = expandTabulatorRowOrderRange(
          state.row,
          anchorId,
          endId,
        );
        if (ids.length < 2) {
          dispatch(setTabulatorOrderStartId({ routeKey, id: null }));
          return;
        }

        dispatch(
          reOrderRows({
            ids,
            direction,
            groupReorder: parsed.intent === 'group-end',
          }),
        );
        dispatch(setTabulatorOrderStartId({ routeKey, id: null }));
        return;
      }

      return next(action);
    };

export default TabulatorOrdering;
