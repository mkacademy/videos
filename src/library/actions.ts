import { createAction } from '@reduxjs/toolkit';
import { ParentData, ViewPayload } from '../store/slices/viewSlice';
import { FormData, MutateEntityResponse } from './types';
import { IncomingMessage, IncommingMessageStatus } from './commsUtils';
import {
  FinalizeDeletePayload,
  FinalizeAddPayload,
  ExtractToCpanelPayload,
  FinalizejoinPayload,
  FinalizeUnjoinPayload
} from '../store/middleware/UiuxManager';
import { AddedItem } from './DeletionManagerUtils';
import { Status } from '../store/slices/actionSlice';
import { OutgoingMessage, Tutor } from '../store/slices/commsSlice';
import { Banner as TutorialBanner, Content } from '../store/slices/tutorialSlice';
import { Quiz, Submition } from '../store/slices/quizSlice';
import { SlideItem, Banner as CourseBanner, Pennant, SlideGroupItem } from '../store/slices/courseSlice';
import { DataRow, MenuItem, Metadata } from '../components/Core/types';
import { InitNavigatorPayload } from '../store/middleware/NavigationTrackerEFG';
import { PayloadWithFromTo } from '../store/middleware/CrudsManager123';
import { RestoreInteractionsPayload } from '../store/slices/interactionSlice';
import { MergeInteractionsPayload } from '../store/slices/interactionSlice';
import { InitInteractionsPayload } from '../store/slices/interactionSlice';
import { StatsMiddlewareState } from '../store/types';
import { Executedquery, FetchDataPayload } from './ThunksUtils';
import { Handler } from '../store/slices/errorSlice';
import { Search } from '../store/slices/searchSlice';
import { ResultPayload } from '../store/slices/rowSlice';
import { MutationDataAccumulator } from '../Hooks/useSaveMutations';

/** Type prefix passed to createAsyncThunk for fetchSkeletons (Thunks.ts). Slices listen with FETCH_SKELETONS_FULFILLED. */
export const FETCH_SKELETONS_THUNK_TYPE = 'fetchSkeletons' as const;
export const FETCH_SKELETONS_FULFILLED = `${FETCH_SKELETONS_THUNK_TYPE}/fulfilled`;

export interface InitLoadingPayload {
  entity?: string;
  search?: string;
  prefix?: string;
  parent?: string,
  urlData?: string,
  menuSize?: number,
  operation?: string,
  rootIDS?: string[],
  contentIds?: number[];
  cpanelmessage?: string,
  parentData?: ParentData;
  insertedRows?: DataRow[],
  searchedRoutes?: Search[],
  selectedTraversal?: number;
  handles?: Record<string, Handler[]>;
}

export interface InitReloadingPayload {
  isAppend?: boolean;
  isPrivate?: boolean;
  isFetching?: boolean;
  isIncognito?: boolean;
}

export interface MockPayload {
  owner: boolean;
  entity: string;
  childIds: number[];
  interaction?: boolean;
  parent: string | undefined;
}

export interface MetadataPayload {
  interaction?: boolean;
  data: Metadata[],
  GUID?: string;
  orig: string;
  dest: string;
}

export interface clearSelectedPayload {
  pathname: string;
  payload: erasePayload;
}

export interface clearFetchedPayload {
  pathname: string;
  payload: boolean;
}

export interface erasePayload {
  Ids?: number[] | string[];
  IDs?: number[];
  route?: string;
  isShow: boolean;
}

export interface viewConvolutionPayload {
  to: string;
  from: string;
  curApp: number;
  contentIds: number[];
}

// New payload interfaces for the middleware actions
export interface ZipRecordsPayload {
  source: string;
  dismisstype: boolean;
}

export interface ExtractRowsPayload {
  source: string;
  dismisstype: boolean;
  timestamp: string;
  approute: string;
}

export interface ExtractContentPayload {
  destination: string;
  selecttype: boolean;
  timestamp: string;
  approute: string;
}

export interface InsertImageUrlsPayload {
  destination: string;
  timestamp: string;
  approute: string;
}

export interface SetImageUrlsPayload {
  timestamp: string;
  approute: string;
}

