import React, { useEffect, useRef } from "react";
import { Row, Col } from "react-bootstrap";
import { FieldValues } from "react-hook-form";
import { useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../store";
import StaticForm, { StaticFormEntity } from "./StaticForm";
import {
  getSlideGroupItemsForBanner,
  getSlideGroupItemsForBannerIds,
  getSlideItemsForBanner,
  getSlideItemsForPennantIds,
  instructionDefaults,
  getInitialMutationData,
  hasMutationData,
} from "./formulatorUtils";
import * as styles from "../../styles/comments.module.css";
import FormErrorMessage from "./FormErrorMessage";
import { updateSteps, UpdatePayload, persistSteps } from "../../library/actions";
import { Content } from "../../store/slices/tutorialSlice";
import { SlideGroupItem } from "../../store/slices/courseSlice";
import { editsMessage } from "../../utils";
import { UpdateTextsPayload } from "../../store/slices/textSlice";

export interface InstructionsFormProps {
  onCancel?: (id: number) => void;
  onSubmit?: (data: FieldValues, options?: { initialValues?: FieldValues }) => void;
  source: "courseSlideGroupItems" | "courseSlides" | "tutorialContent" | "quizSlides" | "quizSlideGroupItems";
  onSave?: (id: number) => void;
  singleItemFormVisible: boolean;
}

import { fileToDataUrl } from "../../library/directoryTreeUtils";

const InstructionsForm: React.FC<InstructionsFormProps> = (props) => {
  const dispatch = useDispatch();
  const { pathname } = useLocation();
  const isSavingEdits = useSelector((state: RootState) =>
    state.view.requestIsProcessing && state.view.message === editsMessage);
  const dismissals = useSelector((state: RootState) => state.session.dismissals);
  const singleItemForms = useSelector((state: RootState) => state.session.singleItemForms) ?? {};
  const tutorialSelected = useSelector((state: RootState) => state.tutorial.selected);
  const tutorialBanners = useSelector((state: RootState) => state.tutorial.banners);
  const tutorialContent = useSelector((state: RootState) => state.tutorial.content);
  const courseSelected = useSelector((state: RootState) => state.course.selected);
  const courseBanners = useSelector((state: RootState) => state.course.banners);
  const courseContent = useSelector((state: RootState) => state.course.content);
  const quizSelected = useSelector((state: RootState) => state.quiz.selected);
  const quizFollowupId = useSelector((state: RootState) => state.quiz.followupId);
  const quizQuizzes = useSelector((state: RootState) => state.quiz.quizzes);
  const quizBanners = useSelector((state: RootState) => state.quiz.banners);
  const quizContent = useSelector((state: RootState) => state.quiz.content);
  const prevIsSavingEditsRef = useRef(false);

  const dismissed = dismissals[pathname] ?? false;

  const items = ((): { title: string; content: string; imageurl?: string; isDismissed: boolean }[] => {
    if (props.source === "courseSlideGroupItems") {
      if (courseSelected === -1) return [];
      const banner = courseBanners[courseSelected];
      return getSlideGroupItemsForBanner(courseContent, banner?.id);
    }
    if (props.source === "courseSlides") {
      if (courseSelected === -1) return [];
      const banner = courseBanners[courseSelected];
      return getSlideItemsForBanner(courseContent, banner?.id);
    }
    if (props.source === "tutorialContent") {
      if (tutorialSelected === -1) return [];
      const banner = tutorialBanners[tutorialSelected];
      return tutorialContent
        .filter((slides) => slides[0]?.bannerId === banner?.id)
        .flat();
    }
    if (props.source === "quizSlideGroupItems") {
      if (quizSelected === -1) return [];
      const quiz = quizQuizzes[quizSelected];
      const bannerIds = quizBanners
        .filter((b) => b.bannerId === quiz?.id)
        .map((b) => b.id);
      return getSlideGroupItemsForBannerIds(quizContent, bannerIds);
    }
    if (props.source === "quizSlides") {
      if (quizSelected === -1 || quizFollowupId === undefined) return [];
      const quiz = quizQuizzes[quizSelected];
      const parent = quizBanners.find((b) => b.id === quizFollowupId);
      if (!parent || parent.bannerId !== quiz?.id) return [];
      const pennantIds = parent.pennants.map((p) => p.id);
      return getSlideItemsForPennantIds(quizContent, pennantIds);
    }
    return [];
  })();
  const specialCase = props.source === "quizSlideGroupItems" || props.source === "quizSlides"

  const single =
    items.length === 1
      ? (() => {
        if (props.source === "tutorialContent") {
          if (tutorialSelected === -1) return null;
          return props.singleItemFormVisible !== false ? items[0] : null;
        }
        else if (props.source === "courseSlideGroupItems" || props.source === "courseSlides") {
          if (courseSelected === -1) return null;
          return props.singleItemFormVisible !== false ? items[0] : null;
        }
        else if (props.source === "quizSlideGroupItems" || props.source === "quizSlides") {
          if (quizSelected === -1) return null;
          if (props.source === "quizSlides" && quizFollowupId === undefined) return null;
          return items[0]?.isDismissed === !dismissed ? items[0] : null;
        }
        return null;
      })()
      : (() => {
        if (props.source === "tutorialContent" && tutorialSelected === -1) return null;
        else if (
          (props.source === "courseSlideGroupItems" || props.source === "courseSlides") &&
          courseSelected === -1
        ) {
          return null;
        }
        else if (
          (props.source === "quizSlideGroupItems" || props.source === "quizSlides") &&
          (quizSelected === -1 || (props.source === "quizSlides" && quizFollowupId === undefined))
        ) {
          return null;
        }
        const inverseDismissed = specialCase
          ? !dismissed : dismissed;
        const newDismissal = inverseDismissed ? !dismissed : dismissed;
        const matching = items.filter((item) => item.isDismissed === newDismissal);
        return matching.length === 1 ? matching[0] : null;
      })();

  const isSingleFormEnabled = singleItemForms[`${pathname}:${props.source}`] ?? true;

  useEffect(() => {
    const wasProcessing = prevIsSavingEditsRef.current;
    const singleId = single != null ? (single as { id?: number }).id : undefined;
    if (wasProcessing && !isSavingEdits && single != null && singleId != null) {
      if (!hasMutationData(singleId)) {
        const updates: UpdateTextsPayload = { id: String(singleId), modified: false };
        dispatch(persistSteps([updates]));
      }
    }
    prevIsSavingEditsRef.current = isSavingEdits;
  }, [isSavingEdits, single, dispatch]);

  if (!single || !isSingleFormEnabled ) return null;
  const { owner, metadata } = single as Partial<Content> | Partial<SlideGroupItem>;
  const hasOwnership = owner ?? metadata?.owner;

  if (!hasOwnership) return <FormErrorMessage><p>You do not have permission to edit this item.</p></FormErrorMessage>;

  const defaultValues = instructionDefaults({
    title: single.title,
    content: single.content,
    imageurl: single.imageurl ?? "",
    id: (single as { id?: number }).id,
    bannerId: (single as { bannerId?: number }).bannerId,
  });

  const handleSubmitWithFile = async (data: FieldValues, options?: { initialValues?: FieldValues }) => {
    const nextData: FieldValues = { ...data };

    // For InstructionsForm we only care about converting the image file (if any).
    const rawImageInput = (data as Record<string, unknown>)["imageurl"] as
      | FileList
      | File
      | string
      | undefined;

    if (rawImageInput && typeof rawImageInput === "object") {
      const maybeFile =
        "item" in rawImageInput && typeof rawImageInput.item === "function"
          ? rawImageInput.item(0)
          : rawImageInput;

      if (maybeFile instanceof File) {
        try {
          nextData["imageurl"] = await fileToDataUrl(maybeFile);
        } catch (error) {
          // Fallback to empty string on failure; caller can decide how to handle.
          // eslint-disable-next-line no-console
          console.warn("Failed to read instruction image file", error);
          nextData["imageurl"] = "";
        }
      }
    }

    const updates: UpdatePayload = {
      ...nextData,
      edited: true,
      id: parseInt(nextData.id),
      title: nextData.instruction,
    };
    dispatch(updateSteps([updates]));

    props.onSubmit?.(nextData, options);
  };
  const handleCancel = (id: number) => {
    const initialData = getInitialMutationData(id);
    if (!initialData) return;
    const updates: UpdatePayload = {
      ...initialData,
      edited: true,
      title: initialData.instruction,
      id: parseInt(initialData.id),
    };
    dispatch(updateSteps([updates]));
    props.onCancel?.(id);
  };

  return (
    <div className={styles["root"]}>
      <Row>
        <Col lg={12}>
          <StaticForm
            entity={"instructions" as StaticFormEntity}
            heading="Edit Instruction"
            defaultValues={defaultValues}
            onSubmit={handleSubmitWithFile}
            onCancel={handleCancel}
            onSave={props.onSave}
          />
        </Col>
      </Row>
    </div>
  );
};

export default InstructionsForm;
