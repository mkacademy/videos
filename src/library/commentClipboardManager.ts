import type { DataRow } from "../components/Core/types";
import type { CommentsState } from "../store/slices/commentsSlice";
import type { StashPayload } from "../store/slices/stashSlice";
import type { CommentContentType } from "../types/comments";
import { parseCommentId } from "../types/comments";

const COMMENT_CONTENT_PREFIX: Record<CommentContentType, string> = {
    message: "m",
    tutorial: "t",
    course: "c",
    quiz: "q",
};

/** Tagged comments from all comment areas, grouped by `${userId}_${userRole}_${authorName}`. */
export function groupedTaggedCommentTokens(
    commentsState: CommentsState
): Record<string, string[]> {
    const out: Record<string, string[]> = {};
    const areas = ["course", "tutorial", "quiz"] as const;
    for (const _for of areas) {
        for (const entry of Object.values(commentsState[_for])) {
            for (const c of entry.comments) {
                if (c.tagged !== true) continue;
                const userId =
                    typeof c.userId === "number" ? c.userId : parseCommentId(String(c.id)).userId;
                const commentId =
                    typeof c.commentId === "number"
                        ? c.commentId
                        : parseCommentId(String(c.id)).commentId;
                const authorName = c.authorName === "" ? "Unknown" : c.authorName;
                const key = `${userId}_${c.userRole}_${authorName}`;
                const prefix = COMMENT_CONTENT_PREFIX[c.contentType];
                const token = `${prefix}${commentId}`;
                const list = out[key] ?? (out[key] = []);
                if (!list.includes(token)) list.push(token);
            }
        }
    }
    return out;
}

/** Tokens produced by {@link groupedTaggedCommentTokens}: type prefix + numeric id (id may be negative). */
const TAGGED_TOKEN_RE = /^[tcmq]-?\d+$/;

/** True if `value` is a plain object whose values are arrays of tagged-comment tokens. */
export function isGroupedTaggedClipboardPayload(
    value: unknown
): value is Record<string, string[]> {
    if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
    const obj = value as Record<string, unknown>;
    for (const k of Object.keys(obj)) {
        if (k === "__proto__" || k === "constructor" || k === "prototype") return false;
        const v = obj[k];
        if (!Array.isArray(v)) return false;
        for (const item of v) {
            if (typeof item !== "string" || !TAGGED_TOKEN_RE.test(item)) return false;
        }
    }
    return true;
}

/** `userId` + `b` | `m` | `u` + `author` from {@link groupedTaggedCommentTokens} keys. */
export type UserRoleLetter = "b" | "m" | "u";

export interface ParsedUserGroupKey {
    userId: number;
    role: UserRoleLetter;
    author: string;
}

const USER_GROUP_KEY_RE = /^(\d+)_(b|m|u)_(.+)$/;

export function parseUserGroupKey(key: string): ParsedUserGroupKey | null {
    const m = USER_GROUP_KEY_RE.exec(key);
    if (!m) return null;
    return { userId: Number(m[1]), role: m[2] as UserRoleLetter, author: m[3] };
}

export type CommentTokenPrefix = "t" | "c" | "m" | "q";

export interface ParsedCommentToken {
    prefix: CommentTokenPrefix;
    commentId: number;
}

export function parseCommentToken(token: string): ParsedCommentToken | null {
    const m = /^([tcmq])(-?\d+)$/.exec(token);
    if (!m) return null;
    return { prefix: m[1] as CommentTokenPrefix, commentId: Number(m[2]) };
}

const ROLE_TO_USER_STASH: Record<
    UserRoleLetter,
    { approute: string; timestamp: string }
> = {
    m: { approute: "foundationminions", timestamp: "minions" },
    b: { approute: "foundationbosses", timestamp: "bosses" },
    u: { approute: "foundationunderbosses", timestamp: "underbosses" },
};

const DESCENDENT_SUM_KEYS = [
    "instructions",
    "filters",
    "sifters",
    "dashboards",
    "underbosses",
    "bosses",
] as const;

function synthesizeDescendentsSums(): Record<string, number> {
    const out: Record<string, number> = {};
    for (const k of DESCENDENT_SUM_KEYS) {
        out[k] = Math.floor(Math.random() * 200) + 1;
    }
    return out;
}

function synthesizeSizeInBytes(): number {
    return Math.floor(Math.random() * 500) + 1;
}

function emailFromAuthor(author: string): string {
    const slug = author
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ".")
        .replace(/[^a-z0-9.]/g, "");
    return `${slug || "user"}@example.com`;
}

function baseMetadata(
    interactionKey: "minionId" | "bossId" | "underbossId" | "filterId" | "sifterId" | "dashboardId" | "instructionId",
    id: number
): NonNullable<DataRow["metadata"]> {
    return {
        ordinal: 0,
        owner: false,
        foundationId: [-1],
        [interactionKey]: id,
    };
}

/** Foundation user row (minion / boss / underboss). Clipboard-derived: `id`, role ids in metadata, author strings. */
function synthesizeFoundationUserRow(parsed: ParsedUserGroupKey): DataRow {
    const { userId, role, author } = parsed;
    const idStr = String(userId);
    const email = emailFromAuthor(author);
    const common = {
        descendentsSums: synthesizeDescendentsSums(),
        status: 1 as const,
        purpose: "from_clipboard" as const,
        sizeInBytes: synthesizeSizeInBytes(),
        id: idStr,
        email,
        username: author,
        checked: false,
        keywords: [] as string[],
    };
    if (role === "m") {
        return {
            ...common,
            minion: author,
            metadata: baseMetadata("minionId", userId),
        };
    }
    if (role === "b") {
        return {
            ...common,
            boss: author,
            metadata: baseMetadata("bossId", userId),
        };
    }
    return {
        ...common,
        underboss: author,
        metadata: baseMetadata("underbossId", userId),
    };
}

