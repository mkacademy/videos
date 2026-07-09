import { Middleware } from '@reduxjs/toolkit';
import { RootState } from '../index';
import {
  markIncoming,
} from '../../library/actions';
import { clearOnlyWarnings, prependError, prependWarning } from '../slices/errorSlice';
import { COMMUNICATIONS, SOURCE } from '../../utils';
import { isEditsSaveMessage } from '../../library/editSaveChunkUtils';
import { viewRequest } from '../slices/viewSlice';
import {
  mutateIncoming,
  mutateOutgoing,
  mutateTutors,
  mutateQuiz,
  mutateCourse,
  mutateTutorial,
  sendPackage,
} from '../../library/Thunks';
import { quotaUsed } from '../slices/sessionSlice';
import { incomingModified, outgoingModified, updateCommunicationStatus } from '../slices/commsSlice';
import { mutateRows as mutateRowz, linkRows as linkRowz } from '../../library/actions';
import { MutateEntitiesResponse, MutateEntityResponse } from '../../library/types';
import {
  advanceEditSaveQueue,
  clearEditSaveQueue,
  isEditSaveBatchesPending,
  isEditSaveQueueActive,
  markEditSaveBatchComplete,
} from './editSaveQueue';
import {
  isSaveEditsQueueActive,
  onSaveEditsItemComplete,
  onSaveEditsItemFailed,
  dispatchSaveEditsForAllWebapps,
} from './saveEditsQueue';
const MUTATE_RESPONSE_STAGGER_MS = 100;

export type CommunicationReply = {
  parentId: number;
  childId: number;
  status: string;
};

const parseCommunicationReply = (reply?: string): CommunicationReply | null => {
  if (typeof reply !== 'string') return null;

  const statusMatch = reply.match(/[\]\}]=([A-Z_]+)/i);
  const idRegex = /(\w+Id)\s*=\s*(\d+)/gi;
  const ids: number[] = [];

  let match: RegExpExecArray | null;
  while (ids.length < 2 && (match = idRegex.exec(reply)) !== null) {
    ids.push(Number(match[2]));
  }

  if (ids.length < 2 || !statusMatch) return null;

  return {
    childId: ids[1],
    parentId: ids[0],
    status: statusMatch[1],
  };
};

