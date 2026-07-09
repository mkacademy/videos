import type { RootState } from '../store/types';
import { parseCommentId } from '../types/comments';
import {
  COMMENTS_MUTATION_PATHS,
  type MessageOnQuizArgs,
} from './comments-api-messagesOn-mutations';
import type { CommentMutatorPayload, PreOnStepsArgs } from './TutorialComentsUtils';
import {
  COMMENTS_MUTATION_PATHS as quizzesOnPaths,
  type QuizOnQuizArgs,
  type QuizzOnCourseBannerArgs,
  type QuizzOnCoverArgs,
  type QuizzOnTutorialBannerArgs,
  type QuizzOnStepArgs,
} from './comments-api-quizzesOn-mutations';

export interface PreOnQuizArgs {
  getState: () => RootState;
  commentsId: number;
  parentIDs: number[];
  commentText: string;
  commentId: string;
  visibility: string;
  parentCommentId?: number;
}

export const getMessageOnQuizzesPayload = ({
  getState,
  commentsId,
  parentIDs,
  commentText,
  commentId,
  visibility,
  parentCommentId,
}: PreOnQuizArgs): CommentMutatorPayload => {
  const ordinalId = parentCommentId ?? commentsId;
  const state = getState();
  const { session: { curMailer, curToken, quota, mutateRole } } = state;
  const { userId, commentId: commentIdNumber } = parseCommentId(commentId);
  const pathIndex = mutateRole === 'ROLE_ADMIN' ? 'Boss' : mutateRole === 'ROLE_USER' ? 'Minion' : 'Underboss';
  const path = COMMENTS_MUTATION_PATHS.quiz[`set${pathIndex}MessageOnQuizzes`];
  const payload: MessageOnQuizArgs = {
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
    siftersdashboards: parentIDs.length > 0
      ? {
        parentIds: parentIDs,
        childIds: [ordinalId],
        visibility: "EVERYBODY",
      }
      : {
        parentIds: [-commentsId],
        childIds: [commentsId],
        visibility: "EVERYBODY",
      },
    dashboardsRole: {
      visibility: "EVERYBODY",
      parentIds: [ordinalId],
      childIds: [userId],
    },
    roleInstructions: {
      visibility,
      parentIds: [userId],
      ordinals: [-ordinalId],
      childIds: [commentIdNumber],
      texts: ['messageOnQuiz', commentText, 'data:image'],
    },
  };
  return { path, payload };
};

export const getQuizOnQuizzesPayload = ({
  getState,
  commentsId,
  parentIDs,
  commentText,
  commentId,
  visibility,
  parentCommentId,
}: PreOnQuizArgs): CommentMutatorPayload => {
  const ordinalId = parentCommentId ?? commentsId;
  const state = getState();
  const { session: { curMailer, curToken, quota, mutateRole } } = state;
  const { userId, commentId: commentIdNumber } = parseCommentId(commentId);
  const pathIndex = mutateRole === 'ROLE_ADMIN' ? 'Boss' : mutateRole === 'ROLE_USER' ? 'Minion' : 'Underboss';
  const path = quizzesOnPaths.quiz[`set${pathIndex}QuizzOnQuizzes`];
  const payload: QuizOnQuizArgs = {
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
    roleDashboards: {
      visibility,
      parentIds: [userId],
      ordinals: [-ordinalId],
      childIds: [commentIdNumber],
      texts: ['quizOnQuiz', commentText],
    },
  };
  return { path, payload };
};

export interface PreQuizOnCoversArgs {
  getState: () => RootState;
  commentId: string;
  parentIDs: number[];
  commentText: string;
  parentCommentId: number;
  visibility: string;
}

export const getQuizOnCourseBannersPayload = ({
  getState,
  commentsId,
  parentIDs,
  commentText,
  commentId,
  visibility,
  parentCommentId,
}: PreOnQuizArgs): CommentMutatorPayload => {
  const ordinalId = parentCommentId ?? commentsId;
  const state = getState();
  const { session: { curMailer, curToken, quota, mutateRole } } = state;
  const { userId, commentId: commentIdNumber } = parseCommentId(commentId);
  const pathIndex = mutateRole === 'ROLE_ADMIN' ? 'Boss' : mutateRole === 'ROLE_USER' ? 'Minion' : 'Underboss';
  const path = quizzesOnPaths.course[`set${pathIndex}QuizzOnBanners`];
  const payload: QuizzOnCourseBannerArgs = {
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
    roleDashboards: {
      visibility,
      parentIds: [userId],
      ordinals: [-ordinalId],
      childIds: [commentIdNumber],
      texts: ['quizOnCourse', commentText],
    },
  };
  return { path, payload };
};

export const getQuizOnCourseCoversPayload = ({
  getState,
  parentIDs,
  commentText,
  commentId,
  parentCommentId,
  visibility,
}: PreQuizOnCoversArgs): CommentMutatorPayload => {
  const state = getState();
  const { session: { curMailer, curToken, quota, mutateRole } } = state;
  const { userId, commentId: commentIdNumber } = parseCommentId(commentId);
  const pathIndex = mutateRole === 'ROLE_ADMIN' ? 'Boss' : mutateRole === 'ROLE_USER' ? 'Minion' : 'Underboss';
  const path = quizzesOnPaths.course[`set${pathIndex}QuizzOnCovers`];
  const payload: QuizzOnCoverArgs = {
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
    roleDashboards: {
      visibility,
      parentIds: [userId],
      childIds: [commentIdNumber],
      ordinals: [-parentCommentId],
      texts: ['quizOnMessage', commentText],
    },
  };
  return { path, payload };
};

export const getQuizOnTutorialBannersPayload = ({
  getState,
  commentsId,
  parentIDs,
  commentText,
  commentId,
  visibility,
  parentCommentId,
}: PreOnQuizArgs): CommentMutatorPayload => {
  const ordinalId = parentCommentId ?? commentsId;
  const state = getState();
  const { session: { curMailer, curToken, quota, mutateRole } } = state;
  const { userId, commentId: commentIdNumber } = parseCommentId(commentId);
  const pathIndex = mutateRole === 'ROLE_ADMIN' ? 'Boss' : mutateRole === 'ROLE_USER' ? 'Minion' : 'Underboss';
  const path = quizzesOnPaths.tutorial[`set${pathIndex}QuizzOnBanners`];
  const payload: QuizzOnTutorialBannerArgs = {
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
    roleDashboards: {
      visibility,
      parentIds: [userId],
      ordinals: [-ordinalId],
      childIds: [commentIdNumber],
      texts: ['quizOnTutorial', commentText],
    },
  };
  return { path, payload };
};

export const getQuizOnTutorialStepsPayload = ({
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
  const path = quizzesOnPaths.tutorial[`set${pathIndex}QuizzOnSteps`];
  const payload: QuizzOnStepArgs = {
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
    roleDashboards: {
      visibility,
      parentIds: [userId],
      childIds: [commentIdNumber],
      ordinals: [-parentCommentId],
      texts: ['quizOnMessage', commentText],
    },
  };
  return { path, payload };
};
