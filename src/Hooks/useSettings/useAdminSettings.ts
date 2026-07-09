import { AppDispatch } from '../../store/types';
import {
  deleteOrphans,
  aquireVoucher,
  mutateQuotas,
  mutateHierachies,
  mutateAbilities,
} from '../../library/actions';

interface UseAdminSettingsBtnsProps {
  baseOnEnter: (value: boolean) => void;
  dispatch: AppDispatch;
}

interface UseAdminSettingsApplyProps {
  baseApply: (e: React.MouseEvent | boolean) => void;
  dispatch: AppDispatch;
}

const dispatchAdminActions = (dispatch: AppDispatch) => {
  setTimeout(() => dispatch(mutateQuotas()), 1300);
  setTimeout(() => dispatch(deleteOrphans()), 1400);
  setTimeout(() => dispatch(aquireVoucher()), 1500);
  setTimeout(() => dispatch(mutateAbilities()), 1600);
  setTimeout(() => dispatch(mutateHierachies()), 1700);
};

export const useAdminSettingsBtns = ({
  baseOnEnter,
  dispatch,
}: UseAdminSettingsBtnsProps) => {
  const onEnter = () => {
    dispatchAdminActions(dispatch);
    baseOnEnter(true);
  };
  return onEnter;
};

export const useAdminSettingsApply = ({
  baseApply,
  dispatch,
}: UseAdminSettingsApplyProps) => {
  const apply = (e: React.MouseEvent | boolean) => {
    dispatchAdminActions(dispatch);
    baseApply(e);
  };
  return apply;
};