export interface ShowAlgorithmPayload {
  parentApp: number;
  path: string;
}
// Update actions
export interface UpdatePayload {
  id: number;
  quote?: string;
  title?: string;
  ordinal?: number;
  content?: string;
  imageurl?: string;
  bannerId?: number;
  filterId?: number;
  sizeInBytes?: number;
  isDismissed?: boolean;
  isHighlighted?: boolean;
  status?: Status | number;
  descendentsSums?: Record<string, number>;
  modified?: boolean;
  edited?: boolean;
}
// Ordinal update actions
export interface OrdinalUpdate {
  id: number;
  ordinal: number;
  bannerIds: number[];
}

/** Negative ordinals are reserved for comment chaining and must not be sent as reorder updates. */
export const isPersistableOrdinal = (ordinal: number): boolean =>
  Number.isFinite(ordinal) && ordinal >= 0;

export const sanitizeNumericOrdinalBatch = (
  batch: Record<number, number>,
): Record<number, number> => {
  const sanitized: Record<number, number> = {};
  for (const [idStr, ordinal] of Object.entries(batch)) {
    if (isPersistableOrdinal(ordinal)) sanitized[Number(idStr)] = ordinal;
  }
  return sanitized;
};

export const sanitizeStringKeyOrdinalBatch = (
  batch: Record<string, number>,
): Record<string, number> => {
  const sanitized: Record<string, number> = {};
  for (const [key, ordinal] of Object.entries(batch)) {
    if (isPersistableOrdinal(ordinal)) sanitized[key] = ordinal;
  }
  return sanitized;
};

export interface MetadataUpdate {
  id: number;
  owner: boolean;
  ordinal: number;
  bannerId?: number;
}
export const fetchedClearers: Record<string, string> = {
  "/convolution/quiz": "quiz/clearFetched",
  "/convolution/cpanel": "response/clearFetched",
  "/convolution/tutors": "comms/clearTutors",
  "/convolution/course": "course/clearFetched",
  "/convolution/outgoing": "comms/clearOutgoing",
  "/convolution/incoming": "comms/clearIncoming",
  "/convolution/tutorial": "tutorial/clearFetched",
};

export const fetchedErasers: Record<string, string> = {
  "/convolution/quiz": "quiz/clearSelected",
  "/convolution/tutors": "comms/eraseTutors",
  "/convolution/course": "course/clearSelected",
  "/convolution/outgoing": "comms/eraseOutgoing",
  "/convolution/incoming": "comms/eraseIncoming",
  "/convolution/tutorial": "tutorial/clearSelected",
};

export const clearFetched = ({ pathname, payload }: clearFetchedPayload) => ({
  type: fetchedClearers[pathname],
  payload,
});

export const clearSelected = ({ pathname, payload }: clearSelectedPayload) => ({
  type: fetchedErasers[pathname],
  payload,
});

export interface saveTutorsEditsPayload {
  deleted?: {
    foundationbosses?: string[];
    foundationminions?: string[];
    foundationunderbosses?: string[];
  };
  added?: {
    foundationbosses?: AddedItem[];
    foundationminions?: AddedItem[];
    foundationunderbosses?: AddedItem[];
  };
  mutateRole?: string | null;
  curToken?: string | null;
  formatter?: string | null;
  curMailer?: number | null;
  quota?: number | null;
  updates?: Tutor[];
  ordinals?: {
    foundationbosses?: OrdinalUpdate[];
    foundationminions?: OrdinalUpdate[];
    foundationunderbosses?: OrdinalUpdate[];
  };
}

