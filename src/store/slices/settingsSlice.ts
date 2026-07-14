import { signedOut } from './sessionSlice';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { fetchData } from '../../library/Thunks';
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
    toggleShouldHydrate: (state, action: PayloadAction<boolean | undefined>) => {
      if (action.payload !== undefined) state.shouldHydrate = action.payload;
      else state.shouldHydrate = !state.shouldHydrate;
    },
    randomizedTypeSelected: (state, action: PayloadAction<'both' | 'Imageurls' | 'details'>) => {
      state.randomizedType = action.payload;
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
      .addCase(fetchData.fulfilled, (state, _) => {
        if (state.isUnzipCourses || state.isUnzipTutorials || state.isUnzipQuizzes)
          state.isNotUnzipping = false;
      })
  }
});

export const {
  mutateSettings, 
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
  setAssertOwnership,
  toggleShouldHydrate,
  randomizedTypeSelected,
} = settingsSlice.actions;

export default settingsSlice.reducer; 