import { Middleware, ThunkDispatch, UnknownAction } from '@reduxjs/toolkit';
import type { RootState } from '../types';
import { CommentItem, parseCommentId } from '../../types/comments';
import type { CommentsFor } from '../slices/commentsSlice';
import {
  fetchCourseComments,
  fetchTutorialComments,
  fetchQuizComments,
  FetchCommentsPayload,
} from '../../library/actions';
import {
  FetchCommentsTreePayload,
  FetchCommentsBodyTreePayload,
  fetchCommentsTree,
  fetchCommentsBodyTree,
  commentsCreator,
} from '../../library/Thunks';
import type {
  CommentMutatorPayload,
  PreOnTutorialArgs,
  PreOnStepsArgs,
} from '../../library/TutorialComentsUtils';
import {
  getMessageOnTutorialPayload,
  getMessageOnStepsPayload,
  getTutorialOnTutorialBannersPayload,
  getTutorialOnTutorialStepsPayload,
  getTutorialOnCourseBannersPayload,
  getTutorialOnCourseCoversPayload,
  getTutorialOnQuizBannersPayload,
} from '../../library/TutorialComentsUtils';
import {
  getMessageOnQuizzesPayload,
  getQuizOnQuizzesPayload,
  getQuizOnCourseBannersPayload,
  getQuizOnCourseCoversPayload,
  getQuizOnTutorialBannersPayload,
  getQuizOnTutorialStepsPayload,
  type PreOnQuizArgs,
} from '../../library/QuizComentsUtils';
import {
  getMessageOnBannersPayload,
  getMessageOnCoversPayload,
  getCourseOnBannersPayload,
  getCourseOnCoversPayload,
  getCourseOnTutorialBannersPayload,
  getCourseOnTutorialStepsPayload,
  getCourseOnQuizzesPayload,
  PreOnCourseArgs,
  PreOnCoversArgs,
} from '../../library/CourseComentsUtils';
import { globalVars } from '../../utils';
import { toCommentId } from '../../types/comments';
import {
  addComment,
  addReply,
  clearHasMoreReplies,
  toggleSubmitHeading,
  updateComment,
} from '../slices/commentsSlice';
import type { CommentsBodyPath, CommentContentQuery, CommentsUpdatePath, CommentContentInputs } from '../../library/comments-api-messagesOn-mutations';
import type { CommentsTreePath, CommentsTreePayload } from '../../library/comments-api-trees';
import { getSiftersFiltersTreePayload } from '../../library/siftersFiltersTreeUtils';
import { getSiftersHighersiftersTreePayload } from '../../library/SiftersHighersiftersTreeUtils';
import { getSiftersDashboardsTreePayload } from '../../library/siftersDashboardsTreeUtils';
import { getFiltersInstructionsTreePayload } from '../../library/filtersInstructionTreeUtils';
import { getSiftersInstructionsTreePayload } from '../../library/siftersInstructionsTreeUtils';
import { getSiftersDashboardsTreeReplyPayload } from '../../library/siftersDashboardsTreeReplyUtils';
import { getSiftersFiltersTreeReplyPayload } from '../../library/siftersFiltersTreeReplyUtils';
import { getSiftersHighersiftersTreeReplyPayload } from '../../library/siftersHighersiftersTreeReplyUtils';
import { commentsUpdater, type CommentsUpdatePayload } from '../../library/Thunks';
import {
  getLatestChildCommentSelection,
  getLatestRootCommentSelection,
} from '../../library/commentsMiddlewareUtils';


const FETCH_ACTIONS = [
  fetchCourseComments,
  fetchTutorialComments,
  fetchQuizComments,
] as const;

const FOR_BY_ACTION: Record<string, CommentsFor> = {
  [fetchTutorialComments.type]: 'tutorial',
  [fetchCourseComments.type]: 'course',
  [fetchQuizComments.type]: 'quiz',
};

