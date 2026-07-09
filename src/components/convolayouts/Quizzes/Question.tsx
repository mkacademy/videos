import { Carousel } from "react-bootstrap";
import '../../../styles/indicators.module.css';
import * as quizStyles from '../../../styles/quiz.module.css';
import { dismissOption, setFollowupId } from "../../../store/slices/quizSlice";
import React, { useEffect, useMemo, useRef, useState } from 'react';
import LinkifiedText from '../../LinkifiedText';
import { placeholder } from "../../../utils";
import { Banner, SlideGroup } from '../../../store/slices/courseSlice';
import { Attempt, computeRanCombs, filterCombinationsForRandomizedType, getOptionsFromSlideGroup } from '../../../library/QuizUtils';
import { isValidDataUrl } from "../../views/Instruction";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../../store/types";
import OptionContent from './OptionContent';
import { HandleDismissParams } from "./Screen";
import QuizRouteToggleOs from './QuizRouteToggleOs';
import { layoutCellPointerHandlers } from '../../../library/Shortcuts_b';
const styleProps = {
  msSm5: quizStyles['ms-sm-5'],
  psSm5: quizStyles['ps-sm-5'],
  question: quizStyles["question"],
  options: quizStyles['options'],
  optionImageLayer: quizStyles['optionImageLayer'],
  checkmark: quizStyles["checkmark"],
  clearChoiceBtn: quizStyles["clearChoiceBtn"],
  clearChoiceBtnSubmitted: quizStyles["clearChoiceBtnSubmitted"],
  clearChoiceBtnNeedsResubmit: quizStyles["clearChoiceBtnNeedsResubmit"],
  dismissBtn: quizStyles["dismissBtn"],
  highlighted: quizStyles["highlighted"],
  highlighQuestion: quizStyles['highligh-question'],
  questionContainer: quizStyles['question-container'],
}

interface QuestionProps {
  slide: Banner;
  focus?: boolean;
  isShow: boolean;
  combs?: string[][];
  attempt?: string | null;
  choices: SlideGroup | undefined;
  submittedOptionIds?: string[];
  selector: (payload: { ids: number[] }) => void;
  chooser: (payload: { ids: string[]; isShow: boolean }) => void;
  dismisser: (params: HandleDismissParams) => void;
}

const optionsContainerCss = "ms-md-3 ms-sm-3 ps-md-5 ps-sm-3";
const isHighlight = `highligh-question ${styleProps.highlighQuestion}`;
const contCss = `question-container ${styleProps.questionContainer} mt-sm-5`;

