import React, { useEffect, useRef } from "react";
import { Col, Row } from "react-bootstrap";
import { FieldValues } from "react-hook-form";
import { useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../store";
import StaticForm, { StaticFormEntity } from "./StaticForm";
import { getInitialMutationData, sifterDefaults, hasMutationData } from "./formulatorUtils";
import * as styles from "../../styles/comments.module.css";
import FormErrorMessage from "./FormErrorMessage";
import { updateCourses, UpdatePayload, persistCourses } from "../../library/actions";
import { Banner as CourseBanner } from "../../store/slices/courseSlice";
import { editsMessage } from "../../utils";
import { UpdateTextsPayload } from "../../store/slices/textSlice";

export interface SiftersFormProps {
  /** Pre-populate fields for update: sifter, purpose. */
  defaultValues?: FieldValues;
  onSubmit?: (data: FieldValues, options?: { initialValues?: FieldValues }) => void;
  source: "quizBanner" | "courseBanner";
  onCancel?: (id: number) => void;
  onSave?: (id: number) => void;
  singleItemFormVisible: boolean;
}

const SiftersForm: React.FC<SiftersFormProps> = (props) => {
  const dispatch = useDispatch();
  const { pathname } = useLocation();
  const isSavingEdits = useSelector((state: RootState) =>
    state.view.requestIsProcessing && state.view.message === editsMessage);
  const quizQuizzes = useSelector((state: RootState) => state.quiz.quizzes);
  const quizBanners = useSelector((state: RootState) => state.quiz.banners);
  const quizSelected = useSelector((state: RootState) => state.quiz.selected);
  const courseBanners = useSelector((state: RootState) => state.course.banners);
  const dismissals = useSelector((state: RootState) => state.session.dismissals);
  const courseSelected = useSelector((state: RootState) => state.course.selected);
  const singleItemForms = useSelector((state: RootState) => state.session.singleItemForms) ?? {};
  const prevIsSavingEditsRef = useRef(false);

  const dismissed = dismissals[pathname] ?? false;

  const handleSubmit = (data: FieldValues, options?: { initialValues?: FieldValues }) => {
    const updates: UpdatePayload = {
      ...data,
      edited: true,
      title: data.sifter,
      id: parseInt(data.id),
    };
    dispatch(updateCourses([updates]));
    props.onSubmit?.(data, options);
  };

  const handleCancel = (id: number) => {
    const initialData = getInitialMutationData(id);
    if (!initialData || !initialData?.sifter) return;
    const updates: UpdatePayload = {
      ...initialData,
      edited: true,
      title: initialData.sifter,
      id: parseInt(initialData.id),
    };
    dispatch(updateCourses([updates]));
    props.onCancel?.(id);
  };

  const items =
    props.source === "quizBanner"
      ? (() => {
        if (quizSelected === -1) return [];
        const quiz = quizQuizzes[quizSelected];
        return quizBanners.filter((b) => b.bannerId === quiz?.id);
      })()
      : (() => {
        if (courseSelected > -1) return [];
        return courseBanners;
      })();
  const single =
    items.length === 1
      ? (() => {
        if (props.source === "quizBanner") {
          if (quizSelected === -1) return null;
          return props.singleItemFormVisible !== false ? items[0] : null;
        }
        if (props.source === "courseBanner") {
          if (courseSelected > -1) return null;
          return props.singleItemFormVisible !== false ? items[0] : null;
        }
        return null;
      })()
      : (() => {
        if (props.source === "courseBanner" && courseSelected > -1) return null;
        else if (props.source === "quizBanner" && quizSelected === -1) return null;
        const matching = items.filter((item) => item.isDismissed === dismissed);
        return matching.length === 1 ? matching[0] : null;
      })();
  const entityKey: string =
    props.source === "quizBanner" ? "quizBanners" : "courseBanners";
  const isSingleFormEnabled = singleItemForms[`${pathname}:${entityKey}`] ?? true;

  useEffect(() => {
    const wasProcessing = prevIsSavingEditsRef.current;
    if (wasProcessing && !isSavingEdits && single != null && single.id != null) {
      if (!hasMutationData(single.id)) {
        const updates: UpdateTextsPayload = { id: String(single.id), modified: false };
        dispatch(persistCourses([updates]));
      }
    }
    prevIsSavingEditsRef.current = isSavingEdits;
  }, [isSavingEdits, single, dispatch]);

  if (!single || !isSingleFormEnabled) return null;

  const { owner, metadata } = single as Partial<CourseBanner>;
  const hasOwnership = owner ?? metadata?.owner;

  if (!hasOwnership) return <FormErrorMessage><p>You do not have permission to edit this item.</p></FormErrorMessage>;

  const defaultValues = sifterDefaults(single);

  return (
    <div className={styles["root"]}>
      <Row>
        <Col lg={12}>
          <StaticForm
            entity={"sifters" as StaticFormEntity}
            heading={props.source === "quizBanner" ? "Edit Question" : "Edit Course"}
            defaultValues={defaultValues}
            onCancel={handleCancel}
            onSubmit={handleSubmit}
            onSave={props.onSave}
          />
        </Col>
      </Row>
    </div>
  );
};

export default SiftersForm;
