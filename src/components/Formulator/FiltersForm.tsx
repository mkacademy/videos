import React, { useEffect, useRef } from "react";
import { Col, Row } from "react-bootstrap";
import { FieldValues } from "react-hook-form";
import { useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../store";
import StaticForm, { StaticFormEntity } from "./StaticForm";
import { filterDefaults, getInitialMutationData, hasMutationData } from "./formulatorUtils";
import * as styles from "../../styles/comments.module.css";
import FormErrorMessage from "./FormErrorMessage";
import { UpdatePayload, updateTutorials, persistTutorials } from "../../library/actions";
import { Banner as TutorialBanner } from "../../store/slices/tutorialSlice";
import { Pennant } from "../../library/CourseUtils";
import { UpdateTextsPayload } from "../../store/slices/textSlice";
import { editsMessage } from "../../utils";

export interface FiltersFormProps {
  onSubmit?: (data: FieldValues, options?: { initialValues?: FieldValues }) => void;
  source?: "tutorialBanner" | "coursePennants" | "quizCoursePennants";
  onCancel?: (id: number) => void;
  onSave?: (id: number) => void;
  singleItemFormVisible: boolean;  
}

const FiltersForm: React.FC<FiltersFormProps> = (props) => {
  const dispatch = useDispatch();
  const { pathname } = useLocation();
  const isSavingEdits = useSelector((state: RootState) =>
    state.view.requestIsProcessing && state.view.message === editsMessage);
  const dismissals = useSelector((state: RootState) => state.session.dismissals);
  const tutorialBanners = useSelector((state: RootState) => state.tutorial.banners);
  const tutorialSelected = useSelector((state: RootState) => state.tutorial.selected);
  const courseBanners = useSelector((state: RootState) => state.course.banners);
  const courseSelected = useSelector((state: RootState) => state.course.selected);
  const quizBanners = useSelector((state: RootState) => state.quiz.banners);
  const quizSelected = useSelector((state: RootState) => state.quiz.selected);
  const quizFollowupId = useSelector((state: RootState) => state.quiz.followupId);
  const singleItemForms = useSelector((state: RootState) => state.session.singleItemForms) ?? {};
  const prevIsSavingEditsRef = useRef(false);

  const source = props.source ?? "tutorialBanner";
  const dismissed = dismissals[pathname] ?? false;

  const items =
    source === "tutorialBanner"
      ? tutorialBanners
      : source === "quizCoursePennants"
        ? (() => {
          if (quizSelected === -1 || quizFollowupId === undefined) return [];
          const parent = quizBanners.find((b) => b.id === quizFollowupId);
          return parent?.pennants ?? [];
        })()
        : (() => {
          if (courseSelected === -1) return [];
          const banner = courseBanners[courseSelected];
          return banner?.pennants ?? [];
        })();
  const single =
    items.length === 1
      ? (() => {
        if (source === "tutorialBanner") {
          if (tutorialSelected > -1) return null;
          return props.singleItemFormVisible !== false ? items[0] : null;
        }
        if (source === "coursePennants") {
          if (courseSelected === -1) return null;
          return props.singleItemFormVisible !== false ? items[0] : null;
        }
        if (source === "quizCoursePennants") {
          if (quizSelected === -1 || quizFollowupId === undefined) return null;
          return props.singleItemFormVisible !== false ? items[0] : null;
        }
        return null;
      })()
      : (() => {
        if (source === "tutorialBanner" && tutorialSelected > -1) return null;
        if (source === "coursePennants" && courseSelected === -1) return null;
        if (source === "quizCoursePennants" && (quizSelected === -1 || quizFollowupId === undefined)) return null;
        const matching = items.filter((item) => item.isDismissed === dismissed);
        return matching.length === 1 ? matching[0] : null;
      })();

  const entityKey =
    source === "tutorialBanner"
      ? "tutorialBanners"
      : source === "quizCoursePennants"
        ? "quizCoursePennants"
        : "coursePennants";
  const isSingleFormEnabled = singleItemForms[`${pathname}:${entityKey}`] ?? true;

  useEffect(() => {
    const wasProcessing = prevIsSavingEditsRef.current;
    if (wasProcessing && !isSavingEdits && single != null && single.id != null) {
      if (!hasMutationData(single.id)) {
        const updates: UpdateTextsPayload = { id: String(single.id), modified: false };
        dispatch(persistTutorials([updates]));
      }
    }
    prevIsSavingEditsRef.current = isSavingEdits;
  }, [isSavingEdits, single, source, dispatch, quizFollowupId, quizSelected]);

  if (!single || !isSingleFormEnabled) return null;
  const { owner, metadata } = single as Partial<TutorialBanner> | Partial<Pennant>;
  const hasOwnership = owner ?? metadata?.owner;
  if (!hasOwnership) return <FormErrorMessage><p>You do not have permission to edit this item.</p></FormErrorMessage>;


  const defaultValues = filterDefaults(single);

  const handleSubmit = (data: FieldValues, options?: { initialValues?: FieldValues }) => {
    const updates: UpdatePayload = {
      ...data,
      edited: true,
      title: data.filter,
      id: parseInt(data.id),
    };
    dispatch(updateTutorials([updates]));
    props.onSubmit?.(data, options);
  };

  const handleCancel = (id: number) => {
    const initialData = getInitialMutationData(id);
    if (!initialData || !initialData?.filter) return;
    const updates: UpdatePayload = {
      ...initialData,
      edited: true,
      title: initialData.filter,
      id: parseInt(initialData.id),
    };
    dispatch(updateTutorials([updates]));
    props.onCancel?.(id);
  };

  return (
    <div className={styles["root"]}>
      <Row>
        <Col lg={12}>
          <StaticForm
            entity={"filters" as StaticFormEntity}
            heading={source === "tutorialBanner" ? "Edit Tutorial" : "Edit Chapter"}
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

export default FiltersForm;
