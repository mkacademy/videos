import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { orderPredicate, contiguousOrdinalPred } from '../../library/sliceUtils';
import {
  mergeOutgoingMessages,
  createCommsStartIdInitial,
  type IncomingMessage,
  type OutgoingMessage,
  CommsState,
} from '../../library/commsUtils';

export type {
  IncomingMessage,
  OutgoingMessage,
  CommsState,
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
  },
});

export const {
  setIncomings,
  setOutgoings,
} = commsSlice.actions;

export default commsSlice.reducer; 