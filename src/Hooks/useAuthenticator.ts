import { useState, useEffect } from 'react';
import { UseFormSetError, UseFormClearErrors } from 'react-hook-form';
import { useNavigate, useLocation } from 'react-router-dom';
import { ViewPayload } from '../store/slices/viewSlice';
import { SessionState } from '../store/slices/sessionSlice';
import { FormData } from '../components/views/LoginWrapper';
import { AuthPayload } from '../library/types';
import { VerifyFormData } from '../library/types';
import { contentDelay } from '../constants';
import {
  convolutionTake,
  globalVars,
  redirectUrl,
  cookIngredients,
  validatedCombination,
  CookIngredientsProps
} from '../utils';
import { FormData as FormDataThunk } from '../library/types';
import { useSelector } from 'react-redux';
import { RootState } from '../store';

interface AuthenticatorParams {
  roleIndex: number;
  signOn: (payload: AuthPayload) => void;
  clearView: (payload: ViewPayload) => void;
  launchAlgorithm: (payload: string) => void;
  loggedOn: (payload: Partial<SessionState> & { parentData: undefined }) => void;
  preserveIngredients: (payload: CookIngredientsProps) => void;
  resolveRedirectUrl?: (url: string) => string;
}

interface Globals {
  parent?: string;
  prefix?: string;
  isPrivate?: boolean;
  defaultTake?: number;
  isIncognito?: boolean;
  pauseFetchers?: boolean;
  ingredients?: CookIngredientsProps;
}

let globals: Globals = {};
export const useAuthenticator = ({
  signOn,
  loggedOn,
  roleIndex,
  clearView,
  launchAlgorithm,
  preserveIngredients,
  resolveRedirectUrl = (url) => url,
}: AuthenticatorParams) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const curApp = useSelector((state: RootState) => state.session.curApp);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const onGuest = (values: FormData, setError: UseFormSetError<FormData>, clearErrors: UseFormClearErrors<FormData>) => {
    const { format_txb, from_txb, to_txb } = values;
    const params = { selectedParent: from_txb, selectedChild: to_txb };
    const combination = validatedCombination(params, true, '');
    const { selectedParent, selectedChild } = combination;

    if (!combination.isValid) {
      const error = JSON.stringify(combination, null, 2);
      setError("combinationValidator", {
        type: "combination",
        message: "invalid combination -> " + error,
      });
      setTimeout(() => clearErrors(), 5000);
    } else {
      const parent = selectedParent;
      const session = {
        parent,
        prefix: format_txb,
        parentData: undefined,
        defaultTake: convolutionTake(),
      };
      const ingredients = {
        parentData: { curApp, IDs: [], parent },
        defaultTake: convolutionTake(),
        entity: selectedChild,
        prefix: format_txb,
        search: '',
      };
      loggedOn(session);
      clearView({ pages: [`${0}-${session.defaultTake}`], yoinks: [] });
      if (format_txb.startsWith("/app/")) {
        const spread = cookIngredients(ingredients);
        if (spread) {
          ingredients["search"] = spread.pfx;
          ingredients["prefix"] = spread.pfx;
          preserveIngredients(ingredients);
          launchAlgorithm(pathname);
          navigate(spread.url);
        }
      } else navigate(resolveRedirectUrl(format_txb));
    }
  };

  const onSubmit = (formData: FormData, setError: UseFormSetError<FormData>, clearErrors: UseFormClearErrors<FormData>) => {
    setIsAuthenticating(true);
    const {
      password_txb,
      username_txb,
      seconds_txb,
      format_txb,
      domain_txb,
      pause_txb,
      role_txb,
      from_txb,
      to_txb,
    } = formData;
    const params = { selectedParent: from_txb, selectedChild: to_txb };
    const combination = validatedCombination(params, true, '');
    const { selectedParent, selectedChild } = combination;

    if (!combination.isValid) {
      const error = JSON.stringify(combination, null, 2);
      setError("combinationValidator", {
        type: "combination",
        message: "invalid combination -> " + error,
      });
      setTimeout(() => {
        clearErrors();
        setIsAuthenticating(false);
      }, 5000);
    } else {
      const parent = selectedParent;
      const isIncognito = domain_txb === "0";
      const isPrivate = domain_txb === "1";
      globals = {
        parent,
        isPrivate,
        isIncognito,
        prefix: format_txb,
        defaultTake: convolutionTake(),
        pauseFetchers: pause_txb === "0",
      };
      const ingredients = {
        parentData: { curApp, IDs: [], parent },
        defaultTake: convolutionTake(),
        entity: selectedChild,
        prefix: format_txb,
        search: '',
      };
      signOn({
        seconds: parseInt(seconds_txb),
        password: password_txb,
        selectedRole: role_txb,
        email: username_txb,
        ingredients,
      });
    }
  };

  useEffect(() => {
    if (roleIndex < -1) setIsAuthenticating(false);
  }, [roleIndex]);

  useEffect(() => {
    if (roleIndex > -1 && globalVars.ingredients) {
      const ingredients = globalVars.ingredients;
      setTimeout(() => {
        const url = ingredients.prefix;
        const defaultTake = convolutionTake();
        loggedOn({ ...globals, defaultTake, parentData: undefined });
        clearView({ pages: [`${0}-${defaultTake}`], yoinks: [] });
        if (url?.startsWith("/app/")) {
          const spread = cookIngredients(ingredients);
          if (spread) {
            ingredients["search"] = spread.pfx;
            ingredients["prefix"] = spread.pfx;
            preserveIngredients(ingredients);
            launchAlgorithm(pathname);
            navigate(spread.url);
          }
        } else navigate(resolveRedirectUrl(url || ''));
        redirectUrl(undefined);
      }, 1000);
    }
  }, [roleIndex, pathname, loggedOn, clearView, launchAlgorithm, preserveIngredients, navigate, resolveRedirectUrl]);

  return [isAuthenticating, onSubmit, onGuest] as const;
};

