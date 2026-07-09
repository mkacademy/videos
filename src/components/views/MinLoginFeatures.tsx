import React from "react";
import { UseFormRegister } from "react-hook-form";
import { FormData } from "./LoginWrapper";

interface MinLoginFeaturesProps {
  styles: {
    'form-group': string;
    'form-control': string;
    'check-box-group': string;
    'no-Padding-right': string;
    'no-Padding-left': string;
  };
  register: UseFormRegister<FormData>;
  isAuthenticated: boolean;
  sessionSizes: Record<string, string>;
}

export default function MinLoginFeatures({
  styles,
  register,
  isAuthenticated,
  sessionSizes,
}: MinLoginFeaturesProps) {
  return (
    <React.Fragment>
      <input type="hidden" {...register("from_txb", { required: true })} />
      <input type="hidden" {...register("to_txb", { required: true })} />
      <input type="hidden" {...register("domain_txb", { required: true })} />
      <input type="hidden" {...register("pause_txb", { required: true })} />
      <input type="hidden" {...register("ordinal_txb", { required: true })} />
      <input type="hidden" {...register("format_txb", { required: true })} />
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
      </div>
    </React.Fragment>
  );
}
