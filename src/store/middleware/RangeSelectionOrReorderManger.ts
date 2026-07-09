import { Middleware } from '@reduxjs/toolkit';
import { RootState } from '../index';
import { setAltKeyDown, setCtrlKeyDown, setShiftKeyDown } from '../slices/settingsSlice';
import {
  highlightSlideBreathSelection,
  highlightCoversBreathSelection,
  highlightCourseBreathSelection,
  highlightPennantBreathSelection,
  highlightPennantDepthSelection,
  highlightCourseDepthSelection,
  setShiftHighlightStartIdLane as setCourseShiftHighlightStartIdLane,
  resetShiftHighlightStartId as resetCourseShiftHighlightStartId,
  reOrderSlideSelection,
  reOrderCoversSelection,
  reOrderCourseSelection,
  reOrderPennantSelection,
} from '../slices/courseSlice';
import type { CourseStartId } from '../slices/courseSlice';
import {
  highlightTutorialBreathSelection,
  highlightTutorialDepthSelection,
  highlightContentBreathSelection,
  setShiftHighlightStartIdLane as setTutorialShiftHighlightStartIdLane,
  resetShiftHighlightStartId as resetTutorialShiftHighlightStartId,
  reOrderTutorialSelection,
  reOrderContentSelection,
} from '../slices/tutorialSlice';
import type { TutorialStartId } from '../slices/tutorialSlice';
import {
  highlightQuizBreathSelection,
  highlightQuizDepthSelection,
  highlightAttemptBreathSelection,
  highlightQuestionBreathSelection,
  highlightQuestionDepthSelection,
  setShiftHighlightStartIdLane as setQuizShiftHighlightStartIdLane,
  resetShiftHighlightStartId as resetQuizShiftHighlightStartId,
  reOrderQuizSelection,
  reOrderQuestionSelection,
} from '../slices/quizSlice';
import type { QuizStartId } from '../slices/quizSlice';
import {
  outlineTutor,
  outlineOutgoing,
  outlineIncoming,
  setShiftHighlightStartIdLane as setCommsShiftHighlightStartIdLane,
  resetShiftHighlightStartId as resetCommsShiftHighlightStartId,
  reOrderTutors,
  reOrderOutgoing,
  reOrderIncoming,
  type CommsStartId,
} from '../slices/commsSlice';
import {
  clearCourseHighlightStartLanes,
  clearQuizBreathDepthPairedStartAnchors,
  clearQuizQuestionBreathDepthPairedStartAnchors,
  clearTutorialBreathDepthStartAnchors,
  commsOutlineEndpointTypesDiffer,
  expandCommsOutlineRange,
  expandCourseHighlightRange,
  expandQuizHighlightRange,
  expandTutorialHighlightRange,
  extractSingleNumericPayloadId,
  extractSingleQuizHighlightRawId,
  extractSingleStringPayloadId,
  ordinalModifierRangeFlags,
  resolveCourseCtrlAltOrdinalLaneEffect,
  resolveCourseShiftOrdinalHighlightEffect,
  resolveQuizCtrlAltOrdinalBreathDepthEffect,
  resolveTutorialCtrlAltOrdinalEffect,
} from './RangeSelectionOrReorderMangerUtils';
import { prependError } from '../slices/errorSlice';
import { getCurAppName } from '../../utils';

const COURSE_HIGHLIGHT_ACTIONS = [
  highlightSlideBreathSelection,
  highlightCoversBreathSelection,
  highlightCourseBreathSelection,
  highlightPennantBreathSelection,
  highlightPennantDepthSelection,
  highlightCourseDepthSelection,
] as const;

const TUTORIAL_HIGHLIGHT_ACTIONS = [
  highlightTutorialBreathSelection,
  highlightTutorialDepthSelection,
  highlightContentBreathSelection,
] as const;

const QUIZ_HIGHLIGHT_ACTIONS = [
  highlightQuizBreathSelection,
  highlightQuizDepthSelection,
  highlightAttemptBreathSelection,
  highlightQuestionBreathSelection,
  highlightQuestionDepthSelection,
] as const;

const COMMS_OUTLINE_ACTIONS = [outlineTutor, outlineOutgoing, outlineIncoming] as const;

