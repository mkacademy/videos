import type { RootState } from '../store/types';
import { parseCommentId } from '../types/comments';
import {
  COMMENTS_MUTATION_PATHS,
  type MessageOnCourseBannerArgs,
  type MessageOnCoverArgs,
} from './comments-api-messagesOn-mutations';
import type { CommentMutatorPayload, PreOnStepsArgs } from './TutorialComentsUtils';
import {
  COMMENTS_MUTATION_PATHS as coursesOnPaths,
  type CourseOnCourseBannerArgs,
  type CourseOnCoverArgs,
  type CourseOnTutorialBannerArgs,
  type CourseOnStepArgs,
  type CourseOnQuizArgs,
} from './comments-api-coursesOn-mutations';

export interface PreOnCourseArgs {
  getState: () => RootState;
  commentId: string;
  commentsId: number;
  parentIDs: number[];
  commentText: string;
  visibility: string;
  parentCommentId?: number;
}

export interface PreOnCoversArgs {
  getState: () => RootState;
  commentId: string;
  parentIDs: number[];
  commentText: string;
  parentCommentId: number;
  visibility: string ;
}

export const getMessageOnBannersPayload = ({
  getState,
  commentsId,
  parentIDs,
  commentText,
  commentId,
  visibility,
  parentCommentId,
}: PreOnCourseArgs): CommentMutatorPayload => {
  const ordinalId = parentCommentId ?? commentsId;
  const state = getState();
  const { session: { curMailer, curToken, quota, mutateRole } } = state;
  const { userId, commentId: commentIdNumber } = parseCommentId(commentId);
  const pathIndex = mutateRole === 'ROLE_ADMIN' ? 'Boss' : mutateRole === 'ROLE_USER' ? 'Minion' : 'Underboss';
  const path = COMMENTS_MUTATION_PATHS.course[`set${pathIndex}MessageOnBanners`];
  const payload: MessageOnCourseBannerArgs = {
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
    siftershighersifters: parentIDs.length > 0
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
    siftersRole: {
      visibility: "EVERYBODY",
      parentIds: [ordinalId],
      childIds: [userId],
    },
    roleInstructions: {
      visibility,
      parentIds: [userId],
      ordinals: [-ordinalId],
      childIds: [commentIdNumber],
      texts: ['messageOnCourse', commentText, 'data:image'],
    },
  };
  return { path, payload };
};