interface SubstantiatorParams {
  mutateAccount: (payload: FormDataThunk) => void;
  reloadSettings: () => void;
  mutateRole?: string;
  attempts: number;
}

export const useSubstantiator = ({
  reloadSettings,
  mutateAccount,
  mutateRole,
  attempts,
}: SubstantiatorParams) => {
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const onSubmit = (formData: FormDataThunk) => {
    setIsAuthenticating(true);
    setTimeout(
      () =>
        mutateAccount({
          oldpassword_txb: formData["oldpassword_txb"],
          newpassword_txb: formData["newpassword_txb"],
          username_txb: formData["username_txb"],
          email_txb: formData["email_txb"],
          mutateRole,
          attempts,
        }),
      contentDelay
    );
  };

  useEffect(() => {
    if (attempts > 0) {
      const timeoutId = setTimeout(() => setIsAuthenticating(false));
      return () => clearTimeout(timeoutId);
    } else if (attempts === -1) reloadSettings();
  }, [attempts, reloadSettings]);

  return [isAuthenticating, onSubmit] as const;
};

interface VerifierParams {
  verifyAccount: (payload: VerifyFormData) => void;
  attempts: number;
}

export const useVerifier = ({ verifyAccount, attempts }: VerifierParams) => {
  const [isVerifieng, setIsVerifieng] = useState(false);

  const onSubmit = (formData: VerifyFormData) => {
    setIsVerifieng(true);
    setTimeout(
      () =>
        verifyAccount({
          verificationcode_txb: formData["verificationcode_txb"],
          attempts,
        }),
      contentDelay
    );
  };

  useEffect(() => {
    if (attempts > 0) setTimeout(() => setIsVerifieng(false));
  }, [attempts]);

  return [isVerifieng, onSubmit] as const;
}; 