/** Root (banner / top-level) add-comment mutations keyed by `${contentType}On${CommentsFor}`. */
function getRootCommentMutatorPayload(
  switchOn: string,
  baseArgs: PreOnTutorialArgs | PreOnCourseArgs | PreOnQuizArgs,
): CommentMutatorPayload | undefined {
  switch (switchOn) {
    case 'messageOntutorial':
      return getMessageOnTutorialPayload(baseArgs);
    case 'messageOnquiz':
      return getMessageOnQuizzesPayload(baseArgs);
    case 'messageOncourse':
      return getMessageOnBannersPayload(baseArgs);
    case 'courseOncourse':
      return getCourseOnBannersPayload(baseArgs);
    case 'courseOntutorial':
      return getCourseOnTutorialBannersPayload(baseArgs);
    case 'courseOnquiz':
      return getCourseOnQuizzesPayload(baseArgs);
    case 'tutorialOntutorial':
      return getTutorialOnTutorialBannersPayload(baseArgs);
    case 'tutorialOncourse':
      return getTutorialOnCourseBannersPayload(baseArgs);
    case 'tutorialOnquiz':
      return getTutorialOnQuizBannersPayload(baseArgs);
    case 'quizOnquiz':
      return getQuizOnQuizzesPayload(baseArgs);
    case 'quizOncourse':
      return getQuizOnCourseBannersPayload(baseArgs);
    case 'quizOntutorial':
      return getQuizOnTutorialBannersPayload(baseArgs);
    default:
      return undefined;
  }
}

