import type { UpdatePayload } from './actions';
import type { RootState } from '../store';
import type { SlideGroup } from './CourseUtils';
import { normalizeBase64Payload } from './directoryTreeUtils';

export const hasValidBase64Imageurl = (imageurl: string | undefined | null): boolean =>
  normalizeBase64Payload(imageurl ?? '').length > 0;

type ImageurlCarrier = { id?: number; imageurl?: string };

const collectCourseLikeInstructionRows = (content: readonly SlideGroup[]): ImageurlCarrier[] => {
  const rows: ImageurlCarrier[] = [];
  for (const slideGroup of content) {
    for (const key of Object.keys(slideGroup)) {
      if (key === 'slides') continue;
      const item = slideGroup[key];
      if (item != null && typeof item === 'object' && 'id' in item) {
        rows.push(item as ImageurlCarrier);
      }
    }
    for (const slideRow of slideGroup.slides ?? []) {
      rows.push(...slideRow);
    }
  }
  return rows;
};

export const findInstructionRowImageurlById = (
  state: RootState,
  id: number,
): string | undefined => {
  for (const rows of state.tutorial.content) {
    for (const row of rows) {
      if (row.id === id) return row.imageurl;
    }
  }

  for (const row of collectCourseLikeInstructionRows(state.course.content)) {
    if (row.id === id) return row.imageurl;
  }

  for (const row of collectCourseLikeInstructionRows(state.quiz.content)) {
    if (row.id === id) return row.imageurl;
  }

  return undefined;
};

export const shouldPreserveExistingImageurl = (
  existingImageurl: string | undefined,
  incomingImageurl: string | undefined,
): boolean => {
  if (incomingImageurl === undefined) return false;
  return hasValidBase64Imageurl(existingImageurl) && !hasValidBase64Imageurl(incomingImageurl);
};

/** When preserve mode is on, drop mime-only imageurl updates that would clobber loaded base64. */
export const guardUpdateStepsImageurlPayload = (
  payload: UpdatePayload[],
  state: RootState,
  allowMimeOnlyImageurlOverride: boolean,
): UpdatePayload[] => {
  if (allowMimeOnlyImageurlOverride) return payload;

  return payload.map((update) => {
    if (update.imageurl === undefined) return update;
    const existingImageurl = findInstructionRowImageurlById(state, update.id);
    if (!shouldPreserveExistingImageurl(existingImageurl, update.imageurl)) return update;
    const { imageurl: _ignored, ...rest } = update;
    return rest;
  });
};
