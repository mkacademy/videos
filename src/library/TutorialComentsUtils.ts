import type { RootState } from '../store/types';
import { parseCommentId } from '../types/comments';
import {
  COMMENTS_MUTATION_PATHS,
  type MessagesMutationPath,
  type MessagesMutationPayload,
  type MessageOnTutorialBannerArgs,
  type MessageOnStepArgs,
} from './comments-api-messagesOn-mutations';
import type { CoursesMutationPath, CoursesMutationPayload } from './comments-api-coursesOn-mutations';
import type { QuizzesMutationPath, QuizzesMutationPayload } from './comments-api-quizzesOn-mutations';
import {
  COMMENTS_MUTATION_PATHS as tutorialsOnPaths,
  type TutorialsMutationPath,
  type TutorialsMutationPayload,
  type TutorialOnTutorialBannerArgs,
  type TutorialOnStepArgs,
  type TutorialOnCourseBannerArgs,
  type TutorialOnCoverArgs,
  type TutorialOnQuizArgs,
} from './comments-api-tutorialsOn-mutations';

export interface PreOnTutorialArgs {
  getState: () => RootState;
  commentId: string;
  commentsId: number;
  parentIDs: number[];
  commentText: string;
  visibility: string;
  parentCommentId?: number;
}

export interface PreOnStepsArgs {
  getState: () => RootState;
  commentId: string;
  parentIDs: number[];
  commentText: string;
  parentCommentId: number;
  visibility: string;
}

/** path + payload for message-on-* and *-on-* comments mutations (path and payload must match per API contract). */
export type CommentMutatorPayload = {
  path:
  | MessagesMutationPath
  | CoursesMutationPath
  | TutorialsMutationPath
  | QuizzesMutationPath;
  payload:
  | MessagesMutationPayload
  | CoursesMutationPayload
  | TutorialsMutationPayload
  | QuizzesMutationPayload;
};

export const getMessageOnTutorialPayload = ({
  getState,
  commentsId,
  parentIDs,
  commentText,
  commentId,
  visibility,
  parentCommentId,
}: PreOnTutorialArgs): CommentMutatorPayload => {
  const ordinalId = parentCommentId ?? commentsId;
  const state = getState();
  const { session: { curMailer, curToken, quota, mutateRole } } = state;
  const { userId, commentId: commentIdNumber } = parseCommentId(commentId);
  const pathIndex = mutateRole === 'ROLE_ADMIN' ? 'Boss' : mutateRole === 'ROLE_USER' ? 'Minion' : 'Underboss';
  const path = COMMENTS_MUTATION_PATHS.tutorial[`set${pathIndex}MessageOnBanners`];
  const payload: MessageOnTutorialBannerArgs = {
    quota: quota ?? null,
    curToken: curToken,
    mailer: curMailer,
    mutateRole: mutateRole,
    sifterslowersifters: parentIDs.length > 0
      ? { childIds: [] }
      : {
        childIds: [-commentsId],
        visibility: "EVERYBODY",
        texts: [`container_${commentsId}_comments`, '.'],
      },
    siftersfilters: parentIDs.length > 0
      ? {
        visibility: "EVERYBODY",
        parentIds: parentIDs,
        childIds: [ordinalId],
      }
      : {
        parentIds: [-commentsId],
        childIds: [commentsId],
        visibility: "EVERYBODY",
      },
    filtersRole: {
      childIds: [userId],
      visibility: "EVERYBODY",
      parentIds: [ordinalId],
    },
    roleInstructions: {
      visibility,
      parentIds: [userId],
      ordinals: [-ordinalId],
      childIds: [commentIdNumber],
      texts: ['messageOnTutorial', commentText, 'data:image'],
    },
  };
  return { path, payload };
};

export const getMessageOnStepsPayload = ({
  getState,
  parentCommentId,
  parentIDs,
  commentText,
  commentId,
  visibility,
}: PreOnStepsArgs): CommentMutatorPayload => {
  const state = getState();
  const { session: { curMailer, curToken, quota, mutateRole } } = state;
  const { userId, commentId: commentIdNumber } = parseCommentId(commentId);
  const pathIndex = mutateRole === 'ROLE_ADMIN' ? 'Boss' : mutateRole === 'ROLE_USER' ? 'Minion' : 'Underboss';
  const path = COMMENTS_MUTATION_PATHS.tutorial[`set${pathIndex}MessageOnSteps`];
  const payload: MessageOnStepArgs = {
    quota: quota ?? null,
    curToken: curToken,
    mailer: curMailer,
    mutateRole: mutateRole,
    siftersfilters: {
      childIds: parentIDs,
      parentIds: parentIDs,
      visibility: "EVERYBODY",
    },
    filtersinstructions: {
      parentIds: parentIDs,
      visibility: "EVERYBODY",
      childIds: [parentCommentId],
    },
    instructionsRole: {
      childIds: [userId],
      visibility: "EVERYBODY",
      parentIds: [parentCommentId],
    },
    roleInstructions: {
      visibility,
      parentIds: [userId],
      childIds: [commentIdNumber],
      ordinals: [-parentCommentId],
      texts: ['messageOnMessage', commentText, 'data:image'],
    },
  };
  return { path, payload };
};

