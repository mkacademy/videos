import React from "react";
import {
  globalVars,
  structure,
  sessionSizes,
  getCurAppName,
  resetVistedRoutes,
} from "../../utils";
import { useForm } from "react-hook-form";
import { useAuthenticator } from "../../Hooks/useAuthenticator";
import { clearEscrow } from "../../store/slices/viewSlice";
import { ViewPayload, viewPayload as escrowPayload } from "../../store/slices/viewSlice";
import {
  initializedLoading as mutateSession,
} from "../../store/slices/sessionSlice";
import { AuthPayload } from "../../library/types";
import { authenticate } from "../../library/Thunks";
import { resolveLdrRedirectUrl } from "../../library/hydrationUtils";

import { Link, useSearchParams } from "react-router-dom";
import {
  showAlgorithm,
  initLoading,
  InitLoadingPayload,
} from "../../library/actions";
import type { SessionState } from "../../store/slices/sessionSlice";
import { useDispatch, useSelector } from "react-redux";
import { ThunkDispatch, UnknownAction } from "@reduxjs/toolkit";
import { RootState } from "../../store";
import MaxLoginFeatures from "./MaxLoginFeatures";
import MinLoginFeatures from "./MinLoginFeatures";


export interface FormData {
  username_txb: string;
  password_txb: string;
  role_txb: string;
  format_txb: string;
  domain_txb: string;
  pause_txb: string;
  ordinal_txb: string;
  from_txb: string;
  to_txb: string;
  seconds_txb: string;
  combinationValidator?: string;
}

type AppName = keyof typeof validDefaulteRoutes;

const validDefaulteRoutes = {
  quiz: { from: "foundation", to: "dashboards", label: "Quiz" },
  tutors: { from: "foundation", to: "minions", label: "Tutors" },
  course: { from: "foundation", to: "sifters", label: "Course" },
  tutorial: { from: "foundation", to: "filters", label: "Tutorial" },
  cpanel: { from: "foundation", to: "instructions", label: "Cpanel" },
  outgoing: { from: "minions", to: "instructions", label: "Outgoing" },
  incoming: { from: "foundation", to: "instructions", label: "Incoming" },
} as const;

const options = ["app", "tabulator", "settings"];
const pred = (part: string) => options.includes(part);

interface LoginWrapperProps {
  styles: {
    'registration': string;
    'form-header': string;
    'container-inner-h2': string;
    'container-inner': string;
    'contact-form': string;
    'mt-30': string;
    'text-color-white': string;
    'text-color-gray': string;
    'bg-color-gray': string;
    'font-thin': string;
    'check-box-group': string;
    'center': string;
    'form-control': string;
    'form-footer': string;
    'btn': string;
    'btn-primary': string;
    'no-Padding-right': string;
    'no-Padding-left': string;
    'form-group': string;
  };
}