export interface saveOutgoingEditsPayload {
  deleted?: {
    bossesfilters?: string[];
    bossesinstructions?: string[];
    bossesdashboards?: string[];
    bossessifters?: string[];
    underbossesdashboards?: string[];
    underbossesinstructions?: string[];
    underbossesfilters?: string[];
    underbossessifters?: string[];
    minionsfilters?: string[];
    minionssifters?: string[];
    minionsdashboards?: string[];
    minionsinstructions?: string[];
  };
  added?: {
    bossesfilters?: AddedItem[];
    bossesinstructions?: AddedItem[];
    bossesdashboards?: AddedItem[];
    bossessifters?: AddedItem[];
    underbossesdashboards?: AddedItem[];
    underbossesinstructions?: AddedItem[];
    underbossesfilters?: AddedItem[];
    underbossessifters?: AddedItem[];
    minionsfilters?: AddedItem[];
    minionssifters?: AddedItem[];
    minionsdashboards?: AddedItem[];
    minionsinstructions?: AddedItem[];
  };
  updates?: OutgoingMessage[];
  inserted?: OutgoingMessage[];
  sent?: Record<string, {
    id: number;
    type: string;
    targets: (string | number)[];
    status: {
      communications?: string;
      primary: { disabled: boolean; label: string };
      danger: { disabled: boolean; label: string };
    };
  }[]>;
  mutateRole?: string | null;
  curToken?: string | null;
  curMailer?: number | null;
  formatter?: string | null;
  quota?: number | null;
  ordinals?: {
    bossesfilters?: OrdinalUpdate[];
    bossesinstructions?: OrdinalUpdate[];
    bossesdashboards?: OrdinalUpdate[];
    bossessifters?: OrdinalUpdate[];
    underbossesdashboards?: OrdinalUpdate[];
    underbossesinstructions?: OrdinalUpdate[];
    underbossesfilters?: OrdinalUpdate[];
    underbossessifters?: OrdinalUpdate[];
    minionsfilters?: OrdinalUpdate[];
    minionssifters?: OrdinalUpdate[];
    minionsdashboards?: OrdinalUpdate[];
    minionsinstructions?: OrdinalUpdate[];
  };
}

export interface saveTutorialEditsPayload {
  deleted?: {
    foundationfilters?: string[];
    filtersinstructions?: string[];
  };
  added?: {
    foundationfilters?: AddedItem[];
    filtersinstructions?: AddedItem[];
  };
  inserted?: {
    foundationfilters?: TutorialBanner[];
    filtersinstructions?: Content[];
  };
  updates?: {
    foundationfilters?: TutorialBanner[];
    filtersinstructions?: Content[];
  };
  mutateRole?: string | null;
  curToken?: string | null;
  curMailer?: number | null;
  formatter?: string | null;
  quota?: number | null;
  ordinals?: {
    foundationfilters?: OrdinalUpdate[];
    filtersinstructions?: OrdinalUpdate[];
  };
}

export interface saveQuizEditsPayload {
  deleted?: {
    foundationdashboards?: string[];
    dashboardsfilters?: string[];
    dashboardssifters?: string[];
    siftersfilters?: string[];
    siftersinstructions?: string[];
    filtersinstructions?: string[];
  };
  added?: {
    foundationdashboards?: AddedItem[];
    dashboardsfilters?: AddedItem[];
    dashboardssifters?: AddedItem[];
    siftersfilters?: AddedItem[];
    siftersinstructions?: AddedItem[];
    filtersinstructions?: AddedItem[];
  };
  inserted?: {
    foundationdashboards?: Quiz[];
    dashboardsfilters?: Submition[];
    dashboardssifters?: CourseBanner[];
    siftersfilters?: Pennant[];
    siftersinstructions?: SlideGroupItem[];
    filtersinstructions?: SlideItem[];
  };
  updates?: {
    foundationdashboards?: Quiz[];
    dashboardsfilters?: Submition[];
    dashboardssifters?: CourseBanner[];
    siftersfilters?: Pennant[];
    siftersinstructions?: SlideGroupItem[];
    filtersinstructions?: SlideItem[];
  };
  mutateRole?: string | null;
  curToken?: string | null;
  curMailer?: number | null;
  formatter?: string | null;
  quota?: number | null;
  ordinals?: {
    foundationdashboards?: OrdinalUpdate[];
    dashboardsfilters?: OrdinalUpdate[];
    dashboardssifters?: OrdinalUpdate[];
    siftersfilters?: OrdinalUpdate[];
    siftersinstructions?: OrdinalUpdate[];
    filtersinstructions?: OrdinalUpdate[];
  };
}

export interface saveCourseEditsPayload {
  deleted?: {
    siftersfilters?: string[];
    foundationsifters?: string[];
    siftersinstructions?: string[];
    filtersinstructions?: string[];
  };
  added?: {
    siftersfilters?: AddedItem[];
    foundationsifters?: AddedItem[];
    siftersinstructions?: AddedItem[];
    filtersinstructions?: AddedItem[];
  };
  inserted?: {
    siftersfilters?: Pennant[];
    foundationsifters?: CourseBanner[];
    siftersinstructions?: SlideGroupItem[];
    filtersinstructions?: SlideItem[];
  };
  updates?: {
    siftersfilters?: Pennant[];
    foundationsifters?: CourseBanner[];
    siftersinstructions?: SlideGroupItem[];
    filtersinstructions?: SlideItem[];
  };
  mutateRole?: string | null;
  curToken?: string | null;
  curMailer?: number | null;
  formatter?: string | null;
  quota?: number | null;
  ordinals?: {
    siftersfilters?: OrdinalUpdate[];
    foundationsifters?: OrdinalUpdate[];
    siftersinstructions?: OrdinalUpdate[];
    filtersinstructions?: OrdinalUpdate[];
  };
}