const Question: React.FC<QuestionProps> = ({
  focus,
  isShow,
  choices,
  chooser,
  attempt,
  selector,
  dismisser,
  combs: combinations = [],
  submittedOptionIds = [],
  slide: { id: questionId = -1, quote = "", isHighlighted = false, isDismissed = false },
}) => {
  const dispatch = useDispatch();
  const identifier = "choice" + questionId;
  const isMaximumFeatures = useSelector((state: RootState) =>
    !state.settings.isUnzipCourses && !state.settings.isUnzipQuizzes && !state.settings.isUnzipTutorials);
  const randomizedType = useSelector((state: RootState) => state.settings.randomizedType);
  const choice = useRef<Record<string, string | null>>({ [identifier]: attempt ?? null });
  const latestMetaRef = useRef({ identifier, isShow, isDismissed, questionId });
  const contClass = isHighlighted ? (isHighlight + ' ' + contCss) : contCss;
  const processedOptions = useMemo(() => getOptionsFromSlideGroup(choices), [choices]);
  const displayCombinations = useMemo(
    () => filterCombinationsForRandomizedType(combinations, randomizedType),
    [combinations, randomizedType],
  );
  const [ranCombs, setRanCombs] = useState<number[]>([]);
  const dismissClickedRef = useRef(false);
  const optionsContainerRef = useRef<HTMLDivElement>(null);
  const [hasUnsavedChange, setHasUnsavedChange] = useState(false);

 

  useEffect(() => {
    choice.current = { [identifier]: attempt ?? null };
    // Whenever the persisted attempt changes, the UI is in sync again
    setHasUnsavedChange(false);
  }, [identifier, attempt]);
  useEffect(() => {
    setRanCombs(computeRanCombs(
      combinations,
      randomizedType,
      submittedOptionIds,
      attempt?.[identifier],
    ));
  }, [combinations, randomizedType, submittedOptionIds, attempt, identifier]);

  const dismissHandler = (e: React.MouseEvent) => {
    dismissClickedRef.current = true;
    e.preventDefault();
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
    const choiceToDismiss: Record<string, Attempt> = { [identifier]: { [identifier]: choice.current[identifier] } };
    setTimeout(() => dismisser({ id: questionId, isShow, choice: choiceToDismiss }));
  };

  const questionSelector = (e: React.MouseEvent<Element>) => {
    const clazz = (e?.target as HTMLElement)?.getAttribute("class");
    if (clazz && clazz === contClass) {
      setTimeout(() => selector({ ids: [questionId] }));
      e.nativeEvent.stopImmediatePropagation();
      e.stopPropagation();
      e.preventDefault();
    }
  };

  const isFocused = focus ? ` highlighted ${styleProps.highlighted}` : "";
  const checkmarkCss = focus ? `checkmark ${styleProps.checkmark} ${styleProps.highlighted}` : `checkmark ${styleProps.checkmark}`;

  // Always keep latest metadata and auth in refs without triggering renders
  latestMetaRef.current = { identifier, isShow, isDismissed, questionId };

  useEffect(() => {
    return () => {
      if (dismissClickedRef.current) return;
      const {
        identifier: idKey,
        isShow: latestIsShow,
        isDismissed: latestIsDismissed,
        questionId: latestQuestionId
      } =
        latestMetaRef.current;
      const currentChoice = choice.current?.[idKey];
      const selectedValue = currentChoice ? Object.values(currentChoice).pop() : undefined;
      if (selectedValue == null || selectedValue === '') return;
      dismisser({
        ids: [],
        id: latestQuestionId,
        isShow: latestIsShow,
        isDismissed: latestIsDismissed,
        choice: { [identifier]: { [identifier]: choice.current[identifier] } },
      });
    };
  }, []);

  const submittionSelector = (e: React.MouseEvent) => {
    const payload = { ids: ["choice" + questionId], isShow: !isFocused };
    e.nativeEvent.stopImmediatePropagation();
    setTimeout(() => chooser(payload));
    e.stopPropagation();
    e.preventDefault();
  };

  const attemptedValue = attempt ?? null;
  const hasSubmission = attemptedValue != null && attemptedValue !== '';
  const hasUnsyncedSubmissionChange = hasSubmission && hasUnsavedChange;

  const toggleChoiceHandler = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
    const currentValue = choice.current[identifier] ?? null;
    const isEqual =
      (attemptedValue == null || attemptedValue === '') &&
        (currentValue == null || currentValue === '')
        ? true
        : attemptedValue === currentValue;
    const choiceToDismiss: Record<string, Attempt> = isEqual ? { [identifier]: { [identifier]: null } }
      : { [identifier]: { [identifier]: choice.current[identifier] } };
    if (isEqual) dispatch(dismissOption({ choice: choiceToDismiss }));
    else dispatch(dismissOption({ choice: choiceToDismiss }));
    // After persisting via dismisser, treat state as synced again
    setHasUnsavedChange(false);
  };

  const hasUnsyncedSubmissionChangeClass = hasUnsyncedSubmissionChange ?
    styleProps.clearChoiceBtnNeedsResubmit : styleProps.clearChoiceBtnSubmitted;
  const clearChoiceBtnStateClass =
    hasSubmission
      ? hasUnsyncedSubmissionChangeClass
      : '';
  const openFollowupsHandler = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
    dispatch(setFollowupId(questionId));
  };

  return (
    <div {...layoutCellPointerHandlers(questionSelector)} className={contClass}>
      <span
        className={`clearChoiceBtn ${styleProps.clearChoiceBtn} ${clearChoiceBtnStateClass}`}
        onClick={toggleChoiceHandler}
      >
        o
      </span>
      <span
        className={`clearChoiceBtn ${styleProps.clearChoiceBtn}`}
        style={{ right: 0, left: 'auto' }}
        onClick={openFollowupsHandler}
      >
        o
      </span>
      {isMaximumFeatures && <span className={`dismissBtn ${styleProps.dismissBtn}`} onClick={dismissHandler}>
        x
      </span>}
      <div className={`question ms-sm-5 ps-sm-5 pt-2 ${styleProps.question} ${styleProps.msSm5} ${styleProps.psSm5}`}>
        <div onClick={submittionSelector} className="py-2 h5">
          <b>
            <LinkifiedText text={quote} />
          </b>
        </div>
        <div ref={optionsContainerRef} className={optionsContainerCss + isFocused} id="options">
          <Carousel
            key={`${attempt ?? ''}-${randomizedType}`}
            indicatorLabels={ranCombs.map(() => 'carousel-indicator')}
            controls={false}
            interval={null}
            touch={false}
            slide={false}
          >
            {ranCombs.map((random, i) => (
              <Carousel.Item key={i}>
                {(displayCombinations[random] ?? []).map((id: string) => {
                  const option = processedOptions.find(opt => opt.id === id) || { value: '' };
                  const hasImage = isValidDataUrl(option.value);
                  const imageUrl = hasImage ? option.value : placeholder;
                  return (
                    <label className={`options ${styleProps.options}`} key={id}>
                      <OptionContent
                        hasImage={hasImage}
                        imageUrl={imageUrl}
                        textValue={option.value}
                        placeholder={placeholder}
                        imageWrapperClassName={styleProps.optionImageLayer}
                      />
                      <input
                        value={id}
                        type="radio"
                        disabled={isShow}
                        name={identifier}
                        defaultChecked={attempt === id}
                        onChange={(e) => {
                          const newValue = e.target.value;
                          choice.current[e.target.name] = newValue;
                          // Mark as needing resubmission if there's an existing submission and user picked a different option
                          setHasUnsavedChange(hasSubmission && newValue !== attemptedValue);
                          const inputs = optionsContainerRef.current?.querySelectorAll<HTMLInputElement>(`input[name="${identifier}"]`) ?? [];
                          inputs.forEach((input) => { input.checked = input === e.target; });
                        }}
                      />
                      <span className={checkmarkCss}></span>
                    </label>
                  );
                })}
              </Carousel.Item>
            ))}
          </Carousel>
        </div>
      </div>
      <QuizRouteToggleOs view="question" bannerId={questionId} />
    </div>
  );
};

export default Question; 