export default function LoginWrapper({ styles }: LoginWrapperProps) {
  const [searchParams] = useSearchParams();
  const dispatch = useDispatch<ThunkDispatch<RootState, unknown, UnknownAction>>();
  const curApp = useSelector((state: RootState) => state.session.curApp);
  const curRoutes = useSelector((state: RootState) => state.session.curRoutes);
  const roleIndex = useSelector((state: RootState) => state.session.roleIndex);
  const pauseFetchers = useSelector((state: RootState) => state.session.pauseFetchers);
  const isMaximumFeatures = useSelector((state: RootState) =>
    !state.settings.isUnzipCourses
    && !state.settings.isUnzipQuizzes
    && !state.settings.isUnzipTutorials);
  const regex = /convolution|settings|app/g;
  const goBackUrl = searchParams.get("redirectUrl") ?? "";
  const isConvo = goBackUrl.indexOf("convolution") > -1;
  const notTabled = goBackUrl.indexOf("tabulator") === -1;
  const isOption = goBackUrl.search(regex) > -1 && notTabled;
  const toPredicate = ([key, _]: [string, string]) => curRoutes?.find((r: string) => r.endsWith(key));
  const fromPredicate = ([key, _]: [string, string]) => curRoutes?.find((r: string) => r.startsWith(key));
  const entries = Object.entries(structure.selOptions);
  const fromEntries = entries.filter(fromPredicate);
  const toEntries = entries.filter(toPredicate);
  const init = validDefaulteRoutes[getCurAppName(curApp) as AppName];
  const convolutionsOption = isConvo ? goBackUrl : `/convolution/${init.label.toLowerCase()}`;
  const goBackParts = `/${goBackUrl.split("/").filter(pred)?.join("/")}/`;
  const { register, handleSubmit, getValues, setError, formState: { errors }, clearErrors } =
    useForm<FormData>({
      defaultValues: {
        pause_txb: "0",
        domain_txb: "1",
        to_txb: init.to,
        ordinal_txb: "1",
        from_txb: init.from,
        seconds_txb: "7200",
        role_txb: "ROLE_USER",
        format_txb: isOption
          ? isConvo
            ? goBackUrl
            : goBackParts.replace("//", "/")
          : isMaximumFeatures
            ? `/convolution/${init.label.toLowerCase()}`
            : "/app/",
      },
    });
  const isAuthenticated = roleIndex > -1;

  const params = {
    roleIndex,
    signOn: (payload: AuthPayload) => {
      dispatch(authenticate(payload));
    },
    loggedOn: (payload: Partial<SessionState> & { parentData: undefined }) => dispatch(mutateSession(payload)),
    clearView: (payload: ViewPayload) => {
      dispatch(clearEscrow());
      dispatch(escrowPayload(payload));
    },
    launchAlgorithm: (payload: string) => dispatch(showAlgorithm(payload)),
    preserveIngredients: (payload: InitLoadingPayload) => dispatch(initLoading(payload)),
    resolveRedirectUrl: resolveLdrRedirectUrl,
  };

  const [isAuthenticating, onSubmit, onGuest] = useAuthenticator(params);

  resetVistedRoutes(pauseFetchers);

  const handleFormSubmit = async (formData: FormData) => {
    onSubmit(formData, setError, clearErrors);
  };

  const formFieldStyles = {
    'form-group': styles['form-group'],
    'form-control': styles['form-control'],
    'check-box-group': styles['check-box-group'],
    'no-Padding-right': styles['no-Padding-right'],
    'no-Padding-left': styles['no-Padding-left'],
  };

  return (
    <section className={`row mt-30 registration ${styles['registration']} ${styles['mt-30']}`}>
      <div className={`col-lg-12 form-header ${styles['form-header']} pl-5 pr-5`}>
        <div className={`container-inner-h2 ${styles['container-inner-h2']}`}>
          <h2 className={`text-color-white ${styles['text-color-white']}`}>MKACADEMY</h2>
          <Link
            className={`text-color-white ${styles['text-color-white']}`}
            to="/what-is-this"
            target="_blank"
            rel="noopener noreferrer"
          >
            {"[what is this]"}
          </Link>
        </div>
      </div>
      <div className="col-lg-12 pl-2 pl-sm-3 pl-md-5 pr-2 pr-sm-3 pr-md-5">
        <form
          onSubmit={handleSubmit(handleFormSubmit)}
          className={`row container-inner contact-form ${styles['container-inner']} ${styles['contact-form']}`}
        >
          {isMaximumFeatures ? (
            <MaxLoginFeatures
              styles={formFieldStyles}
              register={register}
              isAuthenticated={isAuthenticated}
              fromEntries={fromEntries}
              toEntries={toEntries}
              sessionSizes={sessionSizes}
              convolutionsOption={convolutionsOption}
              initLabel={init.label}
            />
          ) : (
            <MinLoginFeatures
              styles={formFieldStyles}
              register={register}
              isAuthenticated={isAuthenticated}
              sessionSizes={sessionSizes}
            />
          )}
          {!isAuthenticated && (
            <React.Fragment>
              <div className={`col-xs-12 mt-1 center ${styles.center}`}>
                <Link to="/register" className={`text-color-gray ${styles['text-color-gray']}`}>
                  click here to create an account
                </Link>
              </div>
              <div className={`col-xs-12 mt-4 center ${styles.center}`}>
                <button
                  type="submit"
                  disabled={isAuthenticating}
                  className={`btn btn-primary ${styles.btn} ${styles['btn-primary']}`}
                >
                  LOGIN
                </button>
              </div>
            </React.Fragment>
          )}
          <div className={`col-xs-12 mt-1 center ${styles.center}`}>
            <Link
              to="#"
              className={`text-color-gray ${styles['text-color-gray']}`}
              onClick={(e) => {
                e.preventDefault();
                onGuest(getValues(), setError, clearErrors);
              }}
            >
              {isAuthenticated
                ? globalVars.ingredients
                  ? "redirecting..."
                  : "resume session"
                : "continue incognito"}
            </Link>
          </div>
          <div className="row">
            <div className="col-12">
              {errors["username_txb"] && <span>Username is required</span>}
            </div>
            <div className="col-12">
              {errors["password_txb"] && <span>Password is required</span>}
            </div>
            <div className="col-12">
              {errors["role_txb"] && <span>Role is required</span>}
            </div>
            <div className="col-12">
              {errors["format_txb"] && <span>Format is required</span>}
            </div>
            <div className="col-12">
              {errors["domain_txb"] && <span>Domain is required</span>}
            </div>
            <div className="col-12">
              {errors["from_txb"] && <span>From is required</span>}
            </div>
            <div className="col-12">
              {errors["to_txb"] && <span>To is required</span>}
            </div>
            <div className="col-12">
              {errors["seconds_txb"] && <span>Take is required</span>}
            </div>
            <div className="col-12">
              {errors["combinationValidator"] && (
                <span>{errors["combinationValidator"].message}</span>
              )}
            </div>
          </div>
        </form>
      </div>
      <div className={`col-lg-12 bg-color-gray text-color-white font-thin form-footer ${styles['bg-color-gray']} ${styles['text-color-white']} ${styles['font-thin']} ${styles['form-footer']}`}></div>
    </section>
  );
}
