export type CommentAuthorType = 'b' | 'm' | 'u';

export type CommentContentType = 'message' | 'tutorial' | 'course' | 'quiz';

export interface CommentItem {
  /** Unique id: composite "userId:commentId" */
  id: string;
  date: string;
  body: string;
  owner: boolean;
  authorName: string;
  userRole: CommentAuthorType;
  contentType: CommentContentType;
  tagged?: boolean;
  sticker?: string;
  avatarUrl?: string;
  parentId?: string;
  userId?: number;
  commentId?: number;
  hasMoreReplies?: boolean;
  visibility?: string;
  status?: number;
}

export interface CommentFormData {
  message: string;
  visibility?: string;
}

/** Build composite id from (userId, commentId) */
export function toCommentId(
  userId: number,
  commentId: number
): string {
  return `${userId}:${commentId}`;
}

/** Parse composite id to { userId, commentId } */
export function parseCommentId(
  id: string
): { userId: number; commentId: number } {
  const [userId, commentId] = id.split(':');
  return { userId: parseInt(userId ?? '0'), commentId: parseInt(commentId ?? '0') };
}

/** Map mutateRole (ROLE_USER, ROLE_ADMIN, ROLE_MODERATOR) to CommentAuthorType */
export function mutateRoleToCommentAuthor(
  mutateRole: string | null
): CommentAuthorType {
  switch (mutateRole) {
    case 'ROLE_ADMIN':
      return 'b';
    case 'ROLE_USER':
    case 'ROLE_MODERATOR':
    default:
      return 'm';
  }
}


// (userId + commentId) -> (commentId + userId) -> (userId + commentId) -> (commentId + userId)

// (userId + commentId) this table has the comments

// (commentId + userId) I use this table for connections only

// commentId and userId are two different keys, e.g commentId: 1, userId: 1


