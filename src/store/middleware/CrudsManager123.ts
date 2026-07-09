import { Middleware } from '@reduxjs/toolkit';
import { RootState } from '../types';
import {
  createMocks,
  extractMocks,
  showForms,
  unzipContent,
  zipContent,
  rezipContent,
  rezipOutgoing,
  deleteOverview,
  destroyOverview,
  finalizeUnjoin,
  zipOverview,
  createOrdering,
  draftOutgoing,
  clearSelected,
  extractContent,
  reshowAlgorithm,
  showAlgorithm,
  unzipRecords,
  zipRecords,
} from '../../library/actions';
import { clearEscrow, viewPayload } from '../slices/viewSlice';
import { prependError } from '../slices/errorSlice';
import {
  buildOutgoingZipUpdate,
  getOutgoingUpdateAction,
  getRezipOutgoingMessage,
  outgoingMessageKey,
  rezipErrorMessageMissing,
  rezipErrorNoZipData,
} from '../../library/rezipUtils';
import { setCrudUrl } from '../slices/sessionSlice';
import { getCommIds, RouteType } from '../../library/commsUtils';
import createValidTexts from '../../library/CrudsManagerUtils';
import { appendRoute as stashRows, removeTimestamp as unstashRows } from '../slices/stashSlice';
import { deletedTimestamp, escrowTimestamp, getCurAppName, getCurSource, isPncUserApp } from '../../utils';
import { userApps } from '../../constants';
import { DataRow } from '../../components/Core/types';

export interface PayloadWithFromTo {
  from: string;
  to: string;
}

export interface PayloadWithPath {
  path: string;
  parentApp: number;
}

