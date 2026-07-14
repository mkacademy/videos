import { Middleware } from '@reduxjs/toolkit';
import { RootState } from '../types';
import { CourseTrees, QuizTrees, TutorialTrees } from '../../library/controlPanelUtils';


export interface ItemWithTutorialTrees {
  Trees: TutorialTrees;
  TreesId: number;
}
export interface ItemWithCourseTrees {
  Trees: CourseTrees;
  TreesId: number;
}
export interface ItemWithQuizTrees {
  Trees: QuizTrees;
  TreesId: number;
}

const EncodingManager: Middleware<{}, RootState> = () => (next) => (action) => {


  return next(action);
};

export default EncodingManager; 