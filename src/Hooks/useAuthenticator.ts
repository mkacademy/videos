import { useState, useEffect } from 'react';
import { contentDelay } from '../constants';
import { FormData as FormDataThunk, VerifyFormData } from '../library/types';

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