const CrudsManager: Middleware<{}, RootState> = ({ dispatch, getState }) => (next) => (action) => {
  if (unzipContent.match(action)) {
    const state = getState();
    const {
      session: { curApp: source },
      settings: { dismisstype },
    } = state;
    const unzipPayload = {
      source: getCurAppName(source),
      dismisstype,
    };
    console.log("--unzipping---");
    return next(unzipRecords(unzipPayload));
  }

  if (zipContent.match(action)) {
    console.log("--recipients---");
    const pred = ([_, value]: [string, string]) => "tutors" === value.toLowerCase();
    const memberApp = Object.entries(userApps).find(pred);
    const zipPayload: PayloadWithPath = {
      path: "/convolution/tutors",
      parentApp: parseInt(memberApp![0]),
    };
    dispatch(setCrudUrl(zipOverview.type));
    return next(reshowAlgorithm(zipPayload));
  }

  if (rezipContent.match(action)) {
    const state = getState();
    const {
      comms: { outgoing },
      session: { curApp },
      settings: { dismisstype },
    } = state;
    const selection = getRezipOutgoingMessage(outgoing);
    if ('error' in selection) return next(prependError(selection.error));
    const { message, from, to } = selection;
    const targetIds = (message.targets ?? []).map(String);
    dispatch(viewPayload({
      entity: to,
      parentData: {
        parent: from,
        IDs: targetIds,
        curApp,
      },
    }));
    const cargo = {
      source: getCurSource(to),
      dismisstype,
    };
    console.log("--rezipping---");
    dispatch(zipRecords(cargo));
    dispatch(rezipOutgoing({
      from,
      to,
      messageKey: outgoingMessageKey(message),
    }));
    return next(clearEscrow());
  }

  if (rezipOutgoing.match(action)) {
    const state = getState();
    const { messageKey } = action.payload;
    const { fetchedData = [] } = state.view;
    if (fetchedData.length === 0) return next(action);
    const encodedData = (fetchedData[0] as DataRow).purpose;
    if (!encodedData) return next(prependError(rezipErrorNoZipData));
    const message = state.comms.outgoing.find((row) => outgoingMessageKey(row) === messageKey);
    if (!message) return next(prependError(rezipErrorMessageMissing));
    const updateAction = getOutgoingUpdateAction(message.type);
    if (!updateAction) return next(prependError(rezipErrorMessageMissing));
    dispatch(updateAction([buildOutgoingZipUpdate(message.id, encodedData)]));
    dispatch(prependError('Re-zipped outgoing message'));
    return next(clearEscrow());
  }

  if (zipOverview.match(action)) {
    const state = getState();
    const { payload } = action;
    const { from, to } = payload;
    const { dismisstype } = state.settings;
    const cargo = {
      source: getCurSource(to),
      dismisstype,
    };
    console.log("--zipping---");
    dispatch(zipRecords(cargo));
    console.log("--drafting---");
    dispatch(draftOutgoing({ from, to }));
    return next(clearEscrow());
  }

  if (draftOutgoing.match(action)) {
    const state = getState();
    const { payload } = action;
    const { from, to } = payload;
    const {
      session: { curApp: source },
      view: { fetchedData: zippedData = [] },
    } = state;
    if (zippedData.length === 0) return next(action);
    const curApproute = from + to;
    const stash = {
      content: zippedData,
      approute: curApproute,
      timestamp: escrowTimestamp,
    };
    console.log("--stashing---");
    dispatch(stashRows(stash));
    const frieght = {
      destination: getCurAppName(source),
      timestamp: escrowTimestamp,
      approute: curApproute,
      selecttype: false,
    };
    console.log("--inserting---");
    dispatch(extractContent(frieght));
    const cargo = {
      timestamp: escrowTimestamp,
      approute: curApproute,
    };
    console.log("--unstashing---");
    return next(dispatch(unstashRows(cargo)));
  }

  if (deleteOverview.match(action)) {
    const { payload } = action;
    dispatch(setCrudUrl(destroyOverview.type));
    return next(showAlgorithm(payload));
  }

  if (destroyOverview.match(action)) {
    const state = getState();
    if (isPncUserApp(state.session.curApp)) {
      const { view: { fetchedData: childData = [] } } = state;
      if (childData.length === 0) return next(clearEscrow());
      const { from, to } = action.payload;
      return dispatch(
        finalizeUnjoin({
          childData,
          to,
          from,
          parentData: [],
        })
      );
    }
    const {
      session: { dismissals },
      view: { fetchedData },
    } = state;
    const { payload } = action;
    const { from, to } = payload;
    const curApproute = from + to;
    const stash = {
      approute: curApproute,
      content: fetchedData ?? [],
      timestamp: deletedTimestamp,
    };
    console.log("--stashing---");
    dispatch(stashRows(stash));
    console.log("--clearing---");
    const pathname = window.location.pathname;
    const isShow = dismissals[pathname] ?? false;
    const dismised = getCommIds(fetchedData, curApproute as RouteType);
    const freight = { route: curApproute, Ids: dismised, isShow };
    dispatch(clearSelected({ pathname, payload: freight }));
    return next(clearEscrow());
  }

  if (createMocks.match(action)) {
    const { payload } = action;
    dispatch(setCrudUrl(extractMocks.type));
    return next(showAlgorithm(payload));
  }

  if (createOrdering.match(action)) {
    const { payload } = action;
    dispatch(setCrudUrl(""));
    return next(showAlgorithm(payload));
  }

  if (extractMocks.match(action)) {
    const { payload } = action;
    const state = getState();
    const { from, to } = payload;
    const {
      content: texts,
      session: { curApp: source },
      view: { entity: curTo, parent: curFrom },
    } = state;
    const curApproute = from + to;
    const webapp = getCurAppName(source) as "tutorial" | "course" | "quiz";
    const prevApproute = (curFrom || '') + (curTo || '');
    const isValid = curApproute === prevApproute;
    const userCreatedRows = texts.filter((row: DataRow) => parseInt(row.id.toString()) < 0);
    const content =
      !isValid || userCreatedRows.length === 0
        ? createValidTexts({ state, from, to, webapp, dispatch })
        : userCreatedRows;
    const stash = {
      content,
      approute: curApproute,
      timestamp: escrowTimestamp,
    };
    if (content.length === 0)
      return next(clearEscrow());
    console.log("--stashing---");
    dispatch(stashRows(stash));
    const frieght = {
      destination: getCurAppName(source),
      timestamp: escrowTimestamp,
      approute: curApproute,
      selecttype: false,
    };
    console.log("--inserting---");
    dispatch(extractContent(frieght));
    const cargo = {
      timestamp: escrowTimestamp,
      approute: curApproute,
    };
    console.log("--unstashing---");
    dispatch(unstashRows(cargo));
    return next(clearEscrow());
  }

  if (showForms.match(action)) {
    const { payload } = action;
    dispatch(setCrudUrl("/formulator/"));
    return next(showAlgorithm(payload));
  }

  return next(action);
};

export default CrudsManager; 