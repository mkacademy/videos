import { signedOut } from './sessionSlice';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { fetchData } from '../../library/Thunks';
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
  take: number | undefined;
  voucher: string | undefined;
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
  clearContentType: string;
  includeBase64: boolean;
  shouldHydrate: boolean;
}

export interface AccountResult {
  attempts: number;
  success: boolean;
}

const initialSettings: SettingsState = {
  unzippedTrees: [],
  TutorialTrees: {},
  CourseTrees: {},
  QuizTrees: {},
  take: 10,
  voucher: undefined,
  isUnzipCourses: true,
  isUnzipQuizzes: true,
  isUnzipCourses_: true,
  isUnzipQuizzes_: true,
  isUnzipTutorials: true,
  isUnzipTutorials_: true,
  unzipCoursesType: "incoming_and_outgoing",
  unzipQuizzesType: "incoming_and_outgoing",
  unzipTutorialsType: "incoming_and_outgoing",
  clearContentType: "tutorial",
  isNotUnzipping: true,
  includeBase64: false,
  shouldHydrate: true,
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
    addUnzippedTrees: (state, action: PayloadAction<unzippedTrees>) => {
      state.unzippedTrees.push(action.payload);
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
        return {
          ...initialSettings,
          isUnzipTutorials_,
          isUnzipCourses_,
          isUnzipQuizzes_,
          isUnzipTutorials,
          isUnzipCourses,
          isUnzipQuizzes,
          voucher,
        };
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
  completedUnzipping,
  clearContentTypeSelected,
  addUnzippedTrees,
  toggleUnzipCourses_,
  toggleUnzipTutorials_,
  toggleUnzipQuizzes_,
  toggleShouldHydrate,
} = settingsSlice.actions;

export default settingsSlice.reducer; 