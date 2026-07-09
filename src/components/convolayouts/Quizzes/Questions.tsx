import React, { useCallback } from 'react';
import Question from './Question';
import { Submition } from '../../../store/slices/quizSlice';
import { Banner, SlideGroup, SlideGroupItem } from '../../../store/slices/courseSlice';
import { getChoices } from '../../../library/quizAttemptManager';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../../store';
import { highlightAttemptBreathSelection } from '../../../store/slices/quizSlice';
import { QuizQuestionTreeSelection } from '../../../library/actions';
import { HandleDismissParams } from './Screen';

interface QuestionsProps {
  visible: Banner[];
  dismissed: boolean;
  pennants: Submition[];
  onRouterSelection?: () => void;
  handleDismissQuestion: (params: HandleDismissParams) => void;
}

const contPred =
  (banner: Banner) =>
    (slideGroup: SlideGroup) =>
      Object.values(slideGroup).some((item: SlideGroupItem) => item.bannerId === banner?.id);

const Questions: React.FC<QuestionsProps> = ({
  visible,
  dismissed,
  pennants,
  onRouterSelection,
  handleDismissQuestion,
}) => {
  const dispatch = useDispatch();
  const focus = useSelector((state: RootState) => state.quiz.focus);
  const content = useSelector((state: RootState) => state.quiz.content);
  const attempt = useSelector((state: RootState) => state.quiz.attempt);
  const combinations = useSelector((state: RootState) => state.quiz.combinations);

  const handleHighlightAttempt = useCallback((params: { ids: string[] }) => {
    onRouterSelection?.();
    dispatch(highlightAttemptBreathSelection({ ids: params.ids }));
  }, [dispatch, onRouterSelection]);

  const handleHighlightQuestion = useCallback((params: { ids: number[] }) => {
    onRouterSelection?.();
    dispatch(QuizQuestionTreeSelection({ ids: params.ids, }));
  }, [dispatch, onRouterSelection]);

  const getSubmittedOptionIdsForQuestion = useCallback((question: Banner): string[] => {
    const ids = new Set<string>();
    const questionId = question.id;
    const attemptForQuestion = attempt[`choice${questionId}`];
    if (attemptForQuestion) {
      const pred = (v: string | null | undefined): v is string => v != null && v !== '';
      Object.values(attemptForQuestion).filter(pred).forEach((v) => ids.add(v));
    }
    const pred = (p: Submition) => p.bannerId === question.bannerId;
    pennants
      .filter(pred)
      .map(getChoices)
      .forEach((choices) => {
        const pred = (v: string | null | undefined): v is string => v != null && v !== '';
        Object.values(choices).flat().filter(pred).forEach((v) => ids.add(v));
      });
    return Array.from(ids);
  }, [attempt, pennants]);

  return (
    <React.Fragment>
      {visible.map((question) => (
        <Question
          slide={question}
          key={question.id}
          isShow={dismissed}
          dismisser={handleDismissQuestion}
          chooser={handleHighlightAttempt}
          selector={handleHighlightQuestion}
          focus={focus[`choice${question.id}`]}
          choices={content.find(contPred(question))}
          combs={combinations[content.findIndex(contPred(question))]}
          attempt={attempt[`choice${question.id}`]?.[`choice${question.id}`]}
          submittedOptionIds={getSubmittedOptionIdsForQuestion(question)}
        />
      ))}
    </React.Fragment>
  );
};

export default Questions;
