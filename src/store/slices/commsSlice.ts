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
import { ordinalForReorder } from '../../library/TutorialUtils';
import { commsOutlineRangeHasDifferentTypes } from '../middleware/RangeSelectionOrReorderMangerUtils';
import {
  appendCommsReorderOrdinalBatches,
  applyCommsAltGroupLaneReorder,
  applyOrdinalRangeReorderByKeys,
  applyTutorsModified,
  applySetSelectedTutors,
  mergeOutgoingMessages,
  applyHierarchyMutationToTutors,
  bossPred,
  commsOutlineKey,
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
  toggleIncomingMsg,
  toggleOutgoingMsg,
  underbossPred,
  applyUpdateCommsOwnership,
  type CommsStartId,
  type IncomingMessage,
  type OutgoingMessage,
  type Tutor,
  type TutorSelectedPayload,
  IncommingButtonLabel,
  OutgoingButtonLabel,
  CommsState,
} from '../../library/commsUtils';
import { MutateAbilityResponse, MutateHierachyResponse } from '../../library/types';
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
    tutorsModified: (state, action: PayloadAction<{ agreements: string[], abilities: string[] }>) => {
      const { agreements, abilities } = action.payload;
      state.tutors = applyTutorsModified(state.tutors, agreements, abilities);
    },
    outlineTutor: (state, action: PayloadAction<{ ids: string[], isHighlighted?: boolean }>) => {
      const { ids, isHighlighted } = action.payload;
      state.tutors = state.tutors.map((tutor) =>
        ids.includes(tutor.id + tutor.type)
          ? { ...tutor, isHighlighted: isHighlighted ?? !tutor.isHighlighted }
          : tutor
      );
    },
    toggleTutor: (state, action: PayloadAction<string>) => {
      state.tutors = state.tutors.map((tutor) =>
        action.payload === tutor.id + tutor.type
          ? { ...tutor, isDismissed: !tutor.isDismissed }
          : tutor
      );
    },
    setSelectedTutors: (state, action: PayloadAction<TutorSelectedPayload>) => {
      state.tutors = applySetSelectedTutors(state.tutors, action.payload);
    },
    outlineOutgoing: (state, action: PayloadAction<{ ids: string[], isHighlighted?: boolean }>) => {
      const { ids, isHighlighted } = action.payload;
      state.outgoing = state.outgoing.map((message) =>
        ids.includes(message.id + message.type)
          ? { ...message, isHighlighted: isHighlighted ?? !message.isHighlighted }
          : message
      );
    },
    toggleOutgoing: (state, action: PayloadAction<string>) => {
      state.outgoing = state.outgoing.map((message) =>
        action.payload === message.id + message.type
          ? { ...message, isDismissed: !message.isDismissed }
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
    setSelectedOutgoings: (state, action: PayloadAction<{ id: string, btnLabel: OutgoingButtonLabel }>) => {
      const { id, btnLabel } = action.payload;
      state.outgoing = state.outgoing.map((message) =>
        message.id + message.type !== id
          ? message
          : { ...message, ...toggleOutgoingMsg(btnLabel) }
      );
    },
    outlineIncoming: (state, action: PayloadAction<{ ids: string[], isHighlighted?: boolean }>) => {
      const { ids, isHighlighted } = action.payload;
      state.incoming = state.incoming.map((message) =>
        ids.includes(message.id + message.type)
          ? { ...message, isHighlighted: isHighlighted ?? !message.isHighlighted }
          : message
      );
    },
    toggleIncoming: (state, action: PayloadAction<string>) => {
      state.incoming = state.incoming.map((message) =>
        action.payload === message.id + message.type
          ? { ...message, isDismissed: !message.isDismissed }
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
    setSelectedIncomings: (state, action: PayloadAction<{ id: string, btnLabel: IncommingButtonLabel, source: string }>) => {
      const { id, btnLabel, source } = action.payload;
      state.incoming = state.incoming.map((message) =>
        message.id + message.type !== id
          ? message
          : { ...message, ...toggleIncomingMsg(btnLabel, source) }
      );
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
    abilityMutated: (state, action: PayloadAction<MutateAbilityResponse>) => {
      const { candidates, enabled } = action.payload;
      state.tutors = state.tutors.map((tutor) => {
        if (!candidates.includes(tutor.id)) return tutor;
        tutor.isAble.isModified = false;
        tutor.status = enabled ? 1 : 0;
        return tutor;
      });
    },
    hierachyMutated: (state, action: PayloadAction<MutateHierachyResponse>) => {
      const { candidates: tokens, selector } = action.payload;
      state.tutors = applyHierarchyMutationToTutors(state.tutors, tokens, selector);
    },
    motionsCompleted: (state) => {
      state.tutors = state.tutors.map(({ motion, ...tutor }) => tutor);
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
    reOrderTutors: (state, action: PayloadAction<{ ids: string[]; direction: boolean; groupReorder?: boolean }>) => {
      const { ids, direction, groupReorder } = action.payload;
      if (ids.length < 2) return;
      if (commsOutlineRangeHasDifferentTypes(state, 'tutorOutline', ids)) return;
      const beforeOrdinals = new Map(state.tutors.map((t) => [commsOutlineKey(t), t.ordinal]));
      if (groupReorder) {
        const next = applyCommsAltGroupLaneReorder(state.tutors, ids);
        if (next === null) return;
        state.tutors = next;
      } else {
        if (!ids.every((k) => state.tutors.some((r) => commsOutlineKey(r) === k))) return;
        applyOrdinalRangeReorderByKeys(
          state.tutors,
          ids,
          direction,
          ordinalForReorder,
          commsOutlineKey,
        );
        state.tutors = [...state.tutors]
          .sort(orderPredicate)
          .map((row, index, array) => contiguousOrdinalPred(row, index, array));
      }
      appendCommsReorderOrdinalBatches(state.modifiedOrdinals, 'tutor', state.tutors, beforeOrdinals);
    },
    reOrderOutgoing: (state, action: PayloadAction<{ ids: string[]; direction: boolean; groupReorder?: boolean }>) => {
      const { ids, direction, groupReorder } = action.payload;
      if (ids.length < 2) return;
      if (commsOutlineRangeHasDifferentTypes(state, 'outgoingOutline', ids)) return;
      const beforeOrdinals = new Map(state.outgoing.map((m) => [commsOutlineKey(m), m.ordinal]));
      if (groupReorder) {
        const next = applyCommsAltGroupLaneReorder(state.outgoing, ids);
        if (next === null) return;
        state.outgoing = next;
      } else {
        if (!ids.every((k) => state.outgoing.some((r) => commsOutlineKey(r) === k))) return;
        applyOrdinalRangeReorderByKeys(
          state.outgoing,
          ids,
          direction,
          ordinalForReorder,
          commsOutlineKey,
        );
        state.outgoing = [...state.outgoing]
          .sort(orderPredicate)
          .map((row, index, array) => contiguousOrdinalPred(row, index, array));
      }
      appendCommsReorderOrdinalBatches(state.modifiedOrdinals, 'outgoing', state.outgoing, beforeOrdinals);
    },
    reOrderIncoming: (state, action: PayloadAction<{ ids: string[]; direction: boolean; groupReorder?: boolean }>) => {
      const { ids, direction, groupReorder } = action.payload;
      if (ids.length < 2) return;
      if (commsOutlineRangeHasDifferentTypes(state, 'incomingOutline', ids)) return;
      const beforeOrdinals = new Map(state.incoming.map((m) => [commsOutlineKey(m), m.ordinal]));
      if (groupReorder) {
        const next = applyCommsAltGroupLaneReorder(state.incoming, ids);
        if (next === null) return;
        state.incoming = next;
      } else {
        if (!ids.every((k) => state.incoming.some((r) => commsOutlineKey(r) === k))) return;
        applyOrdinalRangeReorderByKeys(
          state.incoming,
          ids,
          direction,
          ordinalForReorder,
          commsOutlineKey,
        );
        state.incoming = [...state.incoming]
          .sort(orderPredicate)
          .map((row, index, array) => contiguousOrdinalPred(row, index, array));
      }
      appendCommsReorderOrdinalBatches(state.modifiedOrdinals, 'incoming', state.incoming, beforeOrdinals);
    },
    setShiftHighlightStartIdLane: (
      state,
      action: PayloadAction<{ lane: keyof CommsStartId; id: string | null }>,
    ) => {
      state.startId[action.payload.lane] = action.payload.id;
    },
    resetShiftHighlightStartId: (state) => {
      state.startId = createCommsStartIdInitial();
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
  tutorsModified,
  outlineTutor,
  toggleTutor,
  setSelectedTutors,
  outlineOutgoing,
  toggleOutgoing,
  outgoingModified,
  updateCommunicationStatus,
  setSelectedOutgoings,
  outlineIncoming,
  toggleIncoming,
  incomingModified,
  setSelectedIncomings,
  setTutors,
  setIncomings,
  setOutgoings,
  abilityMutated,
  hierachyMutated,
  motionsCompleted,
  eraseTutors,
  eraseIncoming,
  eraseOutgoing,
  clearTutors,
  clearIncoming,
  clearOutgoing,
  setShiftHighlightStartIdLane,
  resetShiftHighlightStartId,
  reOrderTutors,
  reOrderOutgoing,
  reOrderIncoming,
} = commsSlice.actions;

export default commsSlice.reducer; 