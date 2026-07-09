import { Middleware, PayloadActionCreator } from '@reduxjs/toolkit';
import { RootState } from '../index';
import {
  saveCourseEdits,
  saveOutgoingEdits,
  saveTutorialEdits,
  coursesCompleted,
  tutorialsCompleted,
  stepsCompleted,
  createCourses,
  createTutorials,
  createSteps,
  saveQuizEdits,
  quizzesCompleted,
  createQuizzes,
  containerCompleted,
  createContainer,
  saveCourseEditsPayload,
  saveQuizEditsPayload,
  saveTutorialEditsPayload,
} from "../../library/actions";
import { INSERT_ROWS } from "../../utils";
import { insertSubmitted } from "../../library/quizAttemptManager";
import responseHandler, { getEditedType } from "../../library/responseHandler";
import { Content } from '../slices/tutorialSlice';
import {
  Banner as CourseBanner,
  Pennant,
  SlideGroup,
  SlideGroupItem,
  SlideItem,
} from '../slices/courseSlice';
import { mutateRows as mutateRowz } from '../../library/actions';
import { isEditSaveChunkedSession, recordEditSaveIdMappings } from './editSaveQueue';
import { shouldSkipSaveEditsEnrichment } from './saveEditsQueue';
import { withTruncatedSaveTitles } from '../../library/DeletionManagerUtils';

const isNewRow = ({ id }: { id: number }): boolean => id < 0;

const newTutorialContentRows = (rows: Content[]): Content[] => rows.filter(isNewRow);

const newPennantsFromBanner = ({ pennants }: CourseBanner): Pennant[] => pennants.filter(isNewRow);

const newSlideItemsFromGroup = ({ slides }: SlideGroup): SlideItem[] => slides.flat().filter(isNewRow);

const newSlideGroupItemsFromGroup = ({ slides, ...group }: SlideGroup): SlideGroupItem[] =>
  Object.values(group).filter(
    (item): item is SlideGroupItem =>
      typeof item === 'object' && item !== null && 'id' in item && typeof item.id === 'number' && isNewRow(item),
  );