export interface mutateIncomingPayload {
  formatter?: string;
  quota?: number | null;
  curToken?: string | null;
  mutateRole?: string | null;
  curMailer?: number | null;
  marked?: {
    id: number;
    type: string;
    status: IncommingMessageStatus['status'];
  }[];
  updates?: IncomingMessage[];
  deleted?: {
    foundationfilters?: string[];
    foundationsifters?: string[];
    foundationdashboards?: string[];
    foundationinstructions?: string[];
  };
  added?: {
    foundationfilters?: AddedItem[];
    foundationsifters?: AddedItem[];
    foundationdashboards?: AddedItem[];
    foundationinstructions?: AddedItem[];
  };
  ordinals?: {
    foundationfilters?: OrdinalUpdate[];
    foundationsifters?: OrdinalUpdate[];
    foundationdashboards?: OrdinalUpdate[];
    foundationinstructions?: OrdinalUpdate[];
  };
}

export interface InsertStatsPayload {
  screen: string;
  state: StatsMiddlewareState;
  totals: Record<string, number>;
  counts: Record<string, Record<string, number>>;
  query: Record<string, Record<string, Executedquery>>;
  requestId?: string;
}


export interface Freight {
  destination: string;
  timestamp: string;
  approute: string;
  selecttype: boolean;
}

export interface CascadingUnstashPayload {
  freights: Freight[];
  restoreFormatter?: string;
  postUnstashHydration?: boolean;
}

export interface OwnershipPayload {
  ids: string[];
  owner: boolean;
  route: string;
}

export const QuizRootTreeSelection = createAction<{ ids: number[]; isHighlighted?: boolean }>('QuizRootTreeSelection');
export const CourseRootTreeSelection = createAction<{ ids: number[]; isHighlighted?: boolean }>('CourseRootTreeSelection');
export const TutorialRootTreeSelection = createAction<{ ids: number[]; isHighlighted?: boolean }>('TutorialRootTreeSelection');
export const CoursePennantTreeSelection = createAction<{ ids: number[]; isHighlighted?: boolean }>('CoursePennantTreeSelection');
export const QuizQuestionTreeSelection = createAction<{ ids: number[]; isHighlighted?: boolean }>('QuizQuestionTreeSelection');

/** Bottom-left o on quiz questions: toggles dashboardsfilters ↔ dashboardssifters. */
export const toggleQuizQuestionSubmissionRoute = createAction<{ bannerId: number }>('toggleQuizQuestionSubmissionRoute');
/** Bottom-right o on quiz questions: toggles dashboardssifters ↔ siftersinstructions. */
export const toggleQuizQuestionOptionsRoute = createAction<{ bannerId: number }>('toggleQuizQuestionOptionsRoute');
/** Bottom-left o on quiz follow-ups: toggles siftersfilters ↔ dashboardsfilters. */
export const toggleQuizFollowupSubmissionRoute = createAction<{ bannerId: number }>('toggleQuizFollowupSubmissionRoute');
/** Bottom-right o on quiz follow-ups: toggles siftersfilters ↔ filtersinstructions. */
export const toggleQuizFollowupOptionsRoute = createAction<{ bannerId: number }>('toggleQuizFollowupOptionsRoute');