export const commentsMiddleware: Middleware<{}, RootState> =
  ({ dispatch, getState }) =>
    (next) =>
      (action) => {
        // Fetchs
        const match = FETCH_ACTIONS.find((a) => a.match(action));
        if (match) {
          const _for = FOR_BY_ACTION[match.type];
          const { commentsId, parentIDs } = (action as { payload: FetchCommentsPayload }).payload;
          const state = getState();
          const entry = state.comments?.[_for]?.[commentsId];
          const latestRootCommentItems = getLatestRootCommentSelection({
            entryComments: entry?.comments ?? [],
            rootParentCommentId: commentsId,
          });

          const baseArgs = {
            getState,
            parentIDs,
            latestRootCommentItems,
            commentsId,
          };
          const treeResults: { path: CommentsTreePath; payload: CommentsTreePayload }[] = [];
          const thunkDispatch = dispatch as ThunkDispatch<RootState, unknown, UnknownAction>;

          switch (match.type) {
            case fetchTutorialComments.type:
              (['Bosses', 'Minions', 'Underbosses'] as const).forEach((roleType, index) => {
                const treeResult = getSiftersFiltersTreePayload({ ...baseArgs, roleType });
                if (treeResult) {
                  treeResults.push(treeResult);
                  setTimeout(() => {
                    const payload: FetchCommentsTreePayload = {
                      _for,
                      commentsId,
                      path: treeResult.path,
                      payload: treeResult.payload,
                    };
                    thunkDispatch(fetchCommentsTree(payload));
                  }, index * 100);
                }
              });
              break;
            case fetchCourseComments.type:
              (['Bosses', 'Minions', 'Underbosses'] as const).forEach((roleType, index) => {
                const treeResult = getSiftersHighersiftersTreePayload({ ...baseArgs, roleType });
                if (treeResult) {
                  treeResults.push(treeResult);
                  setTimeout(() => {
                    const payload: FetchCommentsTreePayload = {
                      _for,
                      commentsId,
                      path: treeResult.path,
                      payload: treeResult.payload,
                    };
                    thunkDispatch(fetchCommentsTree(payload));
                  }, index * 100);
                }
              });
              break;
            case fetchQuizComments.type:
              (['Bosses', 'Minions', 'Underbosses'] as const).forEach((roleType, index) => {
                const treeResult = getSiftersDashboardsTreePayload({ ...baseArgs, roleType });
                if (treeResult) {
                  treeResults.push(treeResult);
                  setTimeout(() => {
                    const payload: FetchCommentsTreePayload = {
                      _for,
                      commentsId,
                      path: treeResult.path,
                      payload: treeResult.payload,
                    };
                    thunkDispatch(fetchCommentsTree(payload));
                  }, index * 100);
                }
              });
              break;
            default:
              break;
          }
        }
        // Mutations
        else if (addComment.match(action)) {
          const { commentsId, body, userId, parentIDs, visibility, _for, type } = action.payload;
          const commentId = toCommentId(userId, globalVars.globallyUniqueIDs);
          const baseArgs = {
            getState,
            commentId,
            parentIDs,
            commentsId,
            commentText: body,
            visibility: visibility ?? 'EVERYBODY',
          };
          const switchOn = type + 'On' + _for;
          const result = getRootCommentMutatorPayload(switchOn, baseArgs);
          if (!result) return next(action);
          const thunkDispatch = dispatch as ThunkDispatch<RootState, unknown, UnknownAction>;
          thunkDispatch(commentsCreator({ path: result.path, payload: result.payload }));
        }

        else if (addReply.match(action)) {
          const {
            _for,
            body,
            userId,
            parentId,
            visibility,
            commentsId,
            type,
          } = action.payload;
          const state = getState();
          const entry = state.comments?.[_for]?.[commentsId];
          const commentId = toCommentId(userId, globalVars.globallyUniqueIDs);
          const hasParentComment = entry?.comments.some((c) => c.id === parentId);
          const parentIDs = hasParentComment ? (entry?.parentIDs ?? []) : [];
          if (parentIDs.length > 0) {
            const { commentId: parentCommentId } = parseCommentId(parentId);
            const parentComment = entry?.comments.find((c) => c.id === parentId);
            const parentType = parentComment?.contentType;
            if (!parentType) return next(action);
            const baseArgs: PreOnCoversArgs | PreOnStepsArgs = {
              getState,
              commentId,
              parentIDs,
              parentCommentId,
              commentText: body,
              visibility: visibility ?? 'EVERYBODY',
            };
            let result: CommentMutatorPayload | undefined;
            const _parentType = parentType === 'message' ? _for + 'message' : parentType;
            const switchOn = type + 'On' + _parentType;
            switch (switchOn) {
              case 'quizOntutorialmessage':
                result = getQuizOnTutorialStepsPayload(baseArgs);
                break;
              case 'tutorialOntutorialmessage':
                result = getTutorialOnTutorialStepsPayload(baseArgs);
                break;
              case 'courseOntutorialmessage':
                result = getCourseOnTutorialStepsPayload(baseArgs);
                break;
              case 'messageOntutorialmessage':
                result = getMessageOnStepsPayload(baseArgs);
                break;
              case 'messageOnquizmessage':
              case 'messageOncoursemessage':
                result = getMessageOnCoversPayload(baseArgs);
                break;
              case 'courseOnquizmessage':
              case 'courseOncoursemessage':
                result = getCourseOnCoversPayload(baseArgs);
                break;
              case 'tutorialOnquizmessage':
              case 'tutorialOncoursemessage':
                result = getTutorialOnCourseCoversPayload(baseArgs);
                break;
              case 'quizOncoursemessage':
              case 'quizOnquizmessage':
                result = getQuizOnCourseCoversPayload(baseArgs);
                break;
              default: {
                const _baseArgs: PreOnTutorialArgs | PreOnCourseArgs | PreOnQuizArgs = {
                  ...baseArgs,
                  commentsId: 0, // this insures that we don't make this reply a comment!
                };
                const replyPayload = getRootCommentMutatorPayload(switchOn, _baseArgs);
                if (!replyPayload) return next(action);
                result = replyPayload;
                break;
              }
            }
            if (result) {
              const thunkDispatch = dispatch as ThunkDispatch<RootState, unknown, UnknownAction>;
              thunkDispatch(commentsCreator({ path: result.path, payload: result.payload }));
            }
          }
        }

        else if (updateComment.match(action)) {
          const { _for, commentsId, id, body, visibility } = action.payload;
          const trimmed = body.trim();
          if (!trimmed) return next(action);
          const state = getState();
          const entry = state.comments?.[_for]?.[commentsId];
          if (!entry) return next(action);
          const target = entry.comments.find((c) => String(c.id) === String(id));
          if (!target) return next(action);
          const { userId, commentId, userRole, contentType, sticker } = target;
          if (!userRole
            || !contentType
            || typeof userId !== 'number'
            || typeof commentId !== 'number'
            || userId === commentId
            || commentId < 1
            || userId < 1
            || !sticker) {
            return next(action);
          }

          const rolePrefix =
            userRole === 'b' ? 'bosses' :
              userRole === 'u' ? 'underbosses' :
                'minions';

          const typeSuffix =
            contentType === 'quiz' ? 'Dashboards' :
              contentType === 'course' ? 'Sifters' :
                contentType === 'tutorial' ? 'Filters' :
                  'Instructions';

          const key = `${rolePrefix}${typeSuffix}` as
            | 'bossesDashboards'
            | 'bossesSifters'
            | 'bossesFilters'
            | 'bossesInstructions'
            | 'underbossesDashboards'
            | 'underbossesSifters'
            | 'underbossesFilters'
            | 'underbossesInstructions'
            | 'minionsDashboards'
            | 'minionsSifters'
            | 'minionsFilters'
            | 'minionsInstructions';

          const updatePath = (`/` + key.replace(/([A-Z])/g, (m) => `/${m.toLowerCase()}`)) as CommentsUpdatePath;

          const { session: { curMailer, curToken, mutateRole } } = state;

          const isInstructionsPath = typeSuffix === 'Instructions';

          const texts: string[] = isInstructionsPath
            ? [sticker, trimmed, 'data:image']
            : [sticker, trimmed];

          const inputs: CommentContentInputs = {
            parentIds: [userId],
            childIds: [commentId],
            visibility: visibility ?? target.visibility,
            texts,
          };

          const payload: CommentsUpdatePayload = {
            path: updatePath,
            payload: {
              mutateRole: mutateRole ?? null,
              curToken: curToken ?? null,
              mailer: curMailer,
              inputs,
            },
          };

          const thunkDispatch = dispatch as ThunkDispatch<RootState, unknown, UnknownAction>;
          thunkDispatch(commentsUpdater(payload));
        }

        else if (toggleSubmitHeading.match(action)) {
          const { _for, commentsId } = action.payload;
          const state = getState();
          const area = state.comments?.[_for];
          const entry = area?.[commentsId];
          if (entry?.showSubmitHeading === true) {
            const fetchAction = FETCH_ACTIONS.find(
              (a) => FOR_BY_ACTION[a.type] === _for
            );
            const parentIDs = entry?.parentIDs ?? [];
            if (fetchAction && parentIDs.length > 0)
              dispatch(fetchAction({ commentsId, parentIDs }));
          }
        }

        else if (clearHasMoreReplies.match(action)) {
          const { _for, commentsId, id, runWasEmpty, type } = action.payload;
          if (!runWasEmpty) return next(action);

          const state = getState();
          const entry = state.comments?.[_for]?.[commentsId];
          const parentIDs = entry?.parentIDs ?? [];
          if (parentIDs.length === 0) return next(action);

          const { commentId, userId } = parseCommentId(id);

          const latestChildrenCommentItems = getLatestChildCommentSelection({
            entryComments: entry?.comments ?? [],
            parentIdComposite: id,
          });
          const baseArgs = {
            getState,
            commentId,
            parentIDs,
            latestChildrenCommentItems,
          };

          const treeResults: { path: CommentsTreePath; payload: CommentsTreePayload }[] = [];
          const thunkDispatch = dispatch as ThunkDispatch<RootState, unknown, UnknownAction>;
          const switchOn = _for + 'CommentsVia' + type;
          switch (switchOn) {
            case 'tutorialCommentsViamessage':
              (['Bosses', 'Minions', 'Underbosses'] as const).forEach((roleType, index) => {
                const treeResult = getFiltersInstructionsTreePayload({ ...baseArgs, roleType });
                if (treeResult) {
                  treeResults.push(treeResult);
                  setTimeout(() => {
                    const payload: FetchCommentsTreePayload = {
                      _for,
                      userId,
                      commentsId,
                      path: treeResult.path,
                      payload: treeResult.payload,
                    };
                    thunkDispatch(fetchCommentsTree(payload));
                  }, index * 100);
                }
              });
              break;
            case 'quizCommentsViamessage':
            case 'courseCommentsViamessage':
              (['Bosses', 'Minions', 'Underbosses'] as const).forEach((roleType, index) => {
                const treeResult = getSiftersInstructionsTreePayload({ ...baseArgs, roleType });
                if (treeResult) {
                  treeResults.push(treeResult);
                  setTimeout(() => {
                    const payload: FetchCommentsTreePayload = {
                      _for,
                      userId,
                      commentsId,
                      path: treeResult.path,
                      payload: treeResult.payload,
                    };
                    thunkDispatch(fetchCommentsTree(payload));
                  }, index * 100);
                }
              });
              break;
            case 'quizCommentsViatutorial':
            case 'courseCommentsViatutorial':
            case 'tutorialCommentsViatutorial':
              (['Bosses', 'Minions', 'Underbosses'] as const).forEach((roleType, index) => {
                const treeResult = getSiftersFiltersTreeReplyPayload({ ...baseArgs, roleType });
                if (treeResult) {
                  treeResults.push(treeResult);
                  setTimeout(() => {
                    const payload: FetchCommentsTreePayload = {
                      _for,
                      userId,
                      commentsId,
                      path: treeResult.path,
                      payload: treeResult.payload,
                    };
                    thunkDispatch(fetchCommentsTree(payload));
                  }, index * 100);
                }
              });
              break;
            case 'quizCommentsViacourse':
            case 'courseCommentsViacourse':
            case 'tutorialCommentsViacourse':
              (['Bosses', 'Minions', 'Underbosses'] as const).forEach((roleType, index) => {
                const treeResult = getSiftersHighersiftersTreeReplyPayload({ ...baseArgs, roleType });
                if (treeResult) {
                  treeResults.push(treeResult);
                  setTimeout(() => {
                    const payload: FetchCommentsTreePayload = {
                      _for,
                      userId,
                      commentsId,
                      path: treeResult.path,
                      payload: treeResult.payload,
                    };
                    thunkDispatch(fetchCommentsTree(payload));
                  }, index * 100);
                }
              });
              break;
            case 'quizCommentsViaquiz':
            case 'courseCommentsViaquiz':
            case 'tutorialCommentsViaquiz':
              (['Bosses', 'Minions', 'Underbosses'] as const).forEach((roleType, index) => {
                const treeResult = getSiftersDashboardsTreeReplyPayload({ ...baseArgs, roleType });
                if (treeResult) {
                  treeResults.push(treeResult);
                  setTimeout(() => {
                    const payload: FetchCommentsTreePayload = {
                      _for,
                      userId,
                      commentsId,
                      path: treeResult.path,
                      payload: treeResult.payload,
                    };
                    thunkDispatch(fetchCommentsTree(payload));
                  }, index * 100);
                }
              });
              break;
          }
        }

        else if (fetchCommentsTree.fulfilled.match(action)) {
          const comments = action.payload as CommentItem[];
          const thunkDispatch = dispatch as ThunkDispatch<RootState, unknown, UnknownAction>;
          const { _for, commentsId } = action.meta.arg as FetchCommentsTreePayload;

          type GroupKey = `${CommentItem['userRole']}:${CommentItem['contentType']}`;
          const groups = new Map<GroupKey, { userRole: CommentItem['userRole']; contentType: CommentItem['contentType']; parentIds: number[]; childIds: number[] }>();

          for (const comment of comments) {
            const { userRole, contentType, userId, commentId } = comment;
            if (!userRole
              || !contentType
              || typeof userId !== 'number'
              || typeof commentId !== 'number'
              || userId === commentId
              || commentId < 1
              || userId < 1) continue;
            const key = `${userRole}:${contentType}` as GroupKey;
            let group = groups.get(key);
            if (!group) {
              group = { userRole, contentType, parentIds: [], childIds: [] };
              groups.set(key, group);
            }
            group.parentIds.push(userId);
            group.childIds.push(commentId);
          }

          const getCommentsBodyPathForGroup = (
            userRole: CommentItem['userRole'],
            contentType: CommentItem['contentType']
          ): CommentsBodyPath | null => {
            const rolePrefix =
              userRole === 'b' ? 'bosses' :
                userRole === 'u' ? 'underbosses' :
                  'minions';

            const typeSuffix =
              contentType === 'quiz' ? 'Dashboards' :
                contentType === 'course' ? 'Sifters' :
                  contentType === 'tutorial' ? 'Filters' :
                    'Instructions';

            const key = `${rolePrefix}${typeSuffix}` as
              | 'bossesDashboards'
              | 'bossesSifters'
              | 'bossesFilters'
              | 'bossesInstructions'
              | 'underbossesDashboards'
              | 'underbossesSifters'
              | 'underbossesFilters'
              | 'underbossesInstructions'
              | 'minionsDashboards'
              | 'minionsSifters'
              | 'minionsFilters'
              | 'minionsInstructions';

            // COMMENTS_MUTATION_PATHS.commentbody is typed to return CommentsBodyPath strings
            // but we don't import the full object here to keep middleware light.
            // Instead rely on CommentsBodyPath compatibility and runtime API contract.
            return (`/` + key.replace(/([A-Z])/g, (m) => `/${m.toLowerCase()}`)) as CommentsBodyPath;
          };
          const { session: { curMailer, curToken, mutateRole, isPrivate } } = getState();
          groups.forEach(({ userRole, contentType, parentIds, childIds }) => {
            const uniqueParentIds = Array.from(new Set(parentIds));
            const uniqueChildIds = Array.from(new Set(childIds));
            if (uniqueChildIds.length === 0) return;

            const bodyPath = getCommentsBodyPathForGroup(userRole, contentType);
            if (!bodyPath) return;


            const query: CommentContentQuery = {
              take: uniqueChildIds.length,
              parentIds: uniqueParentIds,
              childIds: uniqueChildIds,
              isPrivateView: isPrivate,
              skip: 0,
            };

            const payload: FetchCommentsBodyTreePayload = {
              _for,
              commentsId,
              path: bodyPath,
              payload: {
                args: query,
                mutateRole: mutateRole ?? null,
                curToken: curToken ?? null,
                mailer: curMailer,
              },
            };

            thunkDispatch(fetchCommentsBodyTree(payload));
          });
        }

        return next(action);
      };
