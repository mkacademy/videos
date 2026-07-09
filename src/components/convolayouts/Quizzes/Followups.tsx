import React, { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Followup from './Followup';
import { RootState } from '../../../store';
import { Banner, Pennant, SlideItem } from '../../../store/slices/courseSlice';
import { Submition, highlightAttemptBreathSelection } from '../../../store/slices/quizSlice';
import { QuizQuestionTreeSelection } from '../../../library/actions';
import { getChoices } from '../../../library/quizAttemptManager';
import { HandleDismissParams } from './Screen';

interface FollowupsProps {
  parent: Banner;
  visible: Pennant[];
  dismissed: boolean;
  quizPennants: Submition[];
  onRouterSelection?: () => void;
  handleDismissQuestion: (params: HandleDismissParams) => void;
}

const getPennantSlideItems = (content: RootState['quiz']['content'], pennantId: number): SlideItem[] => {
  const group = content.find((g) => g.slides?.some((row) => row[0]?.bannerId === pennantId));
  if (!group || !group.slides) return [];
  const rows = group.slides.filter((row) => row[0]?.bannerId === pennantId);
  if (rows.length === 0) return [];
  return rows.flat();
};

const Followups: React.FC<FollowupsProps> = ({
  parent,
  visible,
  dismissed,
  quizPennants,
  onRouterSelection,
  handleDismissQuestion,
}) => {
  const dispatch = useDispatch();
  const focus = useSelector((state: RootState) => state.quiz.focus);
  const content = useSelector((state: RootState) => state.quiz.content);
  const attempt = useSelector((state: RootState) => state.quiz.attempt);
  const followupCombinations = useSelector((state: RootState) => state.quiz.followupCombinations);

  const handleHighlightAttempt = useCallback((params: { ids: string[]; isShow: boolean }) => {
    onRouterSelection?.();
    dispatch(highlightAttemptBreathSelection({ ids: params.ids, isShow: params.isShow }));
  }, [dispatch, onRouterSelection]);

  const handleHighlightQuestion = useCallback((params: { ids: number[] }) => {
    onRouterSelection?.();
    dispatch(QuizQuestionTreeSelection({ ids: params.ids }));
  }, [dispatch, onRouterSelection]);

  const getSubmittedOptionIdsForPennant = useCallback((pennantId: number, quizId: number): string[] => {
    const ids = new Set<string>();
    const attemptForPennant = attempt[`choice${pennantId}`];
    if (attemptForPennant) {
      const pred = (v: string | null | undefined): v is string => v != null && v !== '';
      Object.values(attemptForPennant).filter(pred).forEach((v) => ids.add(v));
    }
    const pred = (p: Submition) => p.bannerId === quizId;
    quizPennants
      .filter(pred)
      .map(getChoices)
      .forEach((choices) => {
        const pred = (v: string | null | undefined): v is string => v != null && v !== '';
        Object.values(choices).flat().filter(pred).forEach((v) => ids.add(v));
      });
    return Array.from(ids);
  }, [attempt, quizPennants]);

  return (
    <React.Fragment>
      {visible.map((followup) => {
        return (
          <Followup
            key={followup.id}
            pennant={followup}
            dismissed={dismissed}
            dismisser={handleDismissQuestion}
            chooser={handleHighlightAttempt}
            selector={handleHighlightQuestion}
            focus={focus[`choice${followup.id}`]}
            combs={followupCombinations[followup.id] ?? []}
            slideItems={getPennantSlideItems(content, followup.id)}
            attemptValue={attempt[`choice${followup.id}`]?.[`choice${followup.id}`]}
            submittedOptionIds={getSubmittedOptionIdsForPennant(followup.id, parent.bannerId ?? -1)}
          />
        );
      })}
    </React.Fragment>
  );
};

export default Followups;
