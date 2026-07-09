import type { CommentItem } from '../types/comments';

/** Composite parentId with negative userId (e.g. -1:commentsId) means root comment; not a real comment in the list. */
function isRootParentId(parentId: string | undefined): boolean {
  if (parentId == null || parentId === '') return true;
  const userIdPart = parentId.split(':')[0];
  const n = parseInt(userIdPart, 10);
  return Number.isFinite(n) && n < 0;
}

/**
 * Comment display utilities for flattening nested threads with a staggered max depth.
 *
 * MAX_DEPTH is treated as the spacing between depth tiers. Tier boundaries are at
 * depths MAX_DEPTH, 2*MAX_DEPTH, 3*MAX_DEPTH, ...
 *
 * - Comments with depth <= MAX_DEPTH are always visible on initial render.
 * - A comment at a tier boundary depth d (d > 0 && d % MAX_DEPTH === 0) owns a single
 *   "run": the contiguous block of descendants with depth in (d, d + MAX_DEPTH].
 * - expandedMoreReplies is keyed by the tier-boundary comment's id. When that id is
 *   present, its run is rendered; otherwise the run is hidden and exposed via showMore.
 */

export function getCommentDepth(
  comment: CommentItem,
  byId: Map<CommentItem['id'], CommentItem>
): number {
  if (!comment.parentId) return 0;
  const parent = byId.get(String(comment.parentId));
  return parent ? 1 + getCommentDepth(parent, byId) : 0;
}

/** Returns comments in depth-first order (parent before children, siblings in array order). */
export function sortCommentsDepthFirst(
  comments: CommentItem[]
): CommentItem[] {
  const byParent = new Map<string, CommentItem[]>();
  for (const c of comments) {
    const rawKey = c.parentId != null ? String(c.parentId) : '';
    const key = isRootParentId(rawKey) ? '' : rawKey;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(c);
  }
  const out: CommentItem[] = [];
  function visit(parentKey: string) {
    const list = byParent.get(parentKey);
    if (!list) return;
    for (const c of list) {
      out.push(c);
      visit(String(c.id));
    }
  }
  visit('');
  return out;
}

export type DisplayItem = {
  type: 'comment';
  comment: CommentItem;
  depth: number;
  showMore?: { comments: CommentItem[]; depths: number[] };
};

/**
 * Collects the next-tier run for a tier-boundary comment.
 *
 * For a boundary at depth `boundaryDepth`, its run is the contiguous block of
 * descendants in depth-first order whose depth is in (boundaryDepth, boundaryDepth + maxDepth].
 * Each comment in this run is owned by the boundary; visibility of the run is controlled
 * by whether the boundary's id is present in expandedMoreReplies.
 */
function collectDepthRunForBoundary(
  boundaryIndex: number,
  sorted: CommentItem[],
  depthsById: Map<string, number>,
  maxDepth: number,
  ownerByCommentId: Map<string, string>
): { comments: CommentItem[]; depths: number[] } {
  const boundary = sorted[boundaryIndex];
  const boundaryIdStr = String(boundary.id);
  const boundaryDepth = depthsById.get(boundaryIdStr) ?? 0;

  const runComments: CommentItem[] = [];
  const runDepths: number[] = [];

  const upperDepth = boundaryDepth + maxDepth;
  const n = sorted.length;

  let i = boundaryIndex + 1;
  while (i < n) {
    const c = sorted[i];
    const idStr = String(c.id);
    const depth = depthsById.get(idStr) ?? 0;

    // Left the boundary's subtree.
    if (depth <= boundaryDepth) break;
    // Beyond this boundary's tier window.
    if (depth > upperDepth) break;

    runComments.push(c);
    runDepths.push(depth);
    ownerByCommentId.set(idStr, boundaryIdStr);
    i++;
  }

  return { comments: runComments, depths: runDepths };
}

export function buildDisplayItems(
  comments: CommentItem[],
  getDepth: (c: CommentItem) => number,
  expandedMoreReplies: Set<CommentItem['id']>,
  maxDepth: number
): DisplayItem[] {
  const sorted = sortCommentsDepthFirst(comments);
  const byId = new Map<string, CommentItem>(
    sorted.map((c) => [String(c.id), c])
  );

  // Cache depths so we only compute them once.
  const depthsById = new Map<string, number>();
  for (const c of sorted) {
    const idStr = String(c.id);
    depthsById.set(idStr, getDepth(c));
  }

  // Precompute runs for each tier-boundary comment, and record which boundary
  // owns each deeper comment.
  const runsByBoundaryId = new Map<
    string,
    { comments: CommentItem[]; depths: number[] }
  >();
  const ownerByCommentId = new Map<string, string>();

  for (let i = 0; i < sorted.length; i++) {
    const comment = sorted[i];
    const idStr = String(comment.id);
    const depth = depthsById.get(idStr) ?? 0;

    const isTierBoundary = depth > 0 && depth % maxDepth === 0;
    if (!isTierBoundary) continue;

    const { comments: runComments, depths } = collectDepthRunForBoundary(
      i,
      sorted,
      depthsById,
      maxDepth,
      ownerByCommentId
    );

    if (runComments.length > 0) {
      runsByBoundaryId.set(idStr, { comments: runComments, depths });
    }
  }

  // Fallback: assign owner to any comment with depth > maxDepth that has no owner
  // (e.g. new replies that fall after a sibling boundary in depth-first order).
  const boundaryDepthFor = (depth: number) =>
    depth > maxDepth ? maxDepth * Math.floor((depth - 1) / maxDepth) : -1;
  for (const comment of sorted) {
    const idStr = String(comment.id);
    const depth = depthsById.get(idStr) ?? 0;
    if (depth <= maxDepth) continue;
    if (ownerByCommentId.has(idStr)) continue;
    const targetDepth = boundaryDepthFor(depth);
    if (targetDepth < 0) continue;
    let ancestorId: string | null =
      comment.parentId != null ? String(comment.parentId) : null;
    while (ancestorId != null) {
      const ancestor = byId.get(ancestorId);
      if (!ancestor) break;
      const ad = depthsById.get(ancestorId) ?? getDepth(ancestor);
      if (ad === targetDepth) {
        ownerByCommentId.set(idStr, ancestorId);
        break;
      }
      ancestorId =
        ancestor.parentId != null ? String(ancestor.parentId) : null;
    }
  }

  // Second pass: build the flattened display items based on expansion state.
  const items: DisplayItem[] = [];

  for (const comment of sorted) {
    const idStr = String(comment.id);
    const depth = depthsById.get(idStr) ?? 0;

    const isBaseVisible = depth <= maxDepth;
    const ownerBoundaryId = ownerByCommentId.get(idStr);
    const ownerExpanded =
      ownerBoundaryId != null && expandedMoreReplies.has(ownerBoundaryId);

    const isVisible = isBaseVisible || ownerExpanded;
    if (!isVisible) continue;

    const run = runsByBoundaryId.get(idStr);
    const isExpanded = expandedMoreReplies.has(idStr);
    const showMore =
      run && run.comments.length > 0 && !isExpanded
        ? { comments: run.comments, depths: run.depths }
        : undefined;

    items.push({ type: 'comment', comment, depth, showMore });
  }

  return items;
}