function synthesizeFilterRow(author: string, commentId: number): DataRow {
    const label = `${author}'s tutorial`;
    return {
        descendentsSums: synthesizeDescendentsSums(),
        status: 1,
        purpose: "from_clipboard",
        sizeInBytes: synthesizeSizeInBytes(),
        id: String(commentId),
        filter: label,
        checked: false,
        metadata: baseMetadata("filterId", commentId),
        keywords: [],
    };
}

function synthesizeSifterRow(author: string, commentId: number): DataRow {
    const label = `${author}'s course`
    return {
        descendentsSums: synthesizeDescendentsSums(),
        status: 1,
        purpose: "from_clipboard",
        sizeInBytes: synthesizeSizeInBytes(),
        id: String(commentId),
        sifter: label,
        checked: false,
        metadata: baseMetadata("sifterId", commentId),
        keywords: [],
    };
}

function synthesizeDashboardRow(author: string, commentId: number): DataRow {
    const label = `${author}'s quiz`;
    return {
        descendentsSums: synthesizeDescendentsSums(),
        status: 1,
        purpose: "from_clipboard",
        sizeInBytes: synthesizeSizeInBytes(),
        id: String(commentId),
        dashboard: label,
        checked: false,
        metadata: baseMetadata("dashboardId", commentId),
        keywords: [],
    };
}

/** Instruction stash row: no `purpose`; clipboard-derived ids only. */
function synthesizeInstructionRow(author: string, commentId: number): DataRow {
    const label = `${author}'s message`;
    return {
        descendentsSums: synthesizeDescendentsSums(),
        status: 1,
        sizeInBytes: synthesizeSizeInBytes(),
        id: String(commentId),
        instruction: label,
        imageurl: "data:image",
        details: ".",
        checked: false,
        metadata: baseMetadata("instructionId", commentId),
        keywords: [],
    };
}

const COMMENT_TYPE_ORDER: CommentTokenPrefix[] = ["t", "c", "m", "q"];

const PREFIX_ROW_BUILDERS: Record<
    CommentTokenPrefix,
    (author: string, commentId: number) => DataRow
> = {
    t: synthesizeFilterRow,
    c: synthesizeSifterRow,
    m: synthesizeInstructionRow,
    q: synthesizeDashboardRow,
};

const PREFIX_TO_STASH: Record<
    CommentTokenPrefix,
    { approute: string; timestamp: (author: string) => string }
> = {
    t: {
        approute: "foundationfilters",
        timestamp: (author) => `${author}'s tutorials`,
    },
    c: {
        approute: "foundationsifters",
        timestamp: (author) => `${author}'s courses`,
    },
    m: {
        approute: "foundationinstructions",
        timestamp: (author) => `${author}'s messages`,
    },
    q: {
        approute: "foundationdashboards",
        timestamp: (author) => `${author}'s quizzes`,
    },
};

/**
 * Builds {@link StashPayload} list for tagged-comments clipboard JSON: merge foundation users by role,
 * then per-user rows grouped by comment kind (t/c/m/q). Does not dispatch.
 */
export function stashPayloadsFromGroupedTaggedClipboard(
    payload: Record<string, string[]>
): StashPayload[] {
    const entries: Array<{ parsed: ParsedUserGroupKey; tokens: string[] }> = [];
    for (const [key, tokens] of Object.entries(payload)) {
        const parsed = parseUserGroupKey(key);
        if (!parsed) continue;
        entries.push({ parsed, tokens });
    }

    const out: StashPayload[] = [];

    const byRole = new Map<UserRoleLetter, ParsedUserGroupKey[]>();
    for (const { parsed } of entries) {
        const list = byRole.get(parsed.role) ?? [];
        list.push(parsed);
        byRole.set(parsed.role, list);
    }

    const roleOrder: UserRoleLetter[] = ["m", "b", "u"];
    for (const role of roleOrder) {
        const users = byRole.get(role);
        if (!users?.length) continue;
        users.sort((a, b) => a.userId - b.userId);
        const { approute, timestamp } = ROLE_TO_USER_STASH[role];
        out.push({
            approute,
            timestamp,
            content: users.map((p) => synthesizeFoundationUserRow(p)),
        });
    }

    for (const { parsed, tokens } of entries) {
        const byPrefix: Record<CommentTokenPrefix, number[]> = {
            t: [],
            c: [],
            m: [],
            q: [],
        };
        for (const t of tokens) {
            const pt = parseCommentToken(t);
            if (!pt) continue;
            byPrefix[pt.prefix].push(pt.commentId);
        }
        for (const prefix of COMMENT_TYPE_ORDER) {
            const uniqueSorted = [...new Set(byPrefix[prefix])].sort(
                (a, b) => a - b
            );
            if (uniqueSorted.length === 0) continue;
            const { approute, timestamp } = PREFIX_TO_STASH[prefix];
            const build = PREFIX_ROW_BUILDERS[prefix];
            out.push({
                approute,
                timestamp: timestamp(parsed.author),
                content: uniqueSorted.map((id) => build(parsed.author, id)),
            });
        }
    }

    return out;
}
