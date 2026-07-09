import type {
  CommentAuthorType,
  CommentContentType,
  CommentItem,
} from '../types/comments';
import type { CommentContentQuery } from './comments-api-messagesOn-mutations';
import { parseCommentId } from '../types/comments';

export interface LatestChildCommentSelectionArgs {
  /** Full list of comments already present in the store for this `commentsId`. */
  entryComments: CommentItem[];
  /** Composite id of the parent comment (e.g. `userId:commentId`). */
  parentIdComposite: string;
}

export type LatestCommentItemsByAuthorAndContentType = Partial<
  Record<CommentAuthorType, Partial<Record<CommentContentType, CommentItem[]>>>
>;

export interface LatestRootCommentSelectionArgs {
  /** Full list of comments already present in the store for this `commentsId`. */
  entryComments: CommentItem[];
  /**
   * Root "container" comment id.
   * Root comments are those whose `parentId` equals `-1:${rootParentCommentId}` (negative user id).
   */
  rootParentCommentId: number;
}

const groupByAuthorAndContentType = (
  commentItems: CommentItem[]
): LatestCommentItemsByAuthorAndContentType =>
  commentItems.reduce<LatestCommentItemsByAuthorAndContentType>(
    (acc, commentItem) => {
      const authorKey = commentItem.userRole;
      const contentKey = commentItem.contentType;
      const byContent = acc[authorKey] ?? {};
      const existing = byContent[contentKey] ?? [];
      acc[authorKey] = {
        ...byContent,
        [contentKey]: [...existing, commentItem],
      };
      return acc;
    },
    {}
  );

const filterGroupsToLatestMinute = (
  groups: LatestCommentItemsByAuthorAndContentType,
  tsById: Map<string, number>
): LatestCommentItemsByAuthorAndContentType => {
  const result: LatestCommentItemsByAuthorAndContentType = {};

  (Object.keys(groups) as CommentAuthorType[]).forEach((authorKey) => {
    const byContent = groups[authorKey];
    if (!byContent) return;

    const filteredByContent: Partial<Record<CommentContentType, CommentItem[]>> =
      {};

    (Object.keys(byContent) as CommentContentType[]).forEach((contentKey) => {
      const items = byContent[contentKey];
      if (!items || items.length === 0) return;

      const timestamps = items
        .map((c) => tsById.get(c.id))
        .filter((ts): ts is number => typeof ts === 'number');

      if (timestamps.length === 0) return;

      const latestTs = Math.max(...timestamps);
      const latestItems = items.filter(
        (c) => tsById.get(c.id) === latestTs
      );

      if (latestItems.length > 0) {
        filteredByContent[contentKey] = latestItems;
      }
    });

    if (Object.keys(filteredByContent).length > 0) {
      result[authorKey] = filteredByContent;
    }
  });

  return result;
};

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

const parseCommentDateToMs = (dateStr: string): number | null => {
  // Expected: "MMM d, yyyy HH:mm" or "MMM. d, yyyy HH:mm"
  // e.g. "Mar 18, 2026 14:05" or "Mar. 10, 2026 08:09"
  const match = dateStr.match(
    /^([A-Za-z]{3})\.? (\d{1,2}), (\d{4}) (\d{1,2}):(\d{2})$/
  );
  if (!match) return null;

  const [, monthAbbr, dayStr, yearStr, hourStr, minuteStr] = match;
  const monthAbbrNormalized = monthAbbr.replace('.', '');
  const monthIndex = MONTH_NAMES.findIndex(
    (m) => m.toLowerCase() === String(monthAbbrNormalized).toLowerCase()
  );
  if (monthIndex < 0) return null;

  const year = Number(yearStr);
  const day = Number(dayStr);
  const hour = Number(hourStr);
  const minute = Number(minuteStr);
  if (
    !Number.isFinite(year) ||
    !Number.isFinite(day) ||
    !Number.isFinite(hour) ||
    !Number.isFinite(minute)
  ) {
    return null;
  }

  // Use local time: for minute-accurate ordering, we only need a comparable ms value.
  return new Date(year, monthIndex, day, hour, minute, 0).getTime();
};