export const getTutorialOnTutorialBannersPayload = ({
  getState,
  commentsId,
  parentIDs,
  commentText,
  commentId,
  visibility,
  parentCommentId,
}: PreOnTutorialArgs): CommentMutatorPayload => {
  const ordinalId = parentCommentId ?? commentsId;
  const state = getState();
  const { session: { curMailer, curToken, quota, mutateRole } } = state;
  const { userId, commentId: commentIdNumber } = parseCommentId(commentId);
  const pathIndex = mutateRole === 'ROLE_ADMIN' ? 'Boss' : mutateRole === 'ROLE_USER' ? 'Minion' : 'Underboss';
  const path = tutorialsOnPaths.tutorial[`set${pathIndex}TutorialOnBanners`];
  const payload: TutorialOnTutorialBannerArgs = {
    quota: quota ?? null,
    curToken: curToken,
    mailer: curMailer,
    mutateRole: mutateRole,
    sifterslowersifters: parentIDs.length > 0
      ? { childIds: [] }
      : {
        childIds: [-commentsId],
        visibility: 'EVERYBODY',
        texts: [`container_${commentsId}_comments`, '.'],
      },
    siftersfilters: parentIDs.length > 0
      ? {
        visibility: 'EVERYBODY',
        parentIds: parentIDs,
        childIds: [ordinalId],
      }
      : {
        parentIds: [-commentsId],
        childIds: [commentsId],
        visibility: 'EVERYBODY',
      },
    filtersRole: {
      childIds: [userId],
      visibility: 'EVERYBODY',
      parentIds: [ordinalId],
    },
    roleFilters: {
      visibility,
      parentIds: [userId],
      ordinals: [-ordinalId],
      childIds: [commentIdNumber],
      texts: ['tutorialOnTutorial', commentText],
    },
  };
  return { path, payload };
};

export const getTutorialOnTutorialStepsPayload = ({
  getState,
  parentCommentId,
  parentIDs,
  commentText,
  commentId,
  visibility,
}: PreOnStepsArgs): CommentMutatorPayload => {
  const state = getState();
  const { session: { curMailer, curToken, quota, mutateRole } } = state;
  const { userId, commentId: commentIdNumber } = parseCommentId(commentId);
  const pathIndex = mutateRole === 'ROLE_ADMIN' ? 'Boss' : mutateRole === 'ROLE_USER' ? 'Minion' : 'Underboss';
  const path = tutorialsOnPaths.tutorial[`set${pathIndex}TutorialOnSteps`];
  const payload: TutorialOnStepArgs = {
    quota: quota ?? null,
    curToken: curToken,
    mailer: curMailer,
    mutateRole: mutateRole,
    siftersfilters: {
      childIds: parentIDs,
      parentIds: parentIDs,
      visibility: 'EVERYBODY',
    },
    filtersinstructions: {
      parentIds: parentIDs,
      visibility: 'EVERYBODY',
      childIds: [parentCommentId],
    },
    instructionsRole: {
      childIds: [userId],
      visibility: 'EVERYBODY',
      parentIds: [parentCommentId],
    },
    roleFilters: {
      visibility,
      parentIds: [userId],
      childIds: [commentIdNumber],
      ordinals: [-parentCommentId],
      texts: ['tutorialOnMessage', commentText],
    },
  };
  return { path, payload };
};

