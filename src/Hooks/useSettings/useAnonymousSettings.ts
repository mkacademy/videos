import { useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useDispatch } from "react-redux";
import { commonSettings, updateUrl } from "./useCommonSettings";
import { setProgrammaticNavigation } from "../useQueryMedia";
import {
  resolveSettingsExitTarget,
  warnConvolutionCsFsqConflict,
} from "../../library/convolutionNavSearch";
import { SettingsState } from "../../store/slices/settingsSlice";
import { ParentData, ViewPayload } from "../../store/slices/viewSlice";
import { InitLoadingPayload } from "../../library/actions";
import { SessionState } from "../../store/slices/sessionSlice";

interface UseAnonymousSettingsBtnsParams {
  clearView: (options: ViewPayload) => void;
  setAlgorithmTraversals: (algorithm: string) => void;
  preserveIngredients: (ingredients: InitLoadingPayload) => void;
  launchAlgorithm: (pathname: string) => void;
  updateMenuItem: (changes: Partial<SessionState> & { parentData: undefined }) => void;
  parentData: ParentData | undefined;
  parent: string | undefined;
  settings: SettingsState;
  defaultTake: number;
  extract: () => void;
  curPrefix: string;
  child: string | undefined;
}

interface UseAnonymousSettingsBtnsReturn {
  isValid: boolean;
  goBack: (e: React.MouseEvent) => void;
  onEnter: (proceed: React.MouseEvent | boolean) => void;
}

interface LocationState {
  goBackUrl?: string;
}

export const useAnonymousSettingsBtns = ({
  setAlgorithmTraversals,
  preserveIngredients,
  launchAlgorithm,
  updateMenuItem,
  defaultTake,
  parentData,
  curPrefix,
  clearView,
  settings,
  extract,
  parent,
  child,
}: UseAnonymousSettingsBtnsParams): UseAnonymousSettingsBtnsReturn => {
  const navigate = useNavigate();
  const location = useLocation();
  const { pathname } = location;
  const urlState = useRef<LocationState | undefined>(location.state as LocationState);
  
  const { commonEnter } = commonSettings({
    setAlgorithmTraversals,
    updateMenuItem,
    settings,
    extract,
    parent,
  });

  const goBack = (e: React.MouseEvent): void => {
    if (urlState.current?.goBackUrl) {
      navigate(urlState.current.goBackUrl);
    } else {
      console.log("error_goBackUrl_noset");
    }
    e.preventDefault();
  };

  const onEnter = (proceed: React.MouseEvent | boolean): void => {
    if (proceed) {
      const { curParent, curChild, url, ingredients } = updateUrl({
        isEnter: true,
        defaultTake,
        parentData,
        settings,
        child,
      });
      
      if (curParent !== parent || curChild !== child) {
        setTimeout(() => launchAlgorithm(pathname));
        clearView({
          yoinks: [],
          keyids: [],
          pages: [`${0}-${settings.take || 0}`],
        });
        preserveIngredients(ingredients);
        if (url) navigate(url);
      } else if (
        settings.prefix !== curPrefix ||
        (urlState.current &&
          !urlState.current.goBackUrl?.toLowerCase().startsWith("/app"))
      ) {
        setTimeout(() => launchAlgorithm(pathname));
        const urlResult = updateUrl({
          prefix: settings.prefix,
          isEnter: false,
          defaultTake,
          parentData,
          settings,
          child,
        });
        if (urlResult.url) navigate(urlResult.url);
      } else if (urlState.current?.goBackUrl) {
        navigate(urlState.current.goBackUrl);
      } else {
        setProgrammaticNavigation();
        navigate(-1);
      }
    }
    commonEnter();
  };

  return {
    isValid: settings.isValid || false,
    onEnter,
    goBack,
  };
};

interface UseAnonymousSettingsApplyParams {
  setAlgorithmTraversals: (algorithm: string) => void;
  launchAlgorithm: (pathname: string) => void;
  updateMenuItem: (changes: Partial<SessionState> & { parentData: undefined }) => void;
  parentData: ParentData | undefined;
  defaultTake: number;
  curPrefix: string;
  settings: SettingsState;
  extract: () => void;
  child: string | undefined;
  parent: string | undefined;
}

export const useAnonymousSettingsApply = ({
  setAlgorithmTraversals,
  launchAlgorithm,
  updateMenuItem,
  defaultTake,
  parentData,
  curPrefix,
  settings,
  extract,
  child,
  parent,
}: UseAnonymousSettingsApplyParams) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const location = useLocation();
  const { pathname } = location;
  const urlState = useRef<LocationState | undefined>(location.state as LocationState);
  
  const { commonApply } = commonSettings({
    setAlgorithmTraversals,
    updateMenuItem,
    settings,
    extract,
    parent,
  });
  
  const notEnter = {
    prefix: settings.prefix,
    isEnter: false,
    defaultTake,
    parentData,
    settings,
    child,
  };

  const navigateBackFromSettings = (goBackUrl?: string): void => {
    if (!goBackUrl) {
      setProgrammaticNavigation();
      navigate(-1);
      return;
    }
    const stickyFsq = { shouldHydrate: settings.shouldHydrate, fsq: settings.fsq };
    const target = resolveSettingsExitTarget(goBackUrl, stickyFsq);
    if (!target) {
      warnConvolutionCsFsqConflict(dispatch);
      return;
    }
    navigate(target);
  };
  
  const apply = (e?: React.MouseEvent | boolean, d?: string): void => {
    if (e && typeof e !== 'boolean' && urlState.current) {
      const { goBackUrl } = urlState.current;
      const istabled = goBackUrl?.startsWith("/app/");
      if (istabled && settings.prefix !== curPrefix) {
        setTimeout(() => launchAlgorithm(pathname));
        const url = updateUrl(notEnter).url;
        if (url) navigate(url);
      } else {
        navigateBackFromSettings(goBackUrl);
      }
    } else if (e && typeof e !== 'boolean') {
      navigateBackFromSettings(urlState.current?.goBackUrl);
    } else if (e === undefined && d === undefined) {
      setTimeout(() => navigateBackFromSettings(urlState.current?.goBackUrl));
    }
    if (typeof e === 'object' && e.preventDefault) 
      e.preventDefault();
    commonApply();
  };
  
  return apply;
};