/**
 * Finds the comment's child(ren) already present in the store, picks the one with the latest
 * `"MMM d, yyyy HH:mm"` timestamp, and returns:
 * - all children matching the parent
 * - the subset matching the latest minute
 * - the db `commentId` to use for subsequent tree fetches
 */
export function getLatestChildCommentSelection(
  args: LatestChildCommentSelectionArgs
): LatestCommentItemsByAuthorAndContentType {
  const {
    entryComments,
    parentIdComposite,
  } = args;

  const childrenCommentItems = entryComments.filter(
    (c) => c.parentId === parentIdComposite
  );

  if (childrenCommentItems.length === 0) return {};

  const parsedChildren = childrenCommentItems
    .map((c) => {
      const ts = parseCommentDateToMs(c.date);
      return ts == null ? null : { c, ts };
    })
    .filter((v): v is { c: CommentItem; ts: number } => v != null);

  if (parsedChildren.length === 0) return {};

  const tsById = new Map<string, number>();
  parsedChildren.forEach(({ c, ts }) => {
    tsById.set(c.id, ts);
  });

  const grouped = groupByAuthorAndContentType(
    parsedChildren.map((p) => p.c)
  );

  return filterGroupsToLatestMinute(grouped, tsById);
}

/**
 * Finds the root comment(s) already present in the store:
 * - root comment parent has a negative user id (`-1:<rootParentCommentId>`)
 * - picks the comment(s) with the latest `"MMM d, yyyy HH:mm"` timestamp
 * - uses a deterministic tie-breaker (highest numeric `commentId`)
 */
export function getLatestRootCommentSelection(
  args: LatestRootCommentSelectionArgs
): LatestCommentItemsByAuthorAndContentType {
  const { entryComments, rootParentCommentId } = args;

  const rootCommentItems = entryComments.filter((c) => {
    if (typeof c.parentId !== 'string') return false;
    const parsedParent = parseCommentId(c.parentId);
    return parsedParent.userId === -1 && parsedParent.commentId === rootParentCommentId;
  });

  if (rootCommentItems.length === 0) return {};

  const parsedRoots = rootCommentItems
    .map((c) => {
      const ts = parseCommentDateToMs(c.date);
      return ts == null ? null : { c, ts };
    })
    .filter((v): v is { c: CommentItem; ts: number } => v != null);

  if (parsedRoots.length === 0) return {};

  const tsById = new Map<string, number>();
  parsedRoots.forEach(({ c, ts }) => {
    tsById.set(c.id, ts);
  });

  const grouped = groupByAuthorAndContentType(
    parsedRoots.map((p) => p.c)
  );

  return filterGroupsToLatestMinute(grouped, tsById);
}

export interface BuildLatestGroupsFreightArgs {
  groups: LatestCommentItemsByAuthorAndContentType;
  authorKey: CommentAuthorType;
  isPrivateView: boolean | null | undefined;
}

export const buildCommentContentQueryFromLatestGroups = ({
  groups,
  authorKey,
  isPrivateView,
}: BuildLatestGroupsFreightArgs): CommentContentQuery => {
  const baseDefaultFreight: CommentContentQuery = {
    isPrivateView: !!isPrivateView,
  };

  const byContent = groups[authorKey];
  if (!byContent) return baseDefaultFreight;

  const allItems = Object.values(byContent)
    .filter((items): items is CommentItem[] => Array.isArray(items))
    .flat();

  if (allItems.length === 0) return baseDefaultFreight;

  const childIds = allItems
    .map((c) => c.commentId)
    .filter((id): id is number => typeof id === 'number');
  const search = allItems[0]?.date ?? null;

  const shouldIncludeIsMutating = (
    search !== null
    && childIds.length > 0
  );

  return {
    search,
    isPrivateView: !!isPrivateView,
    childIds: childIds.length > 0 ? childIds : undefined,
    ...(shouldIncludeIsMutating ? { isMutating: true } : {}),
  };
};

