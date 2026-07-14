import { signedOut } from './sessionSlice';
import { userApps, memberApps, adminsApps } from '../../constants';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { amendment, fetchData, fetchSkeletons, verification } from '../../library/Thunks';
import { getEntity, normalizeQueryLimit, orderedWebappRoutes, Tree as tree } from '../../utils';
import { WebApps } from '../../components/Core/types';
import { fileManager } from '../../library/FileManager';
import { CourseTrees, QuizTrees, TutorialTrees } from '../../library/controlPanelUtils';
import { setQuizzes } from './quizSlice';
import { setTutorials } from './tutorialSlice';
import { setCourses } from './courseSlice';

export interface SerializableFile {
  id: string;
  name: string;
  size: number;
  type: string;
  lastModified: number;
  webkitRelativePath: string;
}

export interface MappedTutorialTrees {
  [key: number]: TutorialTrees;
}

export interface MappedCourseTrees {
  [key: number]: CourseTrees;
}

export interface MappedQuizTrees {
  [key: number]: QuizTrees;
}

export interface unzippedTrees {
  tutorialTrees: MappedTutorialTrees;
  courseTrees: MappedCourseTrees;
  quizTrees: MappedQuizTrees;
}

export interface SettingsState {
  unzippedTrees: unzippedTrees[];
  TutorialTrees: MappedTutorialTrees;
  CourseTrees: MappedCourseTrees;
  QuizTrees: MappedQuizTrees;
  quota: number;
  email: string;
  userapp: number;
  adminapp: number;
  uploads: SerializableFile[];
  catalina: number;
  memberapp: number;
  username: string;
  dowTok: boolean;
  characters: number;
  txtimg: boolean;
  seltype: boolean;
  eXport: boolean;
  iMport: boolean;
  txtswap: boolean;
  isValid: boolean;
  cacher: string;
  isTabled: boolean;
  take: number | undefined;
  affix: string | undefined;
  amendAttempts: number;
  isDemoted: boolean;
  deletedOrphans: number;
  isPromoted: boolean;
  isEnabled: boolean;
  isDisabled: boolean;
  formatters: string;
  dismisstype: boolean;
  source: string | undefined;
  algorithm: string;
  delaccount: boolean;
  domain: boolean;
  role: string;
  verifyAttempts: number;
  seconds: number | undefined;
  voucher: string | undefined;
  exRoots: boolean | undefined;
  padding: number | undefined;
  creates: number | undefined;
  selectedRoutes: string[];
  registerAttempts: number;
  permittedRoutes: string[];
  action: string;
  approute: string | undefined;
  timestamp: string | undefined;
  skeletonsFrom: string | undefined;
  commentsFrom: string | undefined;
  isExtractKeys: boolean;
  isExtractAlgo: boolean;
  exHistory: boolean | undefined;
  selectedChild: string;
  availability: boolean;
  isParentSelection: boolean;
  selectedParent: string;
  prefix: string;
  connects: string;
  isAssembleBase64: boolean;
  isCoursesToQuizzes: boolean;
  isTutorialsToCourses: boolean;
  isDepthSelection: boolean;
  isBreathSelection: boolean;
  isRemoveTrees: boolean;
  isInsertTrees: boolean;
  isAssembleTexts: boolean;
  isUnzipCourses: boolean;
  isUnzipCourses_: boolean;
  isUnzipTutorials: boolean;
  isUnzipTutorials_: boolean;
  isUnzipQuizzes: boolean;
  isUnzipQuizzes_: boolean;
  unzipCoursesType: string;
  unzipTutorialsType: string;
  unzipQuizzesType: string;
  isNotUnzipping: boolean;
  isNotSkeletons: boolean;
  clearType: boolean;
  clearContentType: string;
  status: number | undefined;
  assertOwnership?: boolean;
  createTutorialPreset: string;
  createQuizPreset: string;
  createCoursePreset: string;
  currentToIncludeInTemplates: string;
  isIncludeCurrentIntemplates: boolean;
  showCopyIcons: boolean;
  aquiredClipboardConsent: boolean;
  editMode: boolean;
  shouldDelete: boolean;
  shiftKeyDown: boolean;
  ctrlKeyDown: boolean;
  altKeyDown: boolean;
  activeShortcuts: string;
  fetchTutorialPreset: string;
  fetchQuizPreset: string;
  fetchCoursePreset: string;
  currentToIncludeInSkeletons: string;
  isIncludeCurrentInSkeletons: boolean;
  fetchTutorialCommentsPreset: string;
  fetchQuizCommentsPreset: string;
  fetchCourseCommentsPreset: string;
  fetchCommentsType: string;
  currentToExportComments: string;
  isExportComments: boolean;
  shouldHydrate: boolean;
  queryLimit: number;
  fsq: number;
  includeBase64: boolean;
  /** Seconds between fMP4 snapshot captures in Settings → ColTen. */
  snapshotIntervalSec: number;
  randomizedType: 'Imageurls' | 'details' | 'both';
}

