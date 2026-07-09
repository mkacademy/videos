import React from "react";
import { UseFormRegister } from "react-hook-form";
import { FormData } from "./LoginWrapper";

interface MaxLoginFeaturesProps {
  styles: {
    'form-group': string;
    'form-control': string;
    'check-box-group': string;
    'no-Padding-right': string;
    'no-Padding-left': string;
  };
  register: UseFormRegister<FormData>;
  isAuthenticated: boolean;
  fromEntries: [string, string][];
  toEntries: [string, string][];
  sessionSizes: Record<string, string>;
  convolutionsOption: string;
  initLabel: string;
}

export default function MaxLoginFeatures({
  styles,
  register,
  isAuthenticated,
  fromEntries,
  toEntries,
  sessionSizes,
  convolutionsOption,
  initLabel,
}: MaxLoginFeaturesProps) {
  return (
    <React.Fragment>
      <div className="col-xs-12 col-sm-12 col-md-6 col-lg-6 col-xl-6">
        <div className={`form-group ${styles['form-group']}`}>
          <input
            type="text"
            {...register("username_txb", { required: "Username is required" })}
            className={`form-control ${styles['form-control']}`}
            placeholder="Your username"
            disabled={isAuthenticated}
          />
        </div>
        <div className={`form-group ${styles['form-group']}`}>
          <input
            type="password"
            {...register("password_txb", { required: "Password is required" })}
            className={`form-control ${styles['form-control']}`}
            placeholder="Your password"
            disabled={isAuthenticated}
          />
        </div>
        <div className={`form-group ${styles['form-group']}`}>
          <select
            {...register("from_txb", { required: true })}
            className={`form-control ${styles['form-control']}`}
          >
            {fromEntries.map(([key, value], i) => (
              <option key={i} value={key}>
                {value}
              </option>
            ))}
          </select>
        </div>
        <div className={`form-group ${styles['form-group']}`}>
          <select
            {...register("to_txb", { required: true })}
            className={`form-control ${styles['form-control']}`}
          >
            {toEntries.map(([key, value], i) => (
              <option key={i} value={key}>
                {value}
              </option>
            ))}
          </select>
        </div>
        <div className={`form-group ${styles['form-group']}`}>
          <div className="row">
            <div className={`col-6 no-Padding-right ${styles['no-Padding-right']}`}>
              <label>
                <input
                  type="radio"
                  value="/app/"
                  {...register("format_txb", { required: true })}
                />
                Showcased
              </label>
            </div>
            <div className={`col-6 no-Padding-left ${styles['no-Padding-left']}`}>
              <label>
                <input
                  type="radio"
                  value="/app/tabulator/"
                  {...register("format_txb", { required: true })}
                />
                Tabled
              </label>
            </div>
          </div>
        </div>
      </div>
      <div className="col-xs-12 col-sm-12 col-md-6 col-lg-6 col-xl-6">
        <div className={`form-group ${styles['form-group']}`}>
          <select
            {...register("seconds_txb", { required: true })}
            className={`form-control ${styles['form-control']}`}
          >
            {Object.entries(sessionSizes).map(([key, value], i) => (
              <option key={i} value={key}>
                {value}
              </option>
            ))}
          </select>
        </div>
        <div className={`form-group ${styles['form-group']}`}>
          <select
            {...register("role_txb", { required: true })}
            className={`form-control ${styles['form-control']}`}
          >
            <option value="">Role</option>
            <option value="ROLE_USER">Member</option>
            <option value="ROLE_MODERATOR">Moderator</option>
            <option value="ROLE_ADMIN">Administrator</option>
          </select>
        </div>
        <div className={`form-group check-box-group ${styles['form-group']} ${styles['check-box-group']}`}>
          <div className="row">
            <div className={`col-6 no-Padding-right ${styles['no-Padding-right']}`}>
              <label>
                <input
                  type="radio"
                  value="1"
                  {...register("domain_txb", { required: true })}
                />
                MyAccount
              </label>
            </div>
            <div className={`col-6 no-Padding-left ${styles['no-Padding-left']}`}>
              <label>
                <input
                  type="radio"
                  value="0"
                  {...register("domain_txb", { required: true })}
                />
                Incognito
              </label>
            </div>
          </div>
        </div>
        <div className={`form-group check-box-group ${styles['form-group']} ${styles['check-box-group']}`}>
          <div className="row">
            <div className={`col-6 no-Padding-right ${styles['no-Padding-right']}`}>
              <label>
                <input
                  type="radio"
                  value="0"
                  {...register("pause_txb", { required: true })}
                />
                Browse
              </label>
            </div>
            <div className={`col-6 no-Padding-left ${styles['no-Padding-left']}`}>
              <label>
                <input
                  type="radio"
                  value="1"
                  {...register("pause_txb", { required: true })}
                />
                Summon
              </label>
            </div>
          </div>
        </div>
        <div className={`form-group check-box-group ${styles['form-group']} ${styles['check-box-group']}`}>
          <div className="row">
            <div className={`col-6 no-Padding-right ${styles['no-Padding-right']}`}>
              <label>
                <input
                  type="radio"
                  value="1"
                  {...register("ordinal_txb", { required: true })}
                />
                Ascend
              </label>
            </div>
            <div className={`col-6 no-Padding-left ${styles['no-Padding-left']}`}>
              <label>
                <input
                  type="radio"
                  value="0"
                  {...register("ordinal_txb", { required: true })}
                />
                Descend
              </label>
            </div>
          </div>
        </div>
        <div className={`form-group check-box-group ${styles['form-group']} ${styles['check-box-group']}`}>
          <div className="row">
            <div className={`col-6 no-Padding-right ${styles['no-Padding-right']}`}>
              <label>
                <input
                  type="radio"
                  value={convolutionsOption}
                  {...register("format_txb")}
                />
                {initLabel}
              </label>
            </div>
            <div className={`col-6 no-Padding-left ${styles['no-Padding-left']}`}>
              <label>
                <input
                  type="radio"
                  value="/settings/"
                  {...register("format_txb")}
                />
                Settings
              </label>
            </div>
          </div>
        </div>
      </div>
    </React.Fragment>
  );
}