function courseLaneFromHighlight(action: unknown): keyof CourseStartId | undefined {
  if (highlightSlideBreathSelection.match(action)) return 'slideBreath';
  if (highlightCoversBreathSelection.match(action)) return 'coversBreath';
  if (highlightCourseBreathSelection.match(action)) return 'courseBreath';
  if (highlightPennantBreathSelection.match(action)) return 'pennantBreath';
  if (highlightPennantDepthSelection.match(action)) return 'pennantDepth';
  if (highlightCourseDepthSelection.match(action)) return 'courseDepth';
  return undefined;
}

function tutorialLaneFromHighlight(action: unknown): keyof TutorialStartId | undefined {
  if (highlightTutorialBreathSelection.match(action)) return 'tutorialBreath';
  if (highlightTutorialDepthSelection.match(action)) return 'tutorialDepth';
  if (highlightContentBreathSelection.match(action)) return 'contentBreath';
  return undefined;
}

function quizLaneFromHighlight(action: unknown): keyof QuizStartId | undefined {
  if (highlightQuizBreathSelection.match(action)) return 'quizBreath';
  if (highlightQuizDepthSelection.match(action)) return 'quizDepth';
  if (highlightAttemptBreathSelection.match(action)) return 'attemptBreath';
  if (highlightQuestionBreathSelection.match(action)) return 'questionBreath';
  if (highlightQuestionDepthSelection.match(action)) return 'questionDepth';
  return undefined;
}

function commsLaneFromOutline(action: unknown): keyof CommsStartId | undefined {
  if (outlineTutor.match(action)) return 'tutorOutline';
  if (outlineOutgoing.match(action)) return 'outgoingOutline';
  if (outlineIncoming.match(action)) return 'incomingOutline';
  return undefined;
}

