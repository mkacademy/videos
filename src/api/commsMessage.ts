import { ToolKit } from '../utils';
import type { CommentItem } from '../types/comments';

export type CommsMessageType = 'fi' | 'mi' | 'bi' | 'ui';

export interface FetchCommsMessageBody {
  direction: 'incoming' | 'outgoing';
  type: CommsMessageType;
  id: number;
  cursor?: {
    search: string;
    childIds: number[];
    isMutating: true;
  };
}

export interface FetchCommsMessageResponse {
  comments: CommentItem[];
  parentIDs: number[];
  hasMore: boolean;
}

const COMMENTS_MESSAGE_URL = `${ToolKit.authenticatedFetcherUrl.replace(/\/fetcher$/, '')}/comms/message/comments`;

export async function fetchCommsMessage(
  body: FetchCommsMessageBody,
  curToken: string,
): Promise<FetchCommsMessageResponse> {
  const response = await fetch(COMMENTS_MESSAGE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${curToken}`,
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `Comments fetch failed (${response.status})`);
  }
  return response.json() as Promise<FetchCommsMessageResponse>;
}

/** Map webapp to default instruction message type for comments. */
export const webappToMessageType = (webapp: string): CommsMessageType => {
  switch (webapp.toLowerCase()) {
    case 'course':
      return 'bi';
    case 'quiz':
      return 'ui';
    case 'tutorial':
    default:
      return 'fi';
  }
};
