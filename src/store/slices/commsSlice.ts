import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import {
  createSteps,
  createTutorials,
  persistSteps,
  persistTutorials,
  updateSteps,
  updateTutorials,
  updateQuizzes,
  updateCourses,
  erasePayload,
  createQuizzes,
  persistQuizzes,
  persistCourses,
  createCourses,
  updateMinions,
  updateUnderbosses,
  updateBosses,
  updateOwnerships,
} from '../../library/actions';
import { signedOut } from './sessionSlice';
import { finalizer, orderPredicate, contiguousOrdinalPred, textsMergerComms, idsMergerComms } from '../../library/sliceUtils';
import {
  mergeOutgoingMessages,
  bossPred,
  createCommsStartIdInitial,
  deletedPred,
  inDashPred,
  inFilPred,
  inIntrPred,
  inSiftPred,
  minionPred,
  outDashPred,
  outFilPred,
  outIntrPred,
  outSiftPred,
  underbossPred,
  applyUpdateCommsOwnership,
  type IncomingMessage,
  type OutgoingMessage,
  type Tutor,
  CommsState,
} from '../../library/commsUtils';
import { showInfos } from '../../constants';
import { CommunicationReply } from '../middleware/MessageReaderQRS';

export type {
  TutorType,
  TutorStatus,
  TutorSelectedPayload,
  Tutor,
  IncomingType,
  IncomingMessage,
  OutgoingType,
  OutgoingMessage,
  CommsStartId,
  CommsState,
  CommsModifiedOrdinalBatch,
  CommsModifiedOrdinals,
  CommsModifiedOrdinalLane,
} from '../../library/commsUtils';

export {
  createCommsStartIdInitial,
} from '../../library/commsUtils';

const initialState: CommsState = {
  startId: createCommsStartIdInitial(),
  modifiedOrdinals: {},
  outgoing: [],
  incoming: [],
  tutors: [],
};

