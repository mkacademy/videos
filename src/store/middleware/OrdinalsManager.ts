import { Middleware } from '@reduxjs/toolkit';
import { RootState } from '../index';
import {
  saveCourseEdits,
  saveOutgoingEdits,
  saveQuizEdits,
  saveTutorialEdits,
  saveTutorsEdits,
} from '../../library/actions';
import {
  collectCourseOrdinals,
  collectOutgoingOrdinals,
  collectQuizOrdinals,
  collectTutorOrdinals,
  collectTutorialOrdinals,
  hasSaveOrdinals,
} from '../../library/OrdinalsManagerUtils';

const OrdinalsManager: Middleware<{}, RootState> = ({ getState }) => (next) => (action) => {
  if (saveTutorialEdits.match(action)) {
    const ordinals = collectTutorialOrdinals(getState().tutorial.modifiedOrdinals);
    if (!hasSaveOrdinals(ordinals)) return next(action);
    return next(saveTutorialEdits({ ...action.payload, ordinals }));
  }

  if (saveCourseEdits.match(action)) {
    const ordinals = collectCourseOrdinals(getState().course.modifiedOrdinals);
    if (!hasSaveOrdinals(ordinals)) return next(action);
    return next(saveCourseEdits({ ...action.payload, ordinals }));
  }

  if (saveQuizEdits.match(action)) {
    const ordinals = collectQuizOrdinals(getState().quiz.modifiedOrdinals);
    if (!hasSaveOrdinals(ordinals)) return next(action);
    return next(saveQuizEdits({ ...action.payload, ordinals }));
  }

  if (saveOutgoingEdits.match(action)) {
    const { comms } = getState();
    const ordinals = collectOutgoingOrdinals(comms.modifiedOrdinals, comms.outgoing);
    if (!hasSaveOrdinals(ordinals)) return next(action);
    return next(saveOutgoingEdits({ ...action.payload, ordinals }));
  }

  if (saveTutorsEdits.match(action)) {
    const { comms } = getState();
    const ordinals = collectTutorOrdinals(comms.modifiedOrdinals, comms.tutors);
    if (!hasSaveOrdinals(ordinals)) return next(action);
    return next(saveTutorsEdits({ ...action.payload, ordinals }));
  }

  return next(action);
};

export default OrdinalsManager;