export const getTutorialOnCourseBannersPayload = ({
  getState,
  commentsId,
  parentIDs,
  commentText,
  commentId,
  visibility,
  parentCommentId,
}: PreOnTutorialArgs): CommentMutatorPayload => {
  const ordinalId = parentCommentId ?? commentsId;
  const state = getState();
  const { session: { curMailer, curToken, quota, mutateRole } } = state;
  const { userId, commentId: commentIdNumber } = parseCommentId(commentId);
  const pathIndex = mutateRole === 'ROLE_ADMIN' ? 'Boss' : mutateRole === 'ROLE_USER' ? 'Minion' : 'Underboss';
  const path = tutorialsOnPaths.course[`set${pathIndex}TutorialOnBanners`];
  const payload: TutorialOnCourseBannerArgs = {
    quota: quota ?? null,
    curToken: curToken,
    mailer: curMailer,
    mutateRole: mutateRole,
    sifterslowersifters: parentIDs.length > 0
      ? { childIds: [] }
      : {
        childIds: [-commentsId],
        visibility: 'EVERYBODY',
        texts: [`container_${commentsId}_comments`, '.'],
      },
    siftershighersifters: parentIDs.length > 0
      ? {
        parentIds: parentIDs,
        childIds: [ordinalId],
        visibility: 'EVERYBODY',
      }
      : {
        parentIds: [-commentsId],
        childIds: [commentsId],
        visibility: 'EVERYBODY',
      },
    siftersRole: {
      visibility: 'EVERYBODY',
      parentIds: [ordinalId],
      childIds: [userId],
    },
    roleFilters: {
      visibility,
      parentIds: [userId],
      ordinals: [-ordinalId],
      childIds: [commentIdNumber],
      texts: ['tutorialOnCourse', commentText],
    },
  };
  return { path, payload };
};

export const getTutorialOnCourseCoversPayload = ({
  getState,
  parentIDs,
  commentText,
  commentId,
  parentCommentId,
  visibility,
}: PreOnStepsArgs): CommentMutatorPayload => {
  const state = getState();
  const { session: { curMailer, curToken, quota, mutateRole } } = state;
  const { userId, commentId: commentIdNumber } = parseCommentId(commentId);
  const pathIndex = mutateRole === 'ROLE_ADMIN' ? 'Boss' : mutateRole === 'ROLE_USER' ? 'Minion' : 'Underboss';
  const path = tutorialsOnPaths.course[`set${pathIndex}TutorialOnCovers`];
  const payload: TutorialOnCoverArgs = {
    quota: quota ?? null,
    curToken: curToken,
    mailer: curMailer,
    mutateRole: mutateRole,
    siftersinstructions: {
      parentIds: parentIDs,
      childIds: [parentCommentId],
      visibility: 'EVERYBODY',
    },
    instructionsRole: {
      visibility: 'EVERYBODY',
      parentIds: [parentCommentId],
      childIds: [userId],
    },
    roleFilters: {
      visibility,
      parentIds: [userId],
      childIds: [commentIdNumber],
      ordinals: [-parentCommentId],
      texts: ['tutorialOnMessage', commentText],
    },
  };
  return { path, payload };
};

export const getTutorialOnQuizBannersPayload = ({
  getState,
  commentsId,
  parentIDs,
  commentText,
  commentId,
  visibility,
  parentCommentId,
}: PreOnTutorialArgs): CommentMutatorPayload => {
  const state = getState();
  const ordinalId = parentCommentId ?? commentsId;
  const { session: { curMailer, curToken, quota, mutateRole } } = state;
  const { userId, commentId: commentIdNumber } = parseCommentId(commentId);
  const pathIndex = mutateRole === 'ROLE_ADMIN' ? 'Boss' : mutateRole === 'ROLE_USER' ? 'Minion' : 'Underboss';
  const path = tutorialsOnPaths.quiz[`set${pathIndex}TutorialOnQuizzes`];
  const payload: TutorialOnQuizArgs = {
    quota: quota ?? null,
    curToken: curToken,
    mailer: curMailer,
    mutateRole: mutateRole,
    sifterslowersifters: parentIDs.length > 0
      ? { childIds: [] }
      : {
        childIds: [-commentsId],
        visibility: 'EVERYBODY',
        texts: [`container_${commentsId}_comments`, '.'],
      },
    siftersdashboards: parentIDs.length > 0
      ? {
        parentIds: parentIDs,
        childIds: [ordinalId],
        visibility: 'EVERYBODY',
      }
      : {
        parentIds: [-commentsId],
        childIds: [commentsId],
        visibility: 'EVERYBODY',
      },
    dashboardsRole: {
      visibility: 'EVERYBODY',
      parentIds: [ordinalId],
      childIds: [userId],
    },
    roleFilters: {
      visibility,
      parentIds: [userId],
      ordinals: [-ordinalId],
      childIds: [commentIdNumber],
      texts: ['tutorialOnQuiz', commentText],
    },
  };
  return { path, payload };
};

