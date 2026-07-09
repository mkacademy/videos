import { useNavigate } from "react-router-dom";
import { commonAccountSetings } from "./useCommonSettings";
import { SettingsState } from "../../store/slices/settingsSlice";
import { SessionState } from "../../store/slices/sessionSlice";
import { ParentData, ViewPayload } from "../../store/slices/viewSlice";
import { AppDispatch } from "../../store/types";
import {
  mutateImageUrl,
  contentVisibility,
  mutateMyAbility,
  saveTutorialTrees,
  saveCourseTrees,
  saveQuizTrees,
  saveTutorialOwnership,
  saveCourseOwnership,
  saveQuizOwnership,
} from "../../library/actions";

interface MemberSettingsBtnsParams {
  updateMenuItem: (changes: Partial<SessionState> & { parentData: undefined }) => void;
  dispatch: AppDispatch;
  defaultTake: number;
  tableAction: string;
  isIncognito: boolean;
  baseOnEnter: (proceed: React.MouseEvent | boolean) => void;
  parentData: ParentData | undefined;
  isPrivate: boolean;
  clearView: (params: ViewPayload) => void;
  settings: SettingsState;
  parent: string | undefined;
  affix: string;
  child: string | undefined;
}

interface MemberSettingsApplyParams {
  updateMenuItem: (changes: Partial<SessionState> & { parentData: undefined }) => void;
  dispatch: AppDispatch;
  defaultTake: number;
  tableAction: string;
  isIncognito: boolean;
  parentData: ParentData | undefined;
  baseApply: (e?: React.MouseEvent | undefined, mode?: string) => void;
  isPrivate: boolean;
  clearView: (params: ViewPayload) => void;
  settings: SettingsState;
  affix: string;
  child: string | undefined;
}

const dispatchMemberActions = (dispatch: AppDispatch) => {
  setTimeout(() => dispatch(mutateImageUrl()), 100);
  setTimeout(() => dispatch(contentVisibility()), 200);
  setTimeout(() => dispatch(mutateMyAbility()), 300);
  setTimeout(() => dispatch(saveTutorialTrees()), 400);
  setTimeout(() => dispatch(saveCourseTrees()), 500);
  setTimeout(() => dispatch(saveQuizTrees()), 600);
  setTimeout(() => dispatch(saveTutorialOwnership()), 700);
  setTimeout(() => dispatch(saveCourseOwnership()), 800);
  setTimeout(() => dispatch(saveQuizOwnership()), 900);
};

export const useMemberSettingsBtns = ({
  updateMenuItem,
  dispatch,
  defaultTake,
  tableAction,
  isIncognito,
  baseOnEnter,
  parentData,
  isPrivate,
  clearView,
  settings,
  parent,
  affix,
  child,
}: MemberSettingsBtnsParams) => {
  const navigate = useNavigate();
  const { isTranversing, isClearView, changes, getUpdateUrl } =
    commonAccountSetings({
      tableAction,
      isIncognito,
      isPrivate,
      settings,
      affix,
    });
  const onEnter = (proceed: React.MouseEvent | boolean) => {
    dispatchMemberActions(dispatch);
    if (isClearView)
      clearView({
        yoinks: [],
        keyids: [],
        pages: [`${0}-${settings.take}`],
      });
    if (proceed) {
      const { curParent, curChild } = getUpdateUrl({
        prefix: settings.prefix,
        isEnter: true,
        defaultTake,
        parentData,
        settings,
        child,
      });
      if (
        curParent === parent &&
        curChild === child &&
        settings.isTabled &&
        isTranversing
      ) {
        setTimeout(() =>
          navigate(
            getUpdateUrl({
              prefix: changes.affix,
              isEnter: true,
              defaultTake,
              parentData,
              settings,
              child,
            }).url || ''
          )
        );
        updateMenuItem({ ...changes, parentData: undefined });
        return baseOnEnter(proceed);
      }
    }
    updateMenuItem({ ...changes, parentData: undefined });
    return baseOnEnter(proceed);
  };
  return onEnter;
};

export const useMemberSettingsApply = ({
  updateMenuItem,
  dispatch,
  defaultTake,
  tableAction,
  isIncognito,
  parentData,
  baseApply,
  isPrivate,
  clearView,
  settings,
  affix,
  child,
}: MemberSettingsApplyParams) => {
  const navigate = useNavigate();
  const { isTranversing, isClearView, changes, getUpdateUrl } =
    commonAccountSetings({
      tableAction,
      isIncognito,
      isPrivate,
      settings,
      affix,
    });
  const apply = (e?: React.MouseEvent | boolean) => {
    dispatchMemberActions(dispatch);
    if (isClearView)
      clearView({
        yoinks: [],
        keyids: [],
        pages: [`${0}-${settings.take}`],
      });
    else if (e && typeof e !== 'boolean' && settings.isTabled && isTranversing) {
      setTimeout(() =>
        navigate(
          getUpdateUrl({
            prefix: changes.affix,
            isEnter: false,
            defaultTake,
            parentData,
            settings,
            child,
          }).url || ''
        )
      );
      if (typeof e === 'object' && e.preventDefault)
        e.preventDefault();
      updateMenuItem({ ...changes, parentData: undefined });
      return baseApply(undefined, 'abort_goBack');
    }
    updateMenuItem({ ...changes, parentData: undefined });
    if (e && typeof e !== 'boolean')
      baseApply(e);
    else
      baseApply(undefined, 'abort_goBack');

  };
  return apply;
};