export const mutateRows = createAction<MutateEntityResponse>('mutateRows');
export const linkRows = createAction<MutateEntityResponse>('linkRows');
export const extractCsObject = createAction('extractCsObject');
export const urlGuidMismatch = createAction('urlGuidMismatch');
export const matchKeyId = createAction<string>('matchKeyId');
export const matchKeyword = createAction<string>('matchKeyword');
export const unmatchKeyId = createAction<string>('unmatchKeyId');
export const unmatchKeyword = createAction<string>('unmatchKeyword');
export const accountMutation = createAction<FormData>('accountMutation');
export const initNavigator = createAction<InitNavigatorPayload>('initNavigator');
export const selectTraversal = createAction<InitLoadingPayload>('selectTraversal');
export const appendTraversals = createAction<MenuItem[] | string>('appendTraversals');
export const setFoundationRows = createAction<{ operation: string }>('setFoundationRows');
export const hydrateRows = createAction<ResultPayload>('hydrateRows');
export const exportTexts = createAction('exportTexts');
export const importTexts = createAction('importTexts');
export const importStash = createAction('importStash');
export const hydrateData = createAction<number>('hydrateData');
export const hierachyChanged = createAction('hierachyChanged');
export const exportAlgorithm = createAction('exportAlgorithm');
export const importAlgorithm = createAction('importAlgorithm');
export const exportTraversals = createAction('exportTraversals');
export const importTraversals = createAction('importTraversals');
export const stashTutorials = createAction('stashTutorials');
export const unstashTutorials = createAction('unstashTutorials');
export const stashCourses = createAction('stashCourses');
export const unstashCourses = createAction('unstashCourses');
export const stashQuizzes = createAction('stashQuizzes');
export const unstashQuizzes = createAction('unstashQuizzes');
export const saveTutorialTrees = createAction('saveTutorialTrees');
export const saveCourseTrees = createAction('saveCourseTrees');
export const saveQuizTrees = createAction('saveQuizTrees');
export const approveTutorialTrees = createAction('approveTutorialTrees');
export const approveCourseTrees = createAction('approveCourseTrees');
export const approveQuizTrees = createAction('approveQuizTrees');

export interface FetchCommentsPayload {
  commentsId: number;
  parentIDs: number[];
}

/** Intercepted by commentsMiddleware to fetch comments. */
export const fetchTutorialComments = createAction<FetchCommentsPayload>('comments/fetchTutorial');
export const fetchCourseComments = createAction<FetchCommentsPayload>('comments/fetchCourse');
export const fetchQuizComments = createAction<FetchCommentsPayload>('comments/fetchQuiz');
export const saveTutorsEdits = createAction<saveTutorsEditsPayload>('saveTutorsEdits');
export const saveIncomingEdits = createAction<mutateIncomingPayload>('saveIncomingEdits');
export const saveOutgoingEdits = createAction<saveOutgoingEditsPayload>('saveOutgoingEdits');

export const extractKeywords = createAction('extractKeywords');
export const discardPayloads = createAction('discardPayloads');
export const createMocks = createAction<string>('createMocks');
export const showAlgorithm = createAction<string>('showAlgorithm');
export const createOrdering = createAction<string>('createOrdering');
export const reshowAlgorithm = createAction<ShowAlgorithmPayload>('reshowAlgorithm');
export const draftOutgoing = createAction<PayloadWithFromTo>('draftOutgoing');
export const deleteOverview = createAction<string>('deleteOverview');
export const unjoinOverview = createAction<string>('unjoinOverview');
export const joinOverview = createAction<string>('joinOverview');
export const showForms = createAction<string>('showForms');
export const unzipContent = createAction('unzipContent');
export const zipContent = createAction('zipContent');
export const rezipContent = createAction('rezipContent');

export interface RezipOutgoingPayload {
  from: string;
  to: string;
  messageKey: string;
}

export const rezipOutgoing = createAction<RezipOutgoingPayload>('rezipOutgoing');

// Settings apply actions
export const mutateMyAbility = createAction('mutateMyAbility');
export const mutateImageUrl = createAction('mutateImageUrl');
export const contentVisibility = createAction('contentVisibility');
export const mutateQuotas = createAction('mutateQuotas');
export const mutateAbilities = createAction('mutateAbilities');
export const mutateHierachies = createAction('mutateHierachies');
export const deleteOrphans = createAction('deleteOrphans');
export const aquireVoucher = createAction('aquireVoucher');

export const extractToCpanel = createAction<ExtractToCpanelPayload>('extractToCpanel');
export const finalizeUnjoin = createAction<FinalizeUnjoinPayload>('finalizeUnjoin');
export const finalizeDelete = createAction<FinalizeDeletePayload>('finalizeDelete');
export const finalizeAdd = createAction<FinalizeAddPayload>('finalizeAdd');
export const finalizejoin = createAction<FinalizejoinPayload>('finalizejoin');
export const unfinalizeDelete = createAction<string>('unfinalizeDelete');
export const unfinalizeAdd = createAction<string>('unfinalizeAdd');