const MessageReader: Middleware<{}, RootState> = ({ dispatch, getState }) =>
  (next) => (action) => {
    if (markIncoming.match(action)) {
      const state = getState();
      const { incoming, tutors } = state.comms;
      const { requestIsProcessing } = state.view;

      if (requestIsProcessing) return next(action);

      const curMailer = tutors.find(({ checked }) => checked);
      const modified = incoming?.filter(({ isModified }) => isModified);

      if (curMailer && modified && modified.length > 0) {
        const { curToken, mutateRole, quota } = state.session;
        dispatchSaveEditsForAllWebapps(dispatch, 'incoming', {
          incoming: {
            marked: modified.map(({ id, type, status }) => ({ id, type, status })),
            curMailer: curMailer.id,
            mutateRole,
            curToken,
            quota,
          },
        });
        return;
      } else if (curMailer) {
        const { curToken, mutateRole, quota } = state.session;
        dispatchSaveEditsForAllWebapps(dispatch, 'incoming', {
          incoming: { curMailer: curMailer.id, mutateRole, curToken, quota },
        });
        return;
      } else {
        const error = "no sender selected, saving aborted";
        return next(prependError(error));
      }
    }

    if (linkRowz.match(action)) {
      const state = getState();
      const { payload } = action;
      const { message, requestIsProcessing } = state.view;
      if (requestIsProcessing && isEditsSaveMessage(message)) {
        const { route, ...response } = payload;
        console.log(response);
        if (response.task === SOURCE)
          setTimeout(() => dispatch(incomingModified()));
        else if (response.task === COMMUNICATIONS)
          setTimeout(() => dispatch(outgoingModified()));
      }
      else {
        // const example = {
        //   reply: "success,[],[],{MinionFilterId [minionId=7, filterId=59, userRoleId=UserRoleId [userId=3, roleId=3]]=RESENT},2025-11-20T08:47:46.698356",
        //   route: "minionsfilters",
        //   task: "communications",
        // };
        const { reply, task } = payload;
        if (task === COMMUNICATIONS) {
          const desiredObj = parseCommunicationReply(reply);
          if (desiredObj) dispatch(updateCommunicationStatus(desiredObj));
        }
      }
      return next(action);
    }

    if (sendPackage.fulfilled.match(action) ||
      mutateOutgoing.fulfilled.match(action) ||
      mutateTutors.fulfilled.match(action) ||
      mutateQuiz.fulfilled.match(action) ||
      mutateCourse.fulfilled.match(action) ||
      mutateTutorial.fulfilled.match(action) ||
      mutateIncoming.fulfilled.match(action)) {
      const { payload } = action;
      const { message, requestIsProcessing } = getState().view;
      if (requestIsProcessing && isEditsSaveMessage(message)) {
        console.log("mutateEntities.fulfilled.type:", action);
        const responseCount = payload.length;
        dispatch(clearOnlyWarnings());
        payload.forEach((response: MutateEntitiesResponse, index: number) => {
          setTimeout(() => {
            switch (response.type) {
              case 'quota_used': {
                const parsed = parseInt(response.payload as string, 10);
                dispatch(quotaUsed(parsed));
                break;
              }
              case 'mutate_rows':
                dispatch(mutateRowz(response.payload as MutateEntityResponse));
                break;
              case 'link_rows':
                dispatch(linkRowz(response.payload as MutateEntityResponse));
                break;
              case 'error': {
                const reply = response.payload as MutateEntityResponse | string;
                const messageText = typeof reply === 'string' ? reply : reply.reply;
                dispatch(prependError(messageText ?? null));
                break;
              }
              case 'warning': {
                const reply = response.payload as MutateEntityResponse | string;
                const messageText = typeof reply === 'string' ? reply : reply.reply;
                dispatch(prependWarning(messageText ?? null));
                break;
              }
              case 'terminate_recursion':
                markEditSaveBatchComplete();
                if (!isEditSaveBatchesPending()) {
                  const shouldComplete = onSaveEditsItemComplete(dispatch);
                  if (shouldComplete) {
                    dispatch(viewRequest({ completed: true }));
                  }
                }
                break;
              default:
                console.log("invalid response:", response);
                break;
            }
          }, index * MUTATE_RESPONSE_STAGGER_MS);
        });

        if (isEditSaveQueueActive()) {
          const advanceDelay = responseCount > 0
            ? responseCount * MUTATE_RESPONSE_STAGGER_MS
            : MUTATE_RESPONSE_STAGGER_MS;
          setTimeout(() => advanceEditSaveQueue(dispatch, getState), advanceDelay);
        }
      }
      return next(action);
    }

    if (mutateOutgoing.rejected.match(action) ||
      mutateTutors.rejected.match(action) ||
      mutateQuiz.rejected.match(action) ||
      mutateCourse.rejected.match(action) ||
      mutateTutorial.rejected.match(action) ||
      mutateIncoming.rejected.match(action)) {
      const state = getState();
      console.log("mutateEntities.rejected.type:", action);
      const { requestIsProcessing, message } = state.view;
      if (requestIsProcessing && isEditsSaveMessage(message)) {
        if (isSaveEditsQueueActive()) {
          onSaveEditsItemFailed();
        } else {
          clearEditSaveQueue();
        }
        setTimeout(() => dispatch(prependError('Failed to save edits, contact admin')));
        setTimeout(() => dispatch(viewRequest({ completed: true })));
      }
      return next(action);
    }

    return next(action);
  };

export default MessageReader;