const commsSlice = createSlice({
  name: 'comms',
  initialState,
  reducers: {
    outlineTutor: (state, action: PayloadAction<{ ids: string[], isHighlighted?: boolean }>) => {
      const { ids, isHighlighted } = action.payload;
      state.tutors = state.tutors.map((tutor) =>
        ids.includes(tutor.id + tutor.type)
          ? { ...tutor, isHighlighted: isHighlighted ?? !tutor.isHighlighted }
          : tutor
      );
    },
    outlineOutgoing: (state, action: PayloadAction<{ ids: string[], isHighlighted?: boolean }>) => {
      const { ids, isHighlighted } = action.payload;
      state.outgoing = state.outgoing.map((message) =>
        ids.includes(message.id + message.type)
          ? { ...message, isHighlighted: isHighlighted ?? !message.isHighlighted }
          : message
      );
    },
    outgoingModified: (state) => {
      const discardeds = state.outgoing
        .filter(deletedPred)
        .map(({ id, type }) => id + type);
      state.outgoing = state.outgoing
        .map((message) => ({
          ...message,
          isModified: false,
        }))
        .filter(({ id, type }) => !discardeds.includes(id + type));
    },
    updateCommunicationStatus: (state, action: PayloadAction<CommunicationReply>) => {
      const { parentId, childId, status } = action.payload;
      state.outgoing = state.outgoing.map((message) => {
        if (message.id === childId && message.targets?.find((target) => parseInt(target.toString()) === parentId))
          return { ...message, isModified: false, status: { ...message.status, communications: status } };
        else return message;
      });
    },
    outlineIncoming: (state, action: PayloadAction<{ ids: string[], isHighlighted?: boolean }>) => {
      const { ids, isHighlighted } = action.payload;
      state.incoming = state.incoming.map((message) =>
        ids.includes(message.id + message.type)
          ? { ...message, isHighlighted: isHighlighted ?? !message.isHighlighted }
          : message
      );
    },
    incomingModified: (state) => {
      const discardeds = state.incoming
        .filter(deletedPred)
        .map(({ id, type }) => id + type);
      state.incoming = state.incoming
        .map((message) => ({
          ...message,
          isModified: false,
        }))
        .filter(({ id, type }) => !discardeds.includes(id + type));
    },
    setTutors: (state, action: PayloadAction<Tutor[]>) => {
      state.tutors = Object.values(
        [...state.tutors, ...action.payload].reduce((prev: Record<number, Tutor>, cur) => {
          prev[cur.id] = prev[cur.id]
            ? {
              ...cur,
              isHighlighted: prev[cur.id].isHighlighted,
              isDismissed: prev[cur.id].isDismissed,
              checked: prev[cur.id].checked
            }
            : cur;
          return prev;
        }, {})
      ).sort(orderPredicate).map((row, index, array) => contiguousOrdinalPred(row, index, array));
    },
    setIncomings: (state, action: PayloadAction<IncomingMessage[]>) => {
      state.incoming = Object.values(
        [...state.incoming, ...action.payload].reduce((prev: Record<string, IncomingMessage>, cur: IncomingMessage) => {
          const identifier = cur.id + cur.type;
          prev[identifier] = prev[identifier]
            ? {
              ...cur,
              isDismissed: prev[identifier].isDismissed,
              isHighlighted: prev[identifier].isHighlighted,
              mailers: prev[identifier].mailers ? [...prev[identifier].mailers, cur.mailer] : [prev[identifier].mailer, cur.mailer],
            }
            : cur;
          return prev;
        }, {})
      ).sort(orderPredicate).map((row, index, array) => contiguousOrdinalPred(row, index, array));
    },
    setOutgoings: (state, action: PayloadAction<OutgoingMessage[]>) => {
      state.outgoing = mergeOutgoingMessages(state.outgoing, action.payload);
    },
    eraseTutors: (state, action: PayloadAction<erasePayload>) => {
      const { Ids = [], isShow } = action.payload;
      const filterPred = ({ id, type, isDismissed }: Tutor) => {
        const identifier = id + type;
        return isDismissed !== isShow || !(Ids as string[]).includes(identifier);
      };
      for (const id of Ids) delete showInfos[id];
      state.tutors = state.tutors.filter(filterPred);
    },
    eraseIncoming: (state, action: PayloadAction<erasePayload>) => {
      const { Ids = [], isShow } = action.payload;
      const filterPred = ({ id, type, isDismissed }: IncomingMessage) => {
        const identifier = id + type;
        return isDismissed !== isShow || !(Ids as string[]).includes(identifier);
      };
      state.incoming = state.incoming.filter(filterPred);
    },
    eraseOutgoing: (state, action: PayloadAction<erasePayload>) => {
      const { Ids = [], isShow } = action.payload;
      const filterPred = ({ id, type, isDismissed }: OutgoingMessage) => {
        const identifier = id + type;
        return isDismissed !== isShow || !(Ids as string[]).includes(identifier);
      };
      state.outgoing = state.outgoing.filter(filterPred);
    },
    clearTutors: (state, action: PayloadAction<boolean>) => {
      const undismissed = !action.payload;
      const remaining = state.tutors.filter(({ isDismissed }) => isDismissed === undismissed);
      const remainingIds = remaining.map(({ id }) => id);
      for (const id of remainingIds) delete showInfos[id];
      state.tutors = remaining;
    },
    clearIncoming: (state, action: PayloadAction<boolean>) => {
      const undismissed = !action.payload;
      state.incoming = state.incoming.filter(
        ({ isDismissed }) => isDismissed === undismissed
      );
    },
    clearOutgoing: (state, action: PayloadAction<boolean>) => {
      const undismissed = !action.payload;
      state.outgoing = state.outgoing.filter(
        ({ isDismissed }) => isDismissed === undismissed
      );
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(signedOut, () => initialState)
      .addCase(updateBosses, (state, action) => {
        state.tutors = state.tutors.map(textsMergerComms(action.payload, bossPred))
          .map((boss) => ({ ...boss, edited: false }));
      })
      .addCase(updateMinions, (state, action) => {
        state.tutors = state.tutors.map(textsMergerComms(action.payload, minionPred))
          .map((minion) => ({ ...minion, edited: false }));
      })
      .addCase(updateUnderbosses, (state, action) => {
        state.tutors = state.tutors.map(textsMergerComms(action.payload, underbossPred))
          .map((underboss) => ({ ...underboss, edited: false }));
      })
      .addCase(updateCourses, (state, action) => {
        state.outgoing = state.outgoing.map(textsMergerComms(action.payload, outSiftPred));
        state.incoming = state.incoming.map(textsMergerComms(action.payload, inSiftPred));
      })
      .addCase(updateTutorials, (state, action) => {
        state.outgoing = state.outgoing.map(textsMergerComms(action.payload, outFilPred));
        state.incoming = state.incoming.map(textsMergerComms(action.payload, inFilPred));
      })
      .addCase(updateSteps, (state, action) => {
        state.outgoing = state.outgoing.map(textsMergerComms(action.payload, outIntrPred));
        state.incoming = state.incoming.map(textsMergerComms(action.payload, inIntrPred));
      })
      .addCase(updateQuizzes, (state, action) => {
        state.outgoing = state.outgoing.map(textsMergerComms(action.payload, outDashPred));
        state.incoming = state.incoming.map(textsMergerComms(action.payload, inDashPred));
      })
      .addCase(createCourses, (state, action) => {
        state.outgoing = state.outgoing.map(idsMergerComms(action.payload, outSiftPred));
        state.incoming = state.incoming.map(idsMergerComms(action.payload, inSiftPred));
      })
      .addCase(createTutorials, (state, action) => {
        state.outgoing = state.outgoing.map(idsMergerComms(action.payload, outFilPred));
        state.incoming = state.incoming.map(idsMergerComms(action.payload, inFilPred));
      })
      .addCase(createSteps, (state, action) => {
        state.outgoing = state.outgoing.map(idsMergerComms(action.payload, outIntrPred));
        state.incoming = state.incoming.map(idsMergerComms(action.payload, inIntrPred));
      })
      .addCase(createQuizzes, (state, action) => {
        state.outgoing = state.outgoing.map(idsMergerComms(action.payload, outDashPred));
        state.incoming = state.incoming.map(idsMergerComms(action.payload, inDashPred));
      })
      .addCase(persistCourses, (state, action) => {
        const finalized = action.payload.map(({ id, modified }) => ({ id: parseInt(id), modified })).map(finalizer);
        state.outgoing = state.outgoing.map(textsMergerComms(finalized, outSiftPred));
        state.incoming = state.incoming.map(textsMergerComms(finalized, inSiftPred));
      })
      .addCase(persistTutorials, (state, action) => {
        const finalized = action.payload.map(({ id, modified }) => ({ id: parseInt(id), modified })).map(finalizer);
        state.outgoing = state.outgoing.map(textsMergerComms(finalized, outFilPred));
        state.incoming = state.incoming.map(textsMergerComms(finalized, inFilPred));
      })
      .addCase(persistQuizzes, (state, action) => {
        const finalized = action.payload.map(({ id, modified }) => ({ id: parseInt(id), modified })).map(finalizer);
        state.outgoing = state.outgoing.map(textsMergerComms(finalized, outDashPred));
        state.incoming = state.incoming.map(textsMergerComms(finalized, inDashPred));
      })
      .addCase(persistSteps, (state, action) => {
        const finalized = action.payload.map(({ id, modified }) => ({ id: parseInt(id), modified })).map(finalizer);
        state.outgoing = state.outgoing.map(textsMergerComms(finalized, outIntrPred));
        state.incoming = state.incoming.map(textsMergerComms(finalized, inIntrPred));
      })
      .addCase(updateOwnerships, (state, action) => {
        applyUpdateCommsOwnership(state, action.payload);
      });
  }
});

export const {
  outlineTutor,
  outlineOutgoing,
  outgoingModified,
  updateCommunicationStatus,
  outlineIncoming,
  incomingModified,
  setTutors,
  setIncomings,
  setOutgoings,
  eraseTutors,
  eraseIncoming,
  eraseOutgoing,
  clearTutors,
  clearIncoming,
  clearOutgoing,
} = commsSlice.actions;

export default commsSlice.reducer; 