export interface AccountResult {
  attempts: number;
  success: boolean;
}

const getLocalDateTimeInputValue = (): string => {
  const d = new Date();
  const pad = (n: number): string => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  // datetime-local in the UI expects "YYYY-MM-DDTHH:mm", but the app stores "YYYY-MM-DD HH:mm".
};

const initialSettings: SettingsState = {
  unzippedTrees: [],
  TutorialTrees: {},
  CourseTrees: {},
  QuizTrees: {},
  quota: 0,
  take: 10,
  email: "",
  userapp: 0,
  adminapp: 0,
  uploads: [],
  catalina: 1,
  memberapp: 0,
  domain: true,
  username: "",
  dowTok: false,
  characters: 0,
  txtimg: false,
  seltype: true,
  eXport: false,
  iMport: false,
  txtswap: false,
  isValid: false,
  cacher: "rows",
  isTabled: true,
  affix: undefined,
  amendAttempts: 0,
  isDemoted: false,
  deletedOrphans: 0,
  isPromoted: false,
  isEnabled: false,
  isDisabled: false,
  dismisstype: true,
  source: undefined,
  algorithm: "none",
  delaccount: false,
  role: "ROLE_USER",
  verifyAttempts: 0,
  seconds: undefined,
  skeletonsFrom: getLocalDateTimeInputValue(),
  commentsFrom: getLocalDateTimeInputValue(),
  voucher: undefined,
  exRoots: undefined,
  padding: undefined,
  creates: undefined,
  selectedRoutes: [],
  registerAttempts: 0,
  permittedRoutes: [],
  action: "tabulator",
  availability: false,
  approute: undefined,
  timestamp: undefined,
  isExtractKeys: false,
  isExtractAlgo: false,
  exHistory: undefined,
  selectedChild: "[TO]",
  formatters: "cpanelapp",
  isParentSelection: true,
  selectedParent: "[FROM]",
  prefix: "/app/tabulator/",
  connects: "--CHOOSE_WHO_CAN_CONNECT_TO_SELECTED--",
  isAssembleBase64: false,
  isCoursesToQuizzes: false,
  isTutorialsToCourses: false,
  isBreathSelection: true,
  isDepthSelection: false,
  isRemoveTrees: false,
  isInsertTrees: false,
  isUnzipCourses: true,
  isUnzipQuizzes: true,
  isUnzipCourses_: true,
  isUnzipQuizzes_: true,
  isAssembleTexts: false,
  isUnzipTutorials: true,
  isUnzipTutorials_: true,
  status: undefined,
  unzipCoursesType: "incoming_and_outgoing",
  unzipQuizzesType: "incoming_and_outgoing",
  unzipTutorialsType: "incoming_and_outgoing",
  clearContentType: "tutorial",
  isNotUnzipping: true,
  isNotSkeletons: true,
  clearType: true,
  assertOwnership: undefined,
  createQuizPreset: "1_10_4_1",
  createCoursePreset: "1_10_4",
  createTutorialPreset: "1_10",
  currentToIncludeInTemplates: "tutorial",
  isIncludeCurrentIntemplates: false,
  showCopyIcons: false,
  aquiredClipboardConsent: false,
  editMode: false,
  shouldDelete: false,
  shiftKeyDown: false,
  ctrlKeyDown: false,
  altKeyDown: false,
  activeShortcuts: 'b',
  fetchTutorialPreset: "1_10",
  fetchQuizPreset: "1_10",
  fetchCoursePreset: "1_10",
  currentToIncludeInSkeletons: "tutorial",
  isIncludeCurrentInSkeletons: false,
  fetchTutorialCommentsPreset: "within_10_hours",
  fetchQuizCommentsPreset: "within_10_hours",
  fetchCourseCommentsPreset: "within_10_hours",
  fetchCommentsType: "tutorial",
  currentToExportComments: "tutorial",
  isExportComments: false,
  shouldHydrate: false,
  queryLimit: 50,
  fsq: 1,
  includeBase64: false,
  snapshotIntervalSec: 1,
  randomizedType: 'both',
};

