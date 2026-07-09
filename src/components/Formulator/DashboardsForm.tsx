import React, { useEffect, useRef } from "react";
import { Col, Row } from "react-bootstrap";
import { FieldValues } from "react-hook-form";
import { useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../store";
import StaticForm, { StaticFormEntity } from "./StaticForm";
import { dashboardDefaults, getInitialMutationData, hasMutationData } from "./formulatorUtils";
import * as styles from "../../styles/comments.module.css";
import FormErrorMessage from "./FormErrorMessage";
import { UpdatePayload, updateQuizzes, persistQuizzes } from "../../library/actions";
import { Quiz } from "../../store/slices/quizSlice";
import { editsMessage } from "../../utils";
import { UpdateTextsPayload } from "../../store/slices/textSlice";

export interface DashboardsFormProps {
  onSubmit?: (data: FieldValues, options?: { initialValues?: FieldValues }) => void;
  onCancel?: (id: number) => void;
  onSave?: (id: number) => void;
  source?: "quizzes";
  singleItemFormVisible: boolean;  
}

const DashboardsForm: React.FC<DashboardsFormProps> = (props) => {
  const dispatch = useDispatch();
  const { pathname } = useLocation();
  const isSavingEdits = useSelector((state: RootState) =>
    state.view.requestIsProcessing && state.view.message === editsMessage);
  const quizzes = useSelector((state: RootState) => state.quiz.quizzes);
  const quizSelected = useSelector((state: RootState) => state.quiz.selected);
  const dismissals = useSelector((state: RootState) => state.session.dismissals);
  const singleItemForms = useSelector((state: RootState) => state.session.singleItemForms) ?? {};
  const prevIsSavingEditsRef = useRef(false);
  const dismissed = dismissals[pathname] ?? false;
  const source = props.source ?? "quizzes";

  const handleSubmit = (data: FieldValues, options?: { initialValues?: FieldValues }) => {
    const updates: UpdatePayload = {
      ...data,
      edited: true,
      title: data.dashboard,
      id: parseInt(data.id),
    };
    dispatch(updateQuizzes([updates]));
    props.onSubmit?.(data, options);
  };

  const handleCancel = (id: number) => {
    const initialData = getInitialMutationData(id);
    if (!initialData || !initialData?.dashboard) return;
    const updates: UpdatePayload = {
      ...initialData,
      edited: true,
      title: initialData.dashboard,
      id: parseInt(initialData.id),
    };
    dispatch(updateQuizzes([updates]));
    props.onCancel?.(id);
  };



  const items = source === "quizzes" ? quizzes : [];
  const single =
    items.length === 1
      ? (() => {
        if (quizSelected > -1) return null;
        return props.singleItemFormVisible !== false ? items[0] : null;
      })()
      : (() => {
        if (quizSelected > -1) return null;
        const matching = items.filter((item) => item.isDismissed === dismissed);
        return matching.length === 1 ? matching[0] : null;
      })();

  const entityKey = "quizzes";
  const isSingleFormEnabled = singleItemForms[`${pathname}:${entityKey}`] ?? true;

  useEffect(() => {
    const wasProcessing = prevIsSavingEditsRef.current;
    if (wasProcessing && !isSavingEdits && single != null && single.id != null) {
      if (!hasMutationData(single.id)) {
        const updates: UpdateTextsPayload = { id: String(single.id), modified: false };
        dispatch(persistQuizzes([updates]));
      }
    }
    prevIsSavingEditsRef.current = isSavingEdits;
  }, [isSavingEdits, single, dispatch]);

  if (!single || !isSingleFormEnabled) return null;

  const { owner, metadata } = single as Partial<Quiz>;
  const hasOwnership = owner ?? metadata?.owner;

  if (!hasOwnership) return <FormErrorMessage><p>You do not have permission to edit this item.</p></FormErrorMessage>;


  const defaultValues = dashboardDefaults(single);
  return (
    <div className={styles["root"]}>
      <Row>
        <Col lg={12}>
          <StaticForm
            entity={"dashboards" as StaticFormEntity}
            heading="Edit Quiz"
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

export default DashboardsForm;