// Highlight middleware actions
export const clearHighlighted = createAction<string>('clearHighlighted');
export const invertHighlighted = createAction<string>('invertHighlighted');
export const unHighlightAll = createAction<string>('unHighlightAll');
export const highlightAll = createAction<string>('highlightAll');

// Overview ordinals middleware action
export const overviewOrdinals = createAction('overviewOrdinals');
export const saveCourseEdits = createAction<saveCourseEditsPayload>('saveCourseEdits');
export const saveTutorialEdits = createAction<saveTutorialEditsPayload>('saveTutorialEdits');
export const saveQuizEdits = createAction<saveQuizEditsPayload>('saveQuizEdits');//

export type SaveEditsKind = 'tutors' | 'incoming' | 'outgoing' | 'tutorial' | 'quiz' | 'course';

export type saveEditsPayload =
  | { kind: 'tutors'; payload?: saveTutorsEditsPayload }
  | { kind: 'incoming'; payload?: mutateIncomingPayload }
  | { kind: 'outgoing'; payload?: saveOutgoingEditsPayload }
  | { kind: 'tutorial'; payload?: saveTutorialEditsPayload }
  | { kind: 'quiz'; payload?: saveQuizEditsPayload }
  | { kind: 'course'; payload?: saveCourseEditsPayload };

export const saveEdits = createAction<saveEditsPayload>('saveEdits');

export const beginQueuedTabulatorSave = createAction<MutationDataAccumulator>('beginQueuedTabulatorSave');

// Root tags middleware actions
export const zipOverview = createAction<PayloadWithFromTo>('zipOverview');
export const extractMocks = createAction<PayloadWithFromTo>('extractMocks');
export const cpanelJoiner = createAction<PayloadWithFromTo>('cpanelJoiner');
export const shortcutJoiner = createAction<PayloadWithFromTo>('shortcutJoiner');
export const simpleClearer = createAction<PayloadWithFromTo>('simpleClearer');
export const simpleInverter = createAction<PayloadWithFromTo>('simpleInverter');
export const simpleSelector = createAction<PayloadWithFromTo>('simpleSelector');
export const cpanelUnjoiner = createAction<PayloadWithFromTo>('cpanelUnjoiner');
export const destroyOverview = createAction<PayloadWithFromTo>('destroyOverview');
export const simpleUnselector = createAction<PayloadWithFromTo>('simpleUnselector');

// Initialize loading actions
export const initTotals = createAction('initTotals');
export const initLoading = createAction<InitLoadingPayload>('initLoading');
export const insertStats = createAction<InsertStatsPayload>('insertStats');
export const initReloading = createAction<InitReloadingPayload>('initReloading');
export const imageTextSwap = createAction<{ txtimg: boolean, txtswap: boolean }>('imageTextSwap');

// View actions
export const appendImports = createAction<{
  data: DataRow[] | Record<string, DataRow[]>;
  actionType: string;
}>('appendImports');
export const fetchingCompleted = createAction<{ dest?: string, orig?: string }>('fetchingCompleted');
export const escrowConvolution = createAction<viewConvolutionPayload>('viewConvolution');
export const escrowContents = createAction<string | undefined>('viewContents');
export const escrowRows = createAction<string | undefined>('viewRows');
// Mock actions
export const fetchRows = createAction<ViewPayload>('fetchRows');
export const abortInsertMetadata = createAction('abortInsertMetadata');
export const fetchContents = createAction<ViewPayload>('fetchContents');
export const insertMetadata = createAction<MetadataPayload>('insertMetadata');
export const hydrateMetadata = createAction<MetadataPayload>('hydrateMetadata');
export const fetchMockMetadata = createAction<MockPayload>('fetchMockMetadata');

// Quiz actions
export const createSteps = createAction<string[]>('createSteps');
export const createQuizzes = createAction<string[]>('createQuizzes');
export const createCourses = createAction<string[]>('createCourses');
export const createTutorials = createAction<string[]>('createTutorials');
export const createContainer = createAction<string[]>('createContainer');
export const persistQuizzes = createAction<{ id: string; modified: boolean }[]>('persistQuizzes');
export const persistTutorials = createAction<{ id: string; modified: boolean }[]>('persistTutorials');
export const persistCourses = createAction<{ id: string; modified: boolean }[]>('persistCourses');
export const persistSteps = createAction<{ id: string; modified: boolean }[]>('persistSteps');