const validatedCombination = (
  selection: { selectedChild: string; selectedParent: string },
  notReturnAliases?: boolean,
  webapp?: string,
  log?: boolean
) => {
  const entity: string = getEntity(selection.selectedChild);
  const parent: string = getEntity(selection.selectedParent);
  const unlocked: string[] = tree.getProperty(parent, "unlocked") || [];
  const webapps: WebApps = tree.getProperty(parent, "webapps") || {} as WebApps;
  const { [webapp || '']: permitted = unlocked } = webapps;
  const isValid: boolean =
    unlocked?.indexOf(entity) > -1 && permitted?.indexOf(entity) > -1;
  if (!isValid && log) console.log("valid_routes", parent, unlocked);
  if (notReturnAliases)
    return { selectedChild: entity, selectedParent: parent, isValid };
  else return { ...selection, isValid };
};

export const settingsSlice = createSlice({
  name: 'settings',
  initialState: initialSettings,
  reducers: {
    mutateSettings: (state, action: PayloadAction<Partial<SettingsState>>) => {
      const payload = action.payload;
      const next = { ...state, ...payload };
      if ('includeBase64' in payload && payload.includeBase64) {
        next.take = 1;
        next.includeBase64 = true;
      } else if ('take' in payload && payload.take !== 1)
        next.includeBase64 = false;
      return next;
    },
    quotaSelected: (state, action: PayloadAction<number>) => {
      state.quota = action.payload;
    },
    childSelected: (state, action: PayloadAction<string>) => {
      const { selectedParent } = state;
      const childParent = { selectedChild: action.payload, selectedParent };
      const validated = validatedCombination(childParent);
      state.action = "tabulator";
      state.selectedChild = validated.selectedChild;
      state.selectedParent = validated.selectedParent;
      state.isValid = validated.isValid;
    },
    parentSelected: (state, action: PayloadAction<string>) => {
      const { selectedChild } = state;
      const parentChild = { selectedParent: action.payload, selectedChild };
      const validated = validatedCombination(parentChild);
      state.action = "tabulator";
      state.selectedChild = validated.selectedChild;
      state.selectedParent = validated.selectedParent;
      state.isValid = validated.isValid;
    },
    accountCreated: (state, action: PayloadAction<AccountResult>) => {
      const { attempts, success } = action.payload;
      if (success) state.registerAttempts = -1;
      else state.registerAttempts = attempts;
    },
    escrowUploads: (state, action: PayloadAction<SerializableFile[] | null>) => {
      if (action.payload) state.uploads = [...state.uploads, ...action.payload];
      else {
        state.uploads = [];
        fileManager.clearFiles();
      }
    },
    roleSelected: (state, action: PayloadAction<string>) => {
      state.role = action.payload;
    },
    toggleTextToImg: (state) => {
      state.txtimg = !state.txtimg;
    },
    toggleTextSwap: (state) => {
      state.txtswap = !state.txtswap;
    },
    toggleAlgorithm: (state) => {
      state.exRoots = !state.exRoots;
    },
    toggleSelection: (state) => {
      state.seltype = !state.seltype;
    },
    toggleAquireVoucher: (state) => {
      state.dowTok = !state.dowTok;
    },
    toggleTraversals: (state) => {
      state.exHistory = !state.exHistory;
    },
    encodingSource: (state) => {
      state.dismisstype = !state.dismisstype;
    },
    toggleImport: (state) => {
      state.iMport = !state.iMport;
    },
    toggleExport: (state) => {
      state.eXport = !state.eXport;
    },
    algorithmSelected: (state, action: PayloadAction<string>) => {
      state.algorithm = action.payload;
    },
    secondsSelected: (state, action: PayloadAction<number>) => {
      state.seconds = action.payload;
    },
    takeSelected: (state, action: PayloadAction<number>) => {
      state.take = action.payload;
      if (action.payload !== 1) {
        state.includeBase64 = false;
      }
      else if (action.payload === 1) {
        state.includeBase64 = true;
      }
    },
    queryLimitSelected: (state, action: PayloadAction<number>) => {
      state.queryLimit = normalizeQueryLimit(action.payload);
    },
    fsqSelected: (state, action: PayloadAction<number>) => {
      state.fsq = action.payload;
    },
    connectSelecteds: (state, action: PayloadAction<string>) => {
      state.connects = action.payload;
    },
    actionSelected: (state, action: PayloadAction<string>) => {
      state.action = action.payload;
    },
    extractionSource: (state, action: PayloadAction<string>) => {
      state.source = action.payload;
    },
    skeletonsFromSelected: (state, action: PayloadAction<string>) => {
      state.skeletonsFrom = action.payload;
    },
    commentsFromSelected: (state, action: PayloadAction<string>) => {
      state.commentsFrom = action.payload;
    },
    timeSelected: (state, action: PayloadAction<string>) => {
      state.timestamp = action.payload;
    },
    toggleFormatter: (state, action: PayloadAction<string>) => {
      state.formatters = action.payload;
    },
    toggleCacher: (state, action: PayloadAction<string>) => {
      state.cacher = action.payload;
    },
    approuteSelected: (state, action: PayloadAction<string>) => {
      state.approute = action.payload;
    },
    toggleDomain: (state, action: PayloadAction<boolean | undefined>) => {
      state.domain = action.payload ?? !state.domain;
    },
    userappSelected: (state, action: PayloadAction<number>) => {
      if (action.payload === 0) {
        state.userapp = action.payload;
        state.permittedRoutes = [];
        return;
      }
      const app = userApps[action.payload].toLowerCase();
      const permittedRoutes = orderedWebappRoutes(tree.entities, app);
      state.userapp = action.payload;
      state.permittedRoutes = permittedRoutes;
      state.selectedRoutes = [...permittedRoutes];
    },
    memberappSelected: (state, action: PayloadAction<number>) => {
      if (action.payload === 0) {
        state.memberapp = action.payload;
        state.permittedRoutes = [];
        return;
      }
      const app = memberApps[action.payload].toLowerCase();
      const permittedRoutes = orderedWebappRoutes(tree.entities, app);
      state.memberapp = action.payload;
      state.permittedRoutes = permittedRoutes;
      state.selectedRoutes = [...permittedRoutes];
    },
    adminappSelected: (state, action: PayloadAction<number>) => {
      if (action.payload === 0) {
        state.adminapp = action.payload;
        state.permittedRoutes = [];
        return;
      }
      const app = adminsApps[action.payload].toLowerCase();
      const permittedRoutes = orderedWebappRoutes(tree.entities, app);
      state.adminapp = action.payload;
      state.permittedRoutes = permittedRoutes;
      state.selectedRoutes = [...permittedRoutes];
    },
    appendSelected: (state, action: PayloadAction<number>) => {
      state.creates = action.payload;
    },
    paddingSelected: (state, action: PayloadAction<number>) => {
      state.padding = action.payload;
    },
    toggleAvailability: (state, action: PayloadAction<boolean | undefined>) => {
      state.availability = action.payload ?? !state.availability;
    },
    toggleDeleteAccount: (state) => {
      state.delaccount = !state.delaccount;
    },
    toggleKeywordsExtraction: (state) => {
      state.isExtractKeys = !state.isExtractKeys;
    },
    toggleAlgorithmExtraction: (state) => {
      state.isExtractAlgo = !state.isExtractAlgo;
    },
    toggleFocus: (state, action: PayloadAction<boolean>) => {
      state.isParentSelection = action.payload;
    },
    formatSelected: (state, action: PayloadAction<boolean | undefined>) => {
      const cargo = action.payload ?? !state.isTabled;
      state.isTabled = cargo;
      state.prefix = cargo ? state.affix || "/app/tabulator/" : "/app/";
    },
    toggleRoutes: (state, action: PayloadAction<{ action: string; selecteds: string[] }>) => {
      const { action: actionType, selecteds } = action.payload;
      const { selectedRoutes: routes } = state;
      if (actionType === 'row/clearData') {
        const pred = (s: string) => selecteds.indexOf(s) === -1;
        state.selectedRoutes = routes.filter(pred);
      } else if (actionType === 'row/selectAll') {
        const selectedRoutes = new Set([...routes, ...selecteds]);
        state.selectedRoutes = [...selectedRoutes];
      }
    },
    catalinaSelected: (state, action: PayloadAction<number>) => {
      state.catalina = action.payload;
    },
    orphansSizeSelected: (state, action: PayloadAction<number>) => {
      state.deletedOrphans = action.payload;
    },
    toggleMotion: (state, action: PayloadAction<boolean>) => {
      const { isPromoted, isDemoted } = state;
      if (action.payload === true && isDemoted === false) {
        state.isPromoted = true;
      } else if (action.payload === true && isDemoted === true) {
        state.isDemoted = false;
      } else if (action.payload === false && isPromoted === false) {
        state.isDemoted = true;
      } else if (action.payload === false && isPromoted === true) {
        state.isPromoted = false;
      }
    },
    toggleAbility: (state, action: PayloadAction<boolean>) => {
      const { isEnabled, isDisabled } = state;
      if (action.payload === true && isDisabled === false) {
        state.isEnabled = true;
      } else if (action.payload === true && isDisabled === true) {
        state.isDisabled = false;
      } else if (action.payload === false && isEnabled === false) {
        state.isDisabled = true;
      } else if (action.payload === false && isEnabled === true) {
        state.isEnabled = false;
      }
    },
    toggleAssembleBase64: (state) => {
      state.isAssembleBase64 = !state.isAssembleBase64;
    },
    toggleAssembleTexts: (state) => {
      state.isAssembleTexts = !state.isAssembleTexts;
    },
    toggleCoursesToQuizzes: (state) => {
      state.isCoursesToQuizzes = !state.isCoursesToQuizzes;
    },
    toggleTutorialsToCourses: (state) => {
      state.isTutorialsToCourses = !state.isTutorialsToCourses;
    },
    toggleDepthSelection: (state) => {
      state.isDepthSelection = true;
      state.isBreathSelection = false;
    },
    toggleBreathSelection: (state) => {
      state.isBreathSelection = true;
      state.isDepthSelection = false;
    },
    toggleRemoveTrees: (state) => {
      state.isRemoveTrees = !state.isRemoveTrees;
    },
    toggleInsertTrees: (state) => {
      state.isInsertTrees = !state.isInsertTrees;
    },
    setStatus: (state, action: PayloadAction<number | undefined>) => {
      state.status = action.payload;
    },
    clearTutorialTrees: (state) => {
      state.TutorialTrees = {};
    },
    clearCourseTrees: (state) => {
      state.CourseTrees = {};
    },
    clearQuizTrees: (state) => {
      state.QuizTrees = {};
    },
    toggleUnzipCourses: (state, action: PayloadAction<boolean | undefined>) => {
      if (action.payload !== undefined) state.isUnzipCourses = action.payload;
      else state.isUnzipCourses = !state.isUnzipCourses;
    },
    toggleUnzipCourses_: (state) => {
      state.isUnzipCourses_ = !state.isUnzipCourses_;
    },
    toggleUnzipTutorials: (state, action: PayloadAction<boolean | undefined>) => {
      if (action.payload !== undefined) state.isUnzipTutorials = action.payload;
      else state.isUnzipTutorials = !state.isUnzipTutorials;
    },
    toggleUnzipTutorials_: (state) => {
      state.isUnzipTutorials_ = !state.isUnzipTutorials_;
    },
    toggleUnzipQuizzes: (state, action: PayloadAction<boolean | undefined>) => {
      if (action.payload !== undefined) state.isUnzipQuizzes = action.payload;
      else state.isUnzipQuizzes = !state.isUnzipQuizzes;
    },
    toggleUnzipQuizzes_: (state) => {
      state.isUnzipQuizzes_ = !state.isUnzipQuizzes_;
    },
    unzipCoursesTypeSelected: (state, action: PayloadAction<string>) => {
      state.unzipCoursesType = action.payload;
    },
    unzipTutorialsTypeSelected: (state, action: PayloadAction<string>) => {
      state.unzipTutorialsType = action.payload;
    },
    unzipQuizzesTypeSelected: (state, action: PayloadAction<string>) => {
      state.unzipQuizzesType = action.payload;
    },
    clearContentTypeSelected: (state, action: PayloadAction<string>) => {
      state.clearContentType = action.payload;
    },
    completedUnzipping: (state, action: PayloadAction<boolean>) => {
      state.isNotUnzipping = action.payload;
    },
    completedSkeletons: (state, action: PayloadAction<boolean>) => {
      state.isNotSkeletons = action.payload;
    },
    addUnzippedTrees: (state, action: PayloadAction<unzippedTrees>) => {
      state.unzippedTrees.push(action.payload);
    },
    clearTypeSelected: (state) => {
      state.clearType = !state.clearType;
    },
    setAssertOwnership: (state, action: PayloadAction<boolean | undefined>) => {
      state.assertOwnership = action.payload;
    },
    switchToMinimunFeature: (state) => {
      state.isUnzipTutorials = state.isUnzipTutorials_;
      state.isUnzipCourses = state.isUnzipCourses_;
      state.isUnzipQuizzes = state.isUnzipQuizzes_;
      state.editMode = false;
    },
    switchToMaximunFeature: (state) => {
      state.isUnzipTutorials_ = state.isUnzipTutorials;
      state.isUnzipCourses_ = state.isUnzipCourses;
      state.isUnzipQuizzes_ = state.isUnzipQuizzes;
      state.isUnzipTutorials = false;
      state.isUnzipCourses = false;
      state.isUnzipQuizzes = false;
      state.editMode = false;
    },
    createTutorialPresetSelected: (state, action: PayloadAction<string>) => {
      state.createTutorialPreset = action.payload;
    },
    createQuizPresetSelected: (state, action: PayloadAction<string>) => {
      state.createQuizPreset = action.payload;
    },
    createCoursePresetSelected: (state, action: PayloadAction<string>) => {
      state.createCoursePreset = action.payload;
    },
    snapshotIntervalSelected: (state, action: PayloadAction<number>) => {
      state.snapshotIntervalSec = action.payload;
    },
    randomizedTypeSelected: (state, action: PayloadAction<SettingsState['randomizedType']>) => {
      state.randomizedType = action.payload;
    },
    includeCurrentInTemplatesSelected: (state, action: PayloadAction<string>) => {
      state.currentToIncludeInTemplates = action.payload;
    },
    toggleIncludeCurrentInTemplates: (state) => {
      state.isIncludeCurrentIntemplates = !state.isIncludeCurrentIntemplates;
    },
    toggleShowCopyIcons: (state) => {
      state.showCopyIcons = !state.showCopyIcons;
    },
    toggleAquiredClipboardConsent: (state) => {
      state.aquiredClipboardConsent = !state.aquiredClipboardConsent;
    },
    toggleEditMode: (state) => {
      state.editMode = !state.editMode;
    },
    toggleShouldDelete: (state) => {
      state.shouldDelete = !state.shouldDelete;
    },
    setShiftKeyDown: (state, action: PayloadAction<boolean>) => {
      state.shiftKeyDown = action.payload;
    },
    setCtrlKeyDown: (state, action: PayloadAction<boolean>) => {
      state.ctrlKeyDown = action.payload;
    },
    setAltKeyDown: (state, action: PayloadAction<boolean>) => {
      state.altKeyDown = action.payload;
    },
    fetchTutorialPresetSelected: (state, action: PayloadAction<string>) => {
      state.fetchTutorialPreset = action.payload;
    },
    fetchQuizPresetSelected: (state, action: PayloadAction<string>) => {
      state.fetchQuizPreset = action.payload;
    },
    fetchCoursePresetSelected: (state, action: PayloadAction<string>) => {
      state.fetchCoursePreset = action.payload;
    },
    includeCurrentInSkeletonsSelected: (state, action: PayloadAction<string>) => {
      state.currentToIncludeInSkeletons = action.payload;
    },
    toggleIncludeCurrentInSkeletons: (state) => {
      state.isIncludeCurrentInSkeletons = !state.isIncludeCurrentInSkeletons;
    },
    fetchTutorialCommentsPresetSelected: (state, action: PayloadAction<string>) => {
      state.fetchTutorialCommentsPreset = action.payload;
    },
    fetchQuizCommentsPresetSelected: (state, action: PayloadAction<string>) => {
      state.fetchQuizCommentsPreset = action.payload;
    },
    fetchCourseCommentsPresetSelected: (state, action: PayloadAction<string>) => {
      state.fetchCourseCommentsPreset = action.payload;
    },
    fetchCommentsTypeSelected: (state, action: PayloadAction<string>) => {
      state.fetchCommentsType = action.payload;
    },
    currentToExportCommentsSelected: (state, action: PayloadAction<string>) => {
      state.currentToExportComments = action.payload;
    },
    toggleExportComments: (state) => {
      state.isExportComments = !state.isExportComments;
    },
    toggleShouldHydrate: (state) => {
      state.shouldHydrate = !state.shouldHydrate;
    },
    toggleIncludeBase64: (state) => {
      state.includeBase64 = !state.includeBase64;
      if (state.includeBase64) state.take = 1;
      else state.take = 10;

    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(signedOut, (state) => {
        console.log("cleared_settings");
        const isUnzipTutorials_ = state.isUnzipTutorials_;
        const isUnzipCourses_ = state.isUnzipCourses_;
        const isUnzipQuizzes_ = state.isUnzipQuizzes_;
        const isUnzipTutorials = state.isUnzipTutorials;
        const isUnzipCourses = state.isUnzipCourses;
        const isUnzipQuizzes = state.isUnzipQuizzes;
        const voucher = state.voucher;
        Object.assign(state, initialSettings);
        state.isUnzipTutorials_ = isUnzipTutorials_;
        state.isUnzipCourses_ = isUnzipCourses_;
        state.isUnzipQuizzes_ = isUnzipQuizzes_;
        state.isUnzipTutorials = isUnzipTutorials;
        state.isUnzipCourses = isUnzipCourses;
        state.isUnzipQuizzes = isUnzipQuizzes;
        state.voucher = voucher;
        fileManager.clearFiles();
      })
      .addCase(setTutorials, (state, action) => {
        if (action.payload.Trees && action.payload.TreesId)
          state.TutorialTrees[action.payload.TreesId] = action.payload.Trees;
      })
      .addCase(setCourses, (state, action) => {
        if (action.payload.Trees && action.payload.TreesId)
          state.CourseTrees[action.payload.TreesId] = action.payload.Trees;
      })
      .addCase(setQuizzes, (state, action) => {
        if (action.payload.Trees && action.payload.TreesId)
          state.QuizTrees[action.payload.TreesId] = action.payload.Trees;
      })
      .addCase(amendment.fulfilled, (state, action) => {
        const { attempts, success } = action.payload as AccountResult;
        if (success) state.amendAttempts = -1;
        else state.amendAttempts = attempts;
      })
      .addCase(amendment.rejected, (state, _) => {
        state.amendAttempts = state.amendAttempts + 1;
      })
      .addCase(verification.fulfilled, (state, action) => {
        const { attempts, success } = action.payload as AccountResult;
        if (success) state.verifyAttempts = -1;
        else state.verifyAttempts = attempts;
      })
      .addCase(verification.rejected, (state, _) => {
        state.verifyAttempts = state.verifyAttempts + 1;
      })
      .addCase(fetchData.fulfilled, (state, _) => {
        if (state.isUnzipCourses || state.isUnzipTutorials || state.isUnzipQuizzes)
          state.isNotUnzipping = false;
      })
      .addCase(fetchSkeletons.fulfilled, (state, _) => {
        if (state.isUnzipCourses || state.isUnzipTutorials || state.isUnzipQuizzes)
          state.isNotSkeletons = false;
      })
  }
});

export const {
  mutateSettings,
  quotaSelected,
  childSelected,
  parentSelected,
  accountCreated,
  escrowUploads: _escrowUploads,
  roleSelected,
  toggleTextToImg,
  toggleTextSwap,
  toggleAlgorithm,
  toggleSelection,
  toggleAquireVoucher,
  toggleTraversals,
  algorithmSelected,
  secondsSelected,
  takeSelected,
  queryLimitSelected,
  fsqSelected,
  connectSelecteds,
  actionSelected,
  extractionSource,
  skeletonsFromSelected,
  commentsFromSelected,
  timeSelected,
  toggleFormatter,
  toggleCacher,
  approuteSelected,
  encodingSource,
  toggleDomain,
  toggleImport,
  toggleExport,
  userappSelected,
  memberappSelected,
  adminappSelected,
  appendSelected,
  paddingSelected,
  toggleAvailability,
  toggleDeleteAccount,
  toggleKeywordsExtraction,
  toggleAlgorithmExtraction,
  toggleFocus,
  formatSelected,
  toggleRoutes,
  catalinaSelected,
  orphansSizeSelected,
  toggleMotion,
  toggleAbility,
  toggleAssembleTexts,
  toggleAssembleBase64,
  toggleCoursesToQuizzes,
  toggleTutorialsToCourses,
  toggleDepthSelection,
  toggleBreathSelection,
  toggleRemoveTrees,
  toggleInsertTrees,
  clearTutorialTrees,
  clearCourseTrees,
  clearQuizTrees,
  toggleUnzipCourses,
  toggleUnzipTutorials,
  toggleUnzipQuizzes,
  unzipCoursesTypeSelected,
  unzipTutorialsTypeSelected,
  unzipQuizzesTypeSelected,
  clearTypeSelected,
  completedUnzipping,
  completedSkeletons,
  clearContentTypeSelected,
  addUnzippedTrees,
  switchToMinimunFeature,
  switchToMaximunFeature,
  toggleUnzipCourses_,
  toggleUnzipTutorials_,
  toggleUnzipQuizzes_,
  setStatus,
  setAssertOwnership,
  createTutorialPresetSelected,
  createQuizPresetSelected,
  createCoursePresetSelected,
  snapshotIntervalSelected,
  randomizedTypeSelected,
  includeCurrentInTemplatesSelected,
  toggleIncludeCurrentInTemplates,
  toggleShowCopyIcons,
  toggleAquiredClipboardConsent,
  toggleEditMode,
  toggleShouldDelete,
  setShiftKeyDown,
  setCtrlKeyDown,
  setAltKeyDown,
  fetchTutorialPresetSelected,
  fetchQuizPresetSelected,
  fetchCoursePresetSelected,
  includeCurrentInSkeletonsSelected,
  toggleIncludeCurrentInSkeletons,
  fetchTutorialCommentsPresetSelected,
  fetchQuizCommentsPresetSelected,
  fetchCourseCommentsPresetSelected,
  fetchCommentsTypeSelected,
  currentToExportCommentsSelected,
  toggleExportComments,
  toggleShouldHydrate,
  toggleIncludeBase64,
} = settingsSlice.actions;

// Helper action creator that accepts File objects and converts them to SerializableFile objects
export const escrowUploads = (files: File[] | null) => {
  if (files) {
    const serializableFiles = fileManager.storeFiles(files);
    return _escrowUploads(serializableFiles);
  } else {
    return _escrowUploads(null);
  }
};

export default settingsSlice.reducer; 