const RangeSelectionOrReorderManger: Middleware<{}, RootState> =
  ({ getState, dispatch }) =>
    (next) =>
      (action) => {
        if (setShiftKeyDown.match(action)
          || setCtrlKeyDown.match(action)
          || setAltKeyDown.match(action)) {
          if (action.payload === false) {
            dispatch(resetCourseShiftHighlightStartId());
            dispatch(resetTutorialShiftHighlightStartId());
            dispatch(resetQuizShiftHighlightStartId());
            dispatch(resetCommsShiftHighlightStartId());
          }
          return next(action);
        }

        const state = getState();
        const { shiftOrdinalRange, ctrlOrdinalRange, altOrdinalRange } = ordinalModifierRangeFlags({
          editMode: state.settings.editMode,
          shiftKeyDown: state.settings.shiftKeyDown,
          ctrlKeyDown: state.settings.ctrlKeyDown,
          altKeyDown: state.settings.altKeyDown,
        });

        for (const matcher of TUTORIAL_HIGHLIGHT_ACTIONS) {
          if (matcher.match(action)) {
            const id = extractSingleNumericPayloadId(action);
            const lane = id !== null ? tutorialLaneFromHighlight(action) : undefined;
            if (id !== null && lane !== undefined) {
              if (shiftOrdinalRange) {
                const cur = state.tutorial.startId[lane];
                if (cur === null || cur === id) {
                  return next(setTutorialShiftHighlightStartIdLane({ lane, id }));
                }
                const { ids: expanded } = expandTutorialHighlightRange(state.tutorial, lane, cur, id);
                dispatch(setTutorialShiftHighlightStartIdLane({ lane, id: null }));
                return next({
                  ...action,
                  payload: { ...(action as { payload: Record<string, unknown> }).payload, ids: expanded },
                });
              } else if (ctrlOrdinalRange) {
                const r = resolveTutorialCtrlAltOrdinalEffect('ctrl', state.tutorial, lane, id);
                if (r.tag === 'set_anchor') {
                  return next(setTutorialShiftHighlightStartIdLane(r));
                } else if (r.tag === 'ctrl_reorder_tutorial') {
                  clearTutorialBreathDepthStartAnchors((p) =>
                    dispatch(setTutorialShiftHighlightStartIdLane(p)),
                  );
                  return next(reOrderTutorialSelection({ ids: r.ids, direction: r.direction }));
                } else if (r.tag === 'ctrl_reorder_content') {
                  dispatch(setTutorialShiftHighlightStartIdLane({ lane: 'contentBreath', id: null }));
                  return next(reOrderContentSelection({ ids: r.ids, direction: r.direction }));
                }
              } else if (altOrdinalRange) {
                const r = resolveTutorialCtrlAltOrdinalEffect('alt', state.tutorial, lane, id);
                if (r.tag === 'set_anchor') {
                  return next(setTutorialShiftHighlightStartIdLane(r));
                } else if (r.tag === 'alt_reorder_tutorial') {
                  clearTutorialBreathDepthStartAnchors((p) =>
                    dispatch(setTutorialShiftHighlightStartIdLane(p)),
                  );
                  return next(
                    reOrderTutorialSelection({
                      ids: r.ids,
                      direction: r.direction,
                      groupReorder: true,
                    }),
                  );
                } else if (r.tag === 'alt_reorder_content') {
                  dispatch(setTutorialShiftHighlightStartIdLane({ lane: 'contentBreath', id: null }));
                  return next(
                    reOrderContentSelection({
                      ids: r.ids,
                      direction: r.direction,
                      groupReorder: true,
                    }),
                  );
                }
              }
            }
            return next(action);
          }
        }

        for (const matcher of COURSE_HIGHLIGHT_ACTIONS) {
          if (matcher.match(action)) {
            const id = extractSingleNumericPayloadId(action);
            const lane = id !== null ? courseLaneFromHighlight(action) : undefined;
            const useQuizSharedCourseHighlighterLanes =
              getCurAppName(state.session.curApp).toLowerCase() === 'quiz';
            const startIdContainer = useQuizSharedCourseHighlighterLanes
              ? state.quiz.startId
              : state.course.startId;

            const setCourseStartLane = (l: keyof CourseStartId, anchorId: number) => {
              if (useQuizSharedCourseHighlighterLanes)
                return setQuizShiftHighlightStartIdLane({ lane: l, id: anchorId });
              else return setCourseShiftHighlightStartIdLane({ lane: l, id: anchorId });

            };
            const dispatchClearCourseLane = (payload: { lane: keyof CourseStartId; id: null }) => {
              if (useQuizSharedCourseHighlighterLanes)
                dispatch(setQuizShiftHighlightStartIdLane({ lane: payload.lane, id: null }));
              else
                dispatch(setCourseShiftHighlightStartIdLane(payload));
            };
            const clearCourseStartLanes = (lanes: readonly (keyof CourseStartId)[]) => {
              clearCourseHighlightStartLanes(lanes, dispatchClearCourseLane);
            };

            if (id !== null && lane !== undefined) {
              const expandCourseLane = (
                expandLane: keyof CourseStartId,
                curId: number,
              ): { ids: number[]; direction: boolean } => {
                const result = useQuizSharedCourseHighlighterLanes
                  ? expandQuizHighlightRange(state.quiz, expandLane as keyof QuizStartId, curId, id)
                  : expandCourseHighlightRange(state.course, expandLane, curId, id);
                return { ids: result.ids as number[], direction: result.direction };
              };

              if (shiftOrdinalRange) {
                const cur = startIdContainer[lane];
                const r = resolveCourseShiftOrdinalHighlightEffect(
                  useQuizSharedCourseHighlighterLanes,
                  state.course,
                  state.quiz,
                  lane,
                  id,
                  cur as number | null,
                );
                if (r.tag === 'set_anchor_quiz') {
                  return next(setQuizShiftHighlightStartIdLane(r));
                } else if (r.tag === 'set_anchor_course') {
                  return next(setCourseShiftHighlightStartIdLane(r));
                } else {
                  if (useQuizSharedCourseHighlighterLanes) {
                    dispatch(setQuizShiftHighlightStartIdLane({ lane: lane as keyof QuizStartId, id: null }));
                  } else {
                    dispatch(setCourseShiftHighlightStartIdLane({ lane, id: null }));
                  }
                  return next({
                    ...action,
                    payload: { ...(action as { payload: Record<string, unknown> }).payload, ids: r.ids },
                  });
                }
              } else if (ctrlOrdinalRange) {
                const r = resolveCourseCtrlAltOrdinalLaneEffect(
                  'ctrl',
                  startIdContainer as CourseStartId,
                  lane,
                  id,
                  expandCourseLane,
                );
                if (r.tag === 'anchor') {
                  return next(setCourseStartLane(r.lane, r.id));
                } else if (r.tag === 'ctrl_reorder_slide') {
                  clearCourseStartLanes(r.clearLanes);
                  return next(reOrderSlideSelection({ ids: r.ids, direction: r.direction }));
                } else if (r.tag === 'ctrl_reorder_covers') {
                  clearCourseStartLanes(r.clearLanes);
                  return next(reOrderCoversSelection({ ids: r.ids, direction: r.direction }));
                } else if (r.tag === 'ctrl_reorder_course') {
                  clearCourseStartLanes(r.clearLanes);
                  return next(reOrderCourseSelection({ ids: r.ids, direction: r.direction }));
                } else if (r.tag === 'ctrl_reorder_pennant') {
                  clearCourseStartLanes(r.clearLanes);
                  return next(reOrderPennantSelection({ ids: r.ids, direction: r.direction }));
                }
              } else if (altOrdinalRange) {
                const groupReorder = true;
                const r = resolveCourseCtrlAltOrdinalLaneEffect(
                  'alt',
                  startIdContainer as CourseStartId,
                  lane,
                  id,
                  expandCourseLane,
                );
                if (r.tag === 'anchor') {
                  return next(setCourseStartLane(r.lane, r.id));
                } else if (r.tag === 'alt_reorder_slide') {
                  clearCourseStartLanes(r.clearLanes);
                  return next(
                    reOrderSlideSelection({ ids: r.ids, direction: r.direction, groupReorder }),
                  );
                } else if (r.tag === 'alt_reorder_covers') {
                  clearCourseStartLanes(r.clearLanes);
                  return next(
                    reOrderCoversSelection({ ids: r.ids, direction: r.direction, groupReorder }),
                  );
                } else if (r.tag === 'alt_reorder_course') {
                  clearCourseStartLanes(r.clearLanes);
                  return next(
                    reOrderCourseSelection({ ids: r.ids, direction: r.direction, groupReorder }),
                  );
                } else if (r.tag === 'alt_reorder_pennant') {
                  clearCourseStartLanes(r.clearLanes);
                  return next(
                    reOrderPennantSelection({ ids: r.ids, direction: r.direction, groupReorder }),
                  );
                }
              }
            }
            return next(action);
          }
        }

        for (const matcher of QUIZ_HIGHLIGHT_ACTIONS) {
          if (matcher.match(action)) {
            const rawId = extractSingleQuizHighlightRawId(action);
            const lane = rawId !== null ? quizLaneFromHighlight(action) : undefined;

            if (shiftOrdinalRange && rawId !== null && lane !== undefined) {
              const id = rawId;
              const cur = state.quiz.startId[lane];
              if (cur === null || cur === id) {
                return next(setQuizShiftHighlightStartIdLane({ lane, id }));
              } else {
                const { ids: expanded } = expandQuizHighlightRange(state.quiz, lane, cur, id);
                dispatch(setQuizShiftHighlightStartIdLane({ lane, id: null }));
                return next({
                  ...action,
                  payload: { ...(action as { payload: Record<string, unknown> }).payload, ids: expanded },
                });
              }
            } else if (ctrlOrdinalRange && rawId !== null && lane !== undefined) {
              const r = resolveQuizCtrlAltOrdinalBreathDepthEffect('ctrl', state.quiz, lane, rawId);
              if (r.tag === 'invalid_number_id') {
                return next(action);
              }
              if (r.tag === 'set_anchor') {
                return next(setQuizShiftHighlightStartIdLane(r));
              } else if (r.tag === 'ctrl_reorder_quiz') {
                clearQuizBreathDepthPairedStartAnchors((p) =>
                  dispatch(setQuizShiftHighlightStartIdLane(p)),
                );
                return next(reOrderQuizSelection({ ids: r.ids, direction: r.direction }));
              } else if (r.tag === 'ctrl_reorder_question') {
                clearQuizQuestionBreathDepthPairedStartAnchors((p) =>
                  dispatch(setQuizShiftHighlightStartIdLane(p)),
                );
                return next(reOrderQuestionSelection({ ids: r.ids, direction: r.direction }));
              }
            } else if (altOrdinalRange && rawId !== null && lane !== undefined) {
              const groupReorder = true;
              const r = resolveQuizCtrlAltOrdinalBreathDepthEffect('alt', state.quiz, lane, rawId);
              if (r.tag === 'invalid_number_id') {
                return next(action);
              }
              if (r.tag === 'set_anchor') {
                return next(setQuizShiftHighlightStartIdLane(r));
              } else if (r.tag === 'alt_reorder_quiz') {
                clearQuizBreathDepthPairedStartAnchors((p) =>
                  dispatch(setQuizShiftHighlightStartIdLane(p)),
                );
                return next(
                  reOrderQuizSelection({ ids: r.ids, direction: r.direction, groupReorder }),
                );
              } else if (r.tag === 'alt_reorder_question') {
                clearQuizQuestionBreathDepthPairedStartAnchors((p) =>
                  dispatch(setQuizShiftHighlightStartIdLane(p)),
                );
                return next(
                  reOrderQuestionSelection({ ids: r.ids, direction: r.direction, groupReorder }),
                );
              }
            }
            return next(action);
          }
        }

        for (const matcher of COMMS_OUTLINE_ACTIONS) {
          if (matcher.match(action)) {
            const outlineKey = extractSingleStringPayloadId(action);
            const lane = outlineKey !== null ? commsLaneFromOutline(action) : undefined;

            if (shiftOrdinalRange && outlineKey !== null && lane !== undefined) {
              const id = outlineKey;
              const cur = state.comms.startId[lane];
              if (cur === null || cur === id) {
                return next(setCommsShiftHighlightStartIdLane({ lane, id }));
              } else {
                const { ids: expanded } = expandCommsOutlineRange(state.comms, lane, cur, id);
                dispatch(setCommsShiftHighlightStartIdLane({ lane, id: null }));
                return next({
                  ...action,
                  payload: { ...(action as { payload: Record<string, unknown> }).payload, ids: expanded },
                });
              }
            } else if (ctrlOrdinalRange && outlineKey !== null && lane !== undefined) {
              const id = outlineKey;
              const cur = state.comms.startId[lane];
              if (cur === null || cur === id) {
                return next(setCommsShiftHighlightStartIdLane({ lane, id }));
              } else {
                if (commsOutlineEndpointTypesDiffer(state.comms, lane, cur, id)) {
                  dispatch(setCommsShiftHighlightStartIdLane({ lane, id: null }));
                  return next(prependError('Cannot reorder different types'));
                }
                const { ids: expanded, direction } = expandCommsOutlineRange(state.comms, lane, cur, id);
                if (lane === 'tutorOutline') dispatch(reOrderTutors({ ids: expanded, direction }));
                else if (lane === 'outgoingOutline') dispatch(reOrderOutgoing({ ids: expanded, direction }));
                else dispatch(reOrderIncoming({ ids: expanded, direction }));
                return next(setCommsShiftHighlightStartIdLane({ lane, id: null }));
              }
            } else if (altOrdinalRange && outlineKey !== null && lane !== undefined) {
              const groupReorder = true;
              const id = outlineKey;
              const cur = state.comms.startId[lane];
              if (cur === null || cur === id) {
                return next(setCommsShiftHighlightStartIdLane({ lane, id }));
              } else {
                if (commsOutlineEndpointTypesDiffer(state.comms, lane, cur, id)) {
                  dispatch(setCommsShiftHighlightStartIdLane({ lane, id: null }));
                  return next(prependError('Cannot reorder different types'));
                }
                const { ids: expanded, direction } = expandCommsOutlineRange(state.comms, lane, cur, id);
                if (lane === 'tutorOutline') {
                  dispatch(reOrderTutors({ ids: expanded, direction, groupReorder }));
                } else if (lane === 'outgoingOutline') {
                  dispatch(reOrderOutgoing({ ids: expanded, direction, groupReorder }));
                } else {
                  dispatch(reOrderIncoming({ ids: expanded, direction, groupReorder }));
                }
                return next(setCommsShiftHighlightStartIdLane({ lane, id: null }));
              }
            }
            return next(action);
          }
        }

        return next(action);
      };

export default RangeSelectionOrReorderManger;
