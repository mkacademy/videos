import { createAsyncThunk } from '@reduxjs/toolkit';
import { fetchCommsMessage, type FetchCommsMessageBody } from '../../api/commsMessage';
import type { RootState } from '../index';

export const fetchCommsMessageThunk = createAsyncThunk(
  'comments/fetchCommsMessage',
  async (body: FetchCommsMessageBody, { getState, rejectWithValue }) => {
    const { curToken } = (getState() as RootState).session;
    if (!curToken) return rejectWithValue('Not authenticated');
    try {
      return await fetchCommsMessage(body, curToken);
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Comments fetch failed');
    }
  },
);
