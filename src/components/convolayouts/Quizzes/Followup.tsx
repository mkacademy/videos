import { Carousel } from "react-bootstrap";
import '../../../styles/indicators.module.css';
import * as quizStyles from '../../../styles/quiz.module.css';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Attempt, dismissFollowupOption, setFollowupId } from '../../../store/slices/quizSlice';
import { Pennant, SlideItem } from '../../../store/slices/courseSlice';
import { RootState } from '../../../store/types';
import { getOptionsFromSlideItems, computeRanCombs, filterCombinationsForRandomizedType } from '../../../library/QuizUtils';
import { isValidDataUrl } from '../../views/Instruction';
import LinkifiedText from '../../LinkifiedText';
import { placeholder } from '../../../utils';
import OptionContent from './OptionContent';
import { layoutCellPointerHandlers } from '../../../library/Shortcuts_b';
import QuizRouteToggleOs from './QuizRouteToggleOs';

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
};

interface FollowupProps {
  pennant: Pennant;
  dismissed: boolean;
  focus?: boolean;
  attemptValue?: string | null;
  combs?: string[][];
  slideItems: SlideItem[];
  submittedOptionIds: string[];
  chooser: (params: { ids: string[]; isShow: boolean }) => void;
  selector: (params: { ids: number[] }) => void;
  dismisser: (params: { id: number; isShow: boolean; choice?: Record<string, Attempt>; isDismissed?: boolean; ids?: number[] }) => void;
}
const optionsContainerCss = "ms-md-3 ms-sm-3 ps-md-5 ps-sm-3";
const isHighlight = `highligh-question ${styleProps.highlighQuestion}`;
const contCss = `question-container ${styleProps.questionContainer} mt-sm-5`;

const Followup: React.FC<FollowupProps> = ({
  pennant,
  dismissed,
  focus,
  slideItems,
  combs = [],
  attemptValue,
  submittedOptionIds,
  chooser,
  selector,
  dismisser,
}) => {
  const { id: questionId = -1, quote = "", isHighlighted = false, isDismissed = false } = pennant;
  const identifier = "choice" + questionId;
  const isMaximumFeatures = useSelector((state: RootState) =>
    !state.settings.isUnzipCourses && !state.settings.isUnzipQuizzes && !state.settings.isUnzipTutorials);
  const randomizedType = useSelector((state: RootState) => state.settings.randomizedType);
  const choice = useRef<Record<string, string | null>>({ [identifier]: attemptValue ?? null });
  const latestMetaRef = useRef({ identifier, isShow: dismissed, isDismissed, questionId });
  const contClass = isHighlighted ? (isHighlight + ' ' + contCss) : contCss;
  const processedOptions = useMemo(() => getOptionsFromSlideItems(slideItems), [slideItems]);
  const displayCombinations = useMemo(
    () => filterCombinationsForRandomizedType(combs, randomizedType),
    [combs, randomizedType],
  );
  const [ranCombs, setRanCombs] = useState<number[]>([]);
  const dismissClickedRef = useRef(false);
  const optionsContainerRef = useRef<HTMLDivElement>(null);
  const [hasUnsavedChange, setHasUnsavedChange] = useState(false);
  const dispatch = useDispatch();
  useEffect(() => {
    choice.current = { [identifier]: attemptValue ?? null };
    setHasUnsavedChange(false);
  }, [identifier, attemptValue]);

  useEffect(() => {
    setRanCombs(computeRanCombs(
      combs,
      randomizedType,
      submittedOptionIds,
      attemptValue,
    ));
  }, [combs, randomizedType, submittedOptionIds, attemptValue]);

  latestMetaRef.current = { identifier, isShow: dismissed, isDismissed, questionId };

  useEffect(() => {
    return () => {
      if (dismissClickedRef.current) return;
      const {
        identifier: idKey,
        isShow: latestIsShow,
        isDismissed: latestIsDismissed,
        questionId: latestQuestionId,
      } = latestMetaRef.current;
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
  }, [dismisser, identifier]);

  const dismissHandler = (e: React.MouseEvent) => {
    dismissClickedRef.current = true;
    e.preventDefault();
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
    setTimeout(() => dismisser({ id: questionId, isShow: dismissed, choice: { [identifier]: { [identifier]: choice.current[identifier] } } }));
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

  const submittionSelector = (e: React.MouseEvent) => {
    const payload = { ids: ["choice" + questionId], isShow: !isFocused };
    e.nativeEvent.stopImmediatePropagation();
    setTimeout(() => chooser(payload));
    e.stopPropagation();
    e.preventDefault();
  };

  const attemptedValue = attemptValue ?? null;
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
    if (isEqual) dispatch(dismissFollowupOption({ choice: choiceToDismiss }));
    else dispatch(dismissFollowupOption({ choice: choiceToDismiss }));
    setHasUnsavedChange(false);
  };

  const exitFollowupsHandler = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
    dispatch(setFollowupId(undefined));
  };

  const clearChoiceBtnStateClass =
    hasSubmission
      ? (hasUnsyncedSubmissionChange ? styleProps.clearChoiceBtnNeedsResubmit : styleProps.clearChoiceBtnSubmitted)
      : '';

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
        onClick={exitFollowupsHandler}
        role="button"
        aria-label="Back to questions"
      >
        ←
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
            key={`${attemptValue ?? ''}-${randomizedType}`}
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
                        disabled={dismissed}
                        name={identifier}
                        defaultChecked={attemptValue === id}
                        onChange={(e) => {
                          const newValue = e.target.value;
                          choice.current[e.target.name] = newValue;
                          setHasUnsavedChange(hasSubmission && newValue !== attemptedValue);
                          const inputs = optionsContainerRef.current?.querySelectorAll<HTMLInputElement>(`input[name="${identifier}"]`) ?? [];
                          inputs.forEach((input: HTMLInputElement) => { input.checked = input === e.target; });
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
      <QuizRouteToggleOs view="followup" bannerId={questionId} />
    </div>
  );
};

export default Followup;