export const getMessageOnCoversPayload = ({
  getState,
  parentIDs,
  commentText,
  commentId,
  parentCommentId,
  visibility,
}: PreOnCoversArgs): CommentMutatorPayload => {
  const state = getState();
  const { session: { curMailer, curToken, quota, mutateRole } } = state;
  const { userId, commentId: commentIdNumber } = parseCommentId(commentId);
  const pathIndex = mutateRole === 'ROLE_ADMIN' ? 'Boss' : mutateRole === 'ROLE_USER' ? 'Minion' : 'Underboss';
  const path = COMMENTS_MUTATION_PATHS.course[`set${pathIndex}MessageOnCovers`];
  const payload: MessageOnCoverArgs = {
    quota: quota ?? null,
    curToken: curToken,
    mailer: curMailer,
    mutateRole: mutateRole,
    siftersinstructions: {
      parentIds: parentIDs,
      childIds: [parentCommentId],
      visibility: "EVERYBODY",
    },
    instructionsRole: {
      visibility: "EVERYBODY",
      parentIds: [parentCommentId],
      childIds: [userId],
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

export const getCourseOnBannersPayload = ({
  getState,
  commentsId,
  parentIDs,
  commentText,
  commentId,
  visibility,
  parentCommentId,
}: PreOnCourseArgs): CommentMutatorPayload => {
  const ordinalId = parentCommentId ?? commentsId;
  const state = getState();
  const { session: { curMailer, curToken, quota, mutateRole } } = state;
  const { userId, commentId: commentIdNumber } = parseCommentId(commentId);
  const pathIndex = mutateRole === 'ROLE_ADMIN' ? 'Boss' : mutateRole === 'ROLE_USER' ? 'Minion' : 'Underboss';
  const path = coursesOnPaths.course[`set${pathIndex}CourseOnBanners`];
  const payload: CourseOnCourseBannerArgs = {
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
    roleSifters: {
      visibility,
      parentIds: [userId],
      ordinals: [-ordinalId],
      childIds: [commentIdNumber],
      texts: ['courseOnCourse', commentText],
    },
  };
  return { path, payload };
};

export const getCourseOnCoversPayload = ({
  getState,
  parentIDs,
  commentText,
  commentId,
  parentCommentId,
  visibility,
}: PreOnCoversArgs): CommentMutatorPayload => {
  const state = getState();
  const { session: { curMailer, curToken, quota, mutateRole } } = state;
  const { userId, commentId: commentIdNumber } = parseCommentId(commentId);
  const pathIndex = mutateRole === 'ROLE_ADMIN' ? 'Boss' : mutateRole === 'ROLE_USER' ? 'Minion' : 'Underboss';
  const path = coursesOnPaths.course[`set${pathIndex}CourseOnCovers`];
  const payload: CourseOnCoverArgs = {
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
    roleSifters: {
      visibility,
      parentIds: [userId],
      childIds: [commentIdNumber],
      ordinals: [-parentCommentId],
      texts: ['courseOnMessage', commentText],
    },
  };
  return { path, payload };
};

export const getCourseOnTutorialBannersPayload = ({
  getState,
  commentsId,
  parentIDs,
  commentText,
  commentId,
  visibility,
  parentCommentId,
}: PreOnCourseArgs): CommentMutatorPayload => {
  const ordinalId = parentCommentId ?? commentsId;
  const state = getState();
  const { session: { curMailer, curToken, quota, mutateRole } } = state;
  const { userId, commentId: commentIdNumber } = parseCommentId(commentId);
  const pathIndex = mutateRole === 'ROLE_ADMIN' ? 'Boss' : mutateRole === 'ROLE_USER' ? 'Minion' : 'Underboss';
  const path = coursesOnPaths.tutorial[`set${pathIndex}CourseOnBanners`];
  const payload: CourseOnTutorialBannerArgs = {
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
    roleSifters: {
      visibility,
      parentIds: [userId],
      ordinals: [-ordinalId],
      childIds: [commentIdNumber],
      texts: ['courseOnTutorial', commentText],
    },
  };
  return { path, payload };
};

export const getCourseOnTutorialStepsPayload = ({
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
  const path = coursesOnPaths.tutorial[`set${pathIndex}CourseOnSteps`];
  const payload: CourseOnStepArgs = {
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
    roleSifters: {
      visibility,
      parentIds: [userId],
      childIds: [commentIdNumber],
      ordinals: [-parentCommentId],
      texts: ['courseOnMessage', commentText],
    },
  };
  return { path, payload };
};

interface PreCourseOnQuizRootArgs {
  getState: () => RootState;
  commentsId: number;
  parentIDs: number[];
  commentText: string;
  commentId: string;
  visibility: string;
  parentCommentId?: number;
}

export const getCourseOnQuizzesPayload = ({
  getState,
  commentsId,
  parentIDs,
  commentText,
  commentId,
  visibility,
  parentCommentId,
}: PreCourseOnQuizRootArgs): CommentMutatorPayload => {
  const ordinalId = parentCommentId ?? commentsId;
  const state = getState();
  const { session: { curMailer, curToken, quota, mutateRole } } = state;
  const { userId, commentId: commentIdNumber } = parseCommentId(commentId);
  const pathIndex = mutateRole === 'ROLE_ADMIN' ? 'Boss' : mutateRole === 'ROLE_USER' ? 'Minion' : 'Underboss';
  const path = coursesOnPaths.quiz[`set${pathIndex}CourseOnQuizzes`];
  const payload: CourseOnQuizArgs = {
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
    roleSifters: {
      visibility,
      parentIds: [userId],
      ordinals: [-ordinalId],
      childIds: [commentIdNumber],
      texts: ['courseOnQuiz', commentText],
    },
  };
  return { path, payload };
};
