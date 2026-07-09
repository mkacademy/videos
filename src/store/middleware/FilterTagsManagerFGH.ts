import { Middleware } from '@reduxjs/toolkit';
import { RootState } from '../index';
import {
  viewKeyIds,
  viewKeywords,
} from '../slices/viewSlice';
import {
  updateRowMetadata,
} from '../slices/textSlice';
import {
  matchKeyword,
  matchKeyId,
  unmatchKeyword,
  unmatchKeyId,
} from '../../library/actions';
import { selectRows, Row } from '../slices/rowSlice';
import { selectContent } from '../slices/contentSlice';
import { getInteractionIDs, REMOVE_ROWS } from '../../utils';
import { DataRow } from '../../components/Core/types';

interface CalcPropsReturn {
  texts: DataRow[];
  rows: Row[];
  kind: string;
  buzzwords: string[];
  parent: string;
}

const checkItems = (bool: boolean) => (item: DataRow | Row): DataRow | Row => ({ ...item, checked: bool, frozen: bool });

const transformer = (texts: DataRow[]) => (r: Row): boolean =>
  texts.findIndex((t) => t.id.toString() === r.id) > -1;

const keys = ["text", selectRows.type, "content", selectContent.type];

const affirm = (keyword: string) => (item: DataRow): boolean => item.keywords?.includes(keyword) || false;

const signify = (item: DataRow) => (keyword: string): boolean => item.keywords?.includes(keyword) || false;

const declare = (r: DataRow) => (R: DataRow): boolean => R.id === r.id;

const length = Math.floor(keys.length / 2);

const calcProps = (state: RootState, selector: "keywords" | "keyids"): CalcPropsReturn => {
  const { session: sessionReducer, view: viewReducer, row: rowReducer } = state;
  const { prefix, parent } = sessionReducer;
  const buzzwords = viewReducer[selector];
  const offset = !prefix.endsWith("app/") ? 0 : length;
  const [reducer, SELECTOR] = keys.slice(0 + offset, length + offset);

  return {
    texts: reducer === "text" ? state.text.map((t: DataRow) => ({
      ...t,
      id: parseInt(t.id.toString()),
      keywords: t.keywords || [],
      metadata: t.metadata || ({} as DataRow['metadata'])
    })) : state.content,
    rows: rowReducer,
    kind: SELECTOR,
    buzzwords: buzzwords.map((b) => b.toString()),
    parent: parent || '',
  };
};