export const updateSteps = createAction<UpdatePayload[]>('updateSteps');
export const updateTutorials = createAction<UpdatePayload[]>('updateTutorials');
export const updateCourses = createAction<UpdatePayload[]>('updateCourses');
export const updateQuizzes = createAction<UpdatePayload[]>('updateQuizzes');
export const updateBosses = createAction<UpdatePayload[]>('updateBosses');
export const updateUnderbosses = createAction<UpdatePayload[]>('updateUnderbosses');
export const updateMinions = createAction<UpdatePayload[]>('updateMinions');
export const tutorialsCompleted = createAction('tutorialsCompleted');
export const coursesCompleted = createAction('coursesCompleted');
export const containerCompleted = createAction('containerCompleted');
export const quizzesCompleted = createAction('quizzesCompleted');
export const stepsCompleted = createAction('stepsCompleted');

export const updateStepsOrdinals = createAction<OrdinalUpdate[]>('updateStepsOrdinals');
export const updateCoversOrdinals = createAction<OrdinalUpdate[]>('updateCoversOrdinals');
export const updateQuestionsOrdinals = createAction<OrdinalUpdate[]>('updateQuestionsOrdinals');
export const updatePennantsOrdinals = createAction<OrdinalUpdate[]>('updatePennantsOrdinals');
export const updateRootsOrdinals = createAction<OrdinalUpdate[]>('updateRootsOrdinals');
export const updateQuizOrdinals = createAction<OrdinalUpdate[]>('updateQuizOrdinals');

export const updateRootsMetadata = createAction<MetadataUpdate[]>('updateRootsMetadata');
export const updateQuizMetadata = createAction<MetadataUpdate[]>('updateQuizMetadata');
export const updateQuestionsMetadata = createAction<MetadataUpdate[]>('updateQuestionsMetadata');
export const updateStepsMetadata = createAction<MetadataUpdate[]>('updateStepsMetadata');
export const updateCoversMetadata = createAction<MetadataUpdate[]>('updateCoversMetadata');
export const updatePennantsMetadata = createAction<MetadataUpdate[]>('updatePennantsMetadata');
export const updateAnswersMetadata = createAction<MetadataUpdate[]>('updateAnswersMetadata');

// Communication actions
export const activateTutors = createAction('activateTutors');
export const markIncoming = createAction('markIncoming');
export const sendOutgoing = createAction('sendOutgoing');
export const UnzipAndHydrate = createAction('UnzipAndHydrate');
export const hydrateSkeletons = createAction('hydrateSkeletons');
export const hydrateSkeletonRows = createAction('hydrateSkeletonRows');

// Content actions (third import)
export const cacheContent = createAction<string>('cacheContent');
export const hydratedThenFetch = createAction<FetchDataPayload>('hydratedThenFetch');
export const updateMetadataId = createAction<{ ids: string[]; entity: string }>('updateMetadataId');
export const restoreInteractions = createAction<RestoreInteractionsPayload>('restoreInteractions');
export const mergeInteractions = createAction<MergeInteractionsPayload>('mergeInteractions');
export const initInteractions = createAction<InitInteractionsPayload>('initInteractions');

// Settings middleware actions (second import statement)
export const initSettings = createAction('initSettings');
export const extractRows = createAction<ExtractRowsPayload>('extractRows');
export const extractContent = createAction<ExtractContentPayload>('extractContent');
export const insertImageUrls = createAction<InsertImageUrlsPayload>('insertImageUrls');
export const setImageUrls = createAction<SetImageUrlsPayload>('setImageUrls');
export const unzipRecords = createAction<ZipRecordsPayload>('unzipRecords');
export const zipRecords = createAction<ZipRecordsPayload>('zipRecords');

// Ownership save actions (no payload)
export const enqueueCascadingUnstash = createAction<CascadingUnstashPayload>('cascadingUnstasher/enqueue');
export const updateOwnerships = createAction<OwnershipPayload>('updateOwnerships');
export const saveTutorialOwnership = createAction('saveTutorialOwnership');
export const saveCourseOwnership = createAction('saveCourseOwnership');
export const saveQuizOwnership = createAction('saveQuizOwnership');