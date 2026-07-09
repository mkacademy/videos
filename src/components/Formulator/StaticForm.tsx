import React from "react";
import { Col, Row } from "react-bootstrap";
import { FieldValues, useForm } from "react-hook-form";
import { Tree } from "../../utils";
import { FormKeys } from "../../utils";
import * as styles from "../../styles/comments.module.css";
import { useSelector } from "react-redux";
import { RootState } from "../../store/types";
import { hasMutationData } from "./formulatorUtils";

export type StaticFormEntity = "foundation" | "instructions" | "filters" | "dashboards" | "sifters";

export interface StaticFormProps {
  entity: StaticFormEntity;
  heading?: string;
  /** Pre-populate form fields (e.g. for update). Keys match field names: instruction, details, imageurl (instructions); filter, purpose (filters); dashboard, purpose (dashboards); sifter, purpose (sifters). */
  defaultValues?: FieldValues;
  /** Called with current form data and optional metadata such as initial values. */
  onSubmit?: (data: FieldValues, meta?: { initialValues?: FieldValues }) => void;
  /** Called when the Cancel button is clicked (after the form has been reset to its initial values). */
  onCancel?: (id: number) => void;
  onSave?: (id: number) => void;
}

const noEmptyString = (value: unknown) =>
  (value != null && String(value).trim() !== "") || "This field is required";

const StaticForm: React.FC<StaticFormProps> = ({ entity, heading, defaultValues, onSubmit, onCancel, onSave }) => {
  const formKeys: FormKeys | undefined = Tree.getProperty(entity, "form");
  const { register, handleSubmit, formState, reset } = useForm({ defaultValues: defaultValues ?? {} });
  const requestIsProcessing = useSelector((state: RootState) => state.view.requestIsProcessing);
  const errors = formState.errors ?? {};

  if (!formKeys) return null;

  const { textInputs = [], textAreas = [] } = formKeys;
  const fileInputsList =
    "fileInputs" in formKeys && Array.isArray((formKeys as { fileInputs?: { name: string; label: string }[] }).fileInputs)
      ? (formKeys as { fileInputs: { name: string; label: string }[] }).fileInputs
      : [];

  const isInstructions = entity === "instructions";
  const titleAndFileSideBySide = isInstructions && textInputs.length > 0 && fileInputsList.length > 0;
  const firstTextInput = titleAndFileSideBySide ? textInputs[0] : null;
  const remainingTextInputs = titleAndFileSideBySide ? textInputs.slice(1) : textInputs;
  const firstFileInput = titleAndFileSideBySide && fileInputsList[0] ? fileInputsList[0] : null;
  const remainingFileInputs = titleAndFileSideBySide ? fileInputsList.slice(1) : fileInputsList;

  const handleFormSubmit = (data: FieldValues) => {
    onSubmit?.(data, { initialValues: defaultValues ?? {} });
  };

  const handleResetClick = () => {
    reset(defaultValues ?? {});
  };
  const childId = defaultValues?.id ?? -1;
  const hasMutationDataValue = hasMutationData(childId);
  return (
    <div className={`${styles["sidebarItem"]} ${styles["submitComment"]}`}>
      {heading !== undefined && (
        <div className={styles["sidebarHeading"]}>
          <h2>{heading}</h2>
        </div>
      )}
      <div className={styles["content"]}>
        <form onSubmit={handleSubmit(handleFormSubmit)}>
          <input type="hidden" {...register("id")} />
          <input type="hidden" {...register("bannerId")} />
          <Row>
            {titleAndFileSideBySide && firstTextInput && firstFileInput && (
              <>
                <Col md={6} sm={12}>
                  <fieldset>
                    <input
                      type="text"
                      className={errors[firstTextInput.name] ? styles["inputHasError"] : undefined}
                      placeholder={firstTextInput.label}
                      {...register(firstTextInput.name, {
                        required: true,
                        maxLength: firstTextInput.maxlength ?? undefined,
                        validate: noEmptyString,
                      })}
                    />
                    {(errors[firstTextInput.name]?.type === "required" || errors[firstTextInput.name]?.type === "validate" || errors[firstTextInput.name]?.message) && (
                      <div className={styles["formErrorMessage"]}>
                        {String(errors[firstTextInput.name]?.message || "This field is required")}
                      </div>
                    )}
                    {errors[firstTextInput.name]?.type === "maxLength" && (
                      <div className={styles["formErrorMessage"]}>
                        Your input exceeds maxLength of {firstTextInput.maxlength}
                      </div>
                    )}
                  </fieldset>
                </Col>
                <Col md={6} sm={12}>
                  <fieldset>
                    <input
                      type="file"
                      {...register(firstFileInput.name, { required: false })}
                    />
                  </fieldset>
                </Col>
              </>
            )}
            {remainingTextInputs.map((form, i) => (
              <Col key={form.name} md={12} sm={12}>
                <fieldset>
                  <input
                    type="text"
                    className={errors[form.name] ? styles["inputHasError"] : undefined}
                    placeholder={form.label}
                    {...register(form.name, {
                      required: i === 0,
                      maxLength: form.maxlength ?? undefined,
                      validate: noEmptyString,
                    })}
                  />
                  {(errors[form.name]?.type === "required" || errors[form.name]?.type === "validate" || errors[form.name]?.message) && (
                    <div className={styles["formErrorMessage"]}>
                      {String(errors[form.name]?.message || "This field is required")}
                    </div>
                  )}
                  {errors[form.name]?.type === "maxLength" && (
                    <div className={styles["formErrorMessage"]}>
                      Your input exceeds maxLength of {form.maxlength}
                    </div>
                  )}
                </fieldset>
              </Col>
            ))}
            {textAreas.map((form) => (
              <Col key={form.name} lg={12}>
                <fieldset>
                  <textarea
                    rows={6}
                    className={errors[form.name] ? styles["inputHasError"] : undefined}
                    placeholder={form.label}
                    {...register(form.name, {
                      maxLength: form.maxlength ?? undefined,
                      validate: noEmptyString,
                    })}
                  />
                  {errors[form.name]?.message && (
                    <div className={styles["formErrorMessage"]}>
                      {String(errors[form.name]?.message || "This field is required")}
                    </div>
                  )}
                  {errors[form.name]?.type === "maxLength" && (
                    <div className={styles["formErrorMessage"]}>
                      Your input exceeds maxLength of {form.maxlength}
                    </div>
                  )}
                </fieldset>
              </Col>
            ))}
            {remainingFileInputs.map((form) => (
              <Col key={form.name} lg={12}>
                <fieldset>
                  <input
                    type="file"
                    {...register(form.name, { required: false })}
                  />
                </fieldset>
              </Col>
            ))}
            <Col lg={12}>
              <fieldset>
                <div className={styles["replyActions"]}>
                  <button type="submit" className={styles["mainButton"]}>
                    Preview
                  </button>
                  <button
                    type="button"
                    onClick={handleResetClick}
                    className={styles["replyCancelButton"]}
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    disabled={requestIsProcessing}
                    onClick={() => onCancel?.(childId)}
                    className={styles["replyCancelButton"]}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className={styles["saveButton"]}
                    onClick={() => onSave?.(childId)}
                    disabled={ requestIsProcessing || !hasMutationDataValue}
                  >
                    Save
                  </button>
                </div>
              </fieldset>
            </Col>
          </Row>
        </form>
      </div>
    </div>
  );
};

export default StaticForm;