const FilterTagsManager: Middleware<{}, RootState> = ({ dispatch, getState }) => (next) => (action) => {
  if (matchKeyword.match(action)) {
    const state = getState();
    const { payload: keyword } = action;
    const params: [RootState, "keywords"] = [state, "keywords"];
    const { texts, kind, rows, buzzwords } = calcProps(...params);

    if (buzzwords.includes(keyword)) {
      const payload = `already selected ... duplicate keyword, ${buzzwords}`;
      return next({ type: "VIEW_ERROR", payload });
    }

    const keywords = [...new Set([keyword, ...buzzwords])];
    const nominees = texts.filter(affirm(keyword));
    const payload =
      kind === selectContent.type
        ? nominees.map(checkItems(true)) as DataRow[]
        : rows.filter(transformer(nominees)).map(checkItems(true)) as Row[];

    setTimeout(() => dispatch(viewKeywords(keywords)));

    return next({
      type: kind,
      payload,
    });
  }

  if (unmatchKeyword.match(action)) {
    const state = getState();
    const { payload: keyword } = action;
    const params: [RootState, "keywords"] = [state, "keywords"];
    const { texts, kind, rows, buzzwords, parent } = calcProps(...params);

    if (buzzwords.length === 0) {
      const payload = "removed keyword not selected ... unmatch aborted";
      return next({ type: "VIEW_ERROR", payload });
    }

    const keywords = buzzwords.filter((k) => k !== keyword);
    const pred = (item: DataRow) => keywords.findIndex(signify(item)) > -1;
    const rejects = texts.filter(affirm(keyword));
    const nominees = texts.filter(pred);
    const imply = (r: DataRow) => nominees.findIndex(declare(r)) === -1;
    const candidates = rejects.filter(imply);
    const { keyids } = state.view;
    const { parentID } = getInteractionIDs(parent, '');
    const premise = (r: DataRow) => (keyID: string) => parentID && r.metadata?.[parentID]?.includes(keyID);
    const establish = (item: DataRow) => keyids.findIndex((keyID) => premise(item)(keyID.toString())) === -1;
    const selecteds = candidates.filter(establish);
    const payload =
      kind === selectContent.type
        ? selecteds.map(checkItems(false)) as DataRow[]
        : rows.filter(transformer(selecteds)).map(checkItems(false)) as Row[];

    setTimeout(() => dispatch(viewKeywords(keywords)));

    return next({
      type: kind,
      payload,
    });
  }

  if (matchKeyId.match(action)) {
    const state = getState();
    const { payload: keyID } = action;
    const params: [RootState, "keyids"] = [state, "keyids"];
    const {
      rows,
      texts,
      kind,
      parent,
      buzzwords: keyids,
    } = calcProps(...params);

    const id = parseInt(keyID);
    const { parentID } = getInteractionIDs(parent, '');
    const pred = (r: DataRow) => {
      const metadata = r.metadata;
      const metadataId: number[] = metadata?.[parentID ?? '']
        ?.map((id: string | number) => parseInt(id.toString()));
      return metadataId?.includes(id)
    };
    const nominees = texts.filter(pred);
    const payload =
      kind === selectContent.type
        ? nominees.map(checkItems(true))
        : rows.filter(transformer(nominees)).map(checkItems(true));

    if (!keyids.includes(keyID)) keyids.push(keyID);

    setTimeout(() => dispatch(viewKeyIds(keyids.map((keyID) => parseInt(keyID)))));

    return next({
      type: kind,
      payload,
    });
  }

  if (unmatchKeyId.match(action)) {
    const state = getState();
    const { payload: keyID } = action;
    const params: [RootState, "keyids"] = [state, "keyids"];
    const {
      rows,
      kind,
      texts,
      parent,
      buzzwords: keyids,
    } = calcProps(...params);

    if (keyids.length === 0) {
      const payload = "removed keyId not selected ... unmatch aborted";
      return next({ type: "VIEW_ERROR", payload });
    }
    const id = parseInt(keyID);
    const { parentID } = getInteractionIDs(parent, '');
    const pred = (r: DataRow) => {
      const metadata = r.metadata;
      const metadataId: number[] = metadata?.[parentID ?? '']
        ?.map((id: string | number) => parseInt(id.toString()));
      return metadataId?.includes(id)
    };
    const cargo = keyids.filter((k) => k !== keyID);
    const pred0 = (item: DataRow) => {
      const metadataId: number[] = item.metadata?.[parentID ?? '']
        ?.map((id: string | number) => parseInt(id.toString()));
      for (let index = 0; index < cargo.length; index++)
        if (metadataId?.includes(parseInt(cargo[index].toString()))) return false;
      return true;
    };
    const candidates = texts.filter(pred).filter(pred0);
    const { keywords } = state.view;
    const imply = (r: DataRow) => keywords.findIndex(signify(r)) === -1;
    const nominees = candidates.filter(imply);
    const payload =
      kind === selectContent.type
        ? nominees.map(checkItems(false)) as DataRow[]
        : rows.filter(transformer(nominees)).map(checkItems(false)) as Row[];

    setTimeout(() => dispatch(viewKeyIds(cargo.map((keyID) => parseInt(keyID.toString())))));

    return next({
      type: kind,
      payload,
    });
  }

  if (updateRowMetadata.match(action)) {
    const {
      payload: { evaluators: { parentIdsCount, operation }, delayTime, ...cargo },
    } = action;
    const checkedIds = getState()
      .row.filter(evaluator(operation, parentIdsCount))
      .map((row: Row) => row.id);

    if (cargo.operation === REMOVE_ROWS)
      setTimeout(() => {
        console.log("unmatching was delayed by - ", delayTime);
        dispatch(unmatchKeyId(cargo.parentId.toString()));
      }, delayTime);

    return next({
      type: updateRowMetadata.type,
      payload: { ...cargo, checkedIds },
    });
  }

  return next(action);
};

const evaluator = (operation: string, parentIdsCount: number) => (row: Row): boolean => {
  return operation === REMOVE_ROWS && parentIdsCount > 0
    ? row.checked && row.frozen
    : row.checked && !row.frozen;
}

export default FilterTagsManager;