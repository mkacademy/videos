import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../../store/types';
import {
  toggleQuizFollowupOptionsRoute,
  toggleQuizFollowupSubmissionRoute,
  toggleQuizQuestionOptionsRoute,
  toggleQuizQuestionSubmissionRoute,
} from '../../../library/actions';
import { getRouteToggleOState } from '../../../library/quizRouteMatcherUtils';
import * as quizStyles from '../../../styles/quiz.module.css';

const styleProps = {
  routeToggleBtn: quizStyles['routeToggleBtn'],
  routeToggleBtnActive: quizStyles['routeToggleBtnActive'],
  routeToggleBtnWarning: quizStyles['routeToggleBtnWarning'],
  routeToggleBtnLeft: quizStyles['routeToggleBtnLeft'],
  routeToggleBtnRight: quizStyles['routeToggleBtnRight'],
};

interface QuizRouteToggleOsProps {
  view: 'question' | 'followup';
  bannerId: number;
}

const stopPropagation = (e: React.MouseEvent) => {
  e.preventDefault();
  e.stopPropagation();
  e.nativeEvent.stopImmediatePropagation();
};

const buildToggleClass = (
  base: string,
  positionClass: string,
  oState: 'white' | 'green' | 'orange',
): string => {
  const stateClass = oState === 'green'
    ? styleProps.routeToggleBtnActive
    : oState === 'orange'
      ? styleProps.routeToggleBtnWarning
      : '';
  return `${base} ${positionClass} ${stateClass}`.trim();
};

const QuizRouteToggleOs: React.FC<QuizRouteToggleOsProps> = ({ view, bannerId }) => {
  const dispatch = useDispatch();
  const { routeToggleGreenIds, routeToggleOrangeMarks, routeTogglePrimarySide } = useSelector(
    (state: RootState) => state.quiz,
  );

  const leftState = getRouteToggleOState(
    bannerId, view, 'left', routeToggleGreenIds, routeToggleOrangeMarks, routeTogglePrimarySide,
  );
  const rightState = getRouteToggleOState(
    bannerId, view, 'right', routeToggleGreenIds, routeToggleOrangeMarks, routeTogglePrimarySide,
  );

  const leftHandler = (e: React.MouseEvent) => {
    stopPropagation(e);
    dispatch(
      view === 'question'
        ? toggleQuizQuestionSubmissionRoute({ bannerId })
        : toggleQuizFollowupSubmissionRoute({ bannerId }),
    );
  };

  const rightHandler = (e: React.MouseEvent) => {
    stopPropagation(e);
    dispatch(
      view === 'question'
        ? toggleQuizQuestionOptionsRoute({ bannerId })
        : toggleQuizFollowupOptionsRoute({ bannerId }),
    );
  };

  const leftClass = buildToggleClass(styleProps.routeToggleBtn, styleProps.routeToggleBtnLeft, leftState);
  const rightClass = buildToggleClass(styleProps.routeToggleBtn, styleProps.routeToggleBtnRight, rightState);

  return (
    <>
      <span className={leftClass} onClick={leftHandler} role="button" aria-label="Toggle submission route">
        o
      </span>
      <span className={rightClass} onClick={rightHandler} role="button" aria-label="Toggle options route">
        o
      </span>
    </>
  );
};

export default QuizRouteToggleOs;
