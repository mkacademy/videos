import { AppDispatch } from '../../store/types';
import {
  approveTutorialTrees,
  approveCourseTrees,
  approveQuizTrees,
} from '../../library/actions';

interface UseModeratorSettingsBtnsProps {
  baseOnEnter: (value: boolean) => void;
  dispatch: AppDispatch;
}

interface UseModeratorSettingsApplyProps {
  baseApply: (e: React.MouseEvent | boolean) => void;
  dispatch: AppDispatch;
}

const dispatchModeratorActions = (dispatch: AppDispatch) => {
  setTimeout(() => dispatch(approveTutorialTrees()), 1000);
  setTimeout(() => dispatch(approveCourseTrees()), 1100);
  setTimeout(() => dispatch(approveQuizTrees()), 1200);
};

export const useModeratorSettingsBtns = ({
  baseOnEnter,
  dispatch,
}: UseModeratorSettingsBtnsProps) => {
  const onEnter = () => {
    dispatchModeratorActions(dispatch);
    baseOnEnter(true);
  };
  return onEnter;
};

export const useModeratorSettingsApply = ({
  baseApply,
  dispatch,
}: UseModeratorSettingsApplyProps) => {
  const apply = (e: React.MouseEvent | boolean) => {
    dispatchModeratorActions(dispatch);
    baseApply(e);
  };
  return apply;
};