const InsertionManager: Middleware<{}, RootState> = ({ dispatch, getState }) => {
  return (next) => (action) => {
    if (saveOutgoingEdits.match(action)) {
      const state = getState();
      const { payload } = action;
      const { outgoing } = state.comms;
      const modified = withTruncatedSaveTitles(outgoing.filter(isNewRow));

      if (payload === undefined && modified.length === 0)
        return next(action);

      return next(saveOutgoingEdits({ ...payload, inserted: modified }));
    }

    if (saveTutorialEdits.match(action)) {
      const routes: NonNullable<saveTutorialEditsPayload['inserted']> = {};
      const state = getState();
      const { payload } = action;
      const { requestIsProcessing } = state.view;
      const { banners, content } = state.tutorial;

      if (shouldSkipSaveEditsEnrichment(requestIsProcessing)) return next(action);

      const foundationfilters = withTruncatedSaveTitles(banners.filter(isNewRow));
      const filtersinstructions = withTruncatedSaveTitles(content.map(newTutorialContentRows).flat());

      if (
        payload === undefined &&
        foundationfilters.length === 0 &&
        filtersinstructions.length === 0
      )
        return next(action);

      if (foundationfilters.length > 0)
        routes.foundationfilters = foundationfilters;
      if (filtersinstructions.length > 0)
        routes.filtersinstructions = filtersinstructions;

      return next(saveTutorialEdits({ ...payload, inserted: routes }));
    }

    if (saveQuizEdits.match(action)) {
      const routes: NonNullable<saveQuizEditsPayload['inserted']> = {};
      const state = getState();
      const { payload } = action;
      const { quizzes, banners, content } = state.quiz;
      const { requestIsProcessing } = state.view;

      if (shouldSkipSaveEditsEnrichment(requestIsProcessing)) return next(action);

      const dashboardsfilters = insertSubmitted({ state, dispatch });
      const foundationdashboards = withTruncatedSaveTitles(quizzes.filter(isNewRow));
      const dashboardssifters = withTruncatedSaveTitles(banners.filter(isNewRow));
      const siftersfilters = withTruncatedSaveTitles(banners.map(newPennantsFromBanner).flat());
      const siftersinstructions = withTruncatedSaveTitles(content.map(newSlideGroupItemsFromGroup).flat());
      const filtersinstructions = withTruncatedSaveTitles(content.map(newSlideItemsFromGroup).flat());

      if (
        payload === undefined &&
        foundationdashboards.length === 0 &&
        dashboardsfilters.length === 0 &&
        dashboardssifters.length === 0 &&
        siftersfilters.length === 0 &&
        siftersinstructions.length === 0 &&
        filtersinstructions.length === 0
      )
        return next(action);

      if (foundationdashboards.length > 0)
        routes.foundationdashboards = foundationdashboards;
      if (dashboardsfilters.length > 0)
        routes.dashboardsfilters = dashboardsfilters;
      if (siftersfilters.length > 0)
        routes.siftersfilters = siftersfilters;
      if (dashboardssifters.length > 0)
        routes.dashboardssifters = dashboardssifters;
      if (filtersinstructions.length > 0)
        routes.filtersinstructions = filtersinstructions;
      if (siftersinstructions.length > 0)
        routes.siftersinstructions = siftersinstructions;

      return next(saveQuizEdits({ ...payload, inserted: routes }));
    }

    if (saveCourseEdits.match(action)) {
      const routes: NonNullable<saveCourseEditsPayload['inserted']> = {};
      const state = getState();
      const { payload } = action;
      const { banners, content } = state.course;
      const { requestIsProcessing } = state.view;

      if (shouldSkipSaveEditsEnrichment(requestIsProcessing)) return next(action);

      const foundationsifters = withTruncatedSaveTitles(banners.filter(isNewRow));
      const siftersfilters = withTruncatedSaveTitles(banners.map(newPennantsFromBanner).flat());
      const siftersinstructions = withTruncatedSaveTitles(content.map(newSlideGroupItemsFromGroup).flat());
      const filtersinstructions = withTruncatedSaveTitles(content.map(newSlideItemsFromGroup).flat());

      if (
        payload === undefined &&
        siftersinstructions.length === 0 &&
        filtersinstructions.length === 0 &&
        foundationsifters.length === 0 &&
        siftersfilters.length === 0
      )
        return next(action);

      if (siftersfilters.length > 0)
        routes.siftersfilters = siftersfilters;
      if (foundationsifters.length > 0)
        routes.foundationsifters = foundationsifters;
      if (filtersinstructions.length > 0)
        routes.filtersinstructions = filtersinstructions;
      if (siftersinstructions.length > 0)
        routes.siftersinstructions = siftersinstructions;

      return next(saveCourseEdits({ ...payload, inserted: routes }));
    }

    if (mutateRowz.match(action)) {
      const { payload } = action;
      const { route, ...response } = payload;
      if (response.task === INSERT_ROWS) {
        // Helper function to handle insertion with consistent pattern
        const handleInsertAction = (createActionCreator: PayloadActionCreator<string[]>) => {
          const syncIDs = (syncPayload: string[]) => {
            if (isEditSaveChunkedSession()) 
              recordEditSaveIdMappings(syncPayload);
            dispatch(createActionCreator(syncPayload));
          };
          setTimeout(() => responseHandler({ syncIDs, response }));
        };

        // Map completed action types to their corresponding create action creators
        const completedToCreateMap: { [key: string]: PayloadActionCreator<string[]> } = {
          [quizzesCompleted.type]: createQuizzes,
          [coursesCompleted.type]: createCourses,
          [tutorialsCompleted.type]: createTutorials,
          [containerCompleted.type]: createContainer,
          [stepsCompleted.type]: createSteps,
        };

        const editedType = getEditedType(route);

        if (editedType && completedToCreateMap[editedType]) {
          handleInsertAction(completedToCreateMap[editedType]);
        }
      } else return next(action);

      return next(action);
    }

    return next(action);
  };
};

export default InsertionManager;
