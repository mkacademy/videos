import type { FieldValues } from "react-hook-form";
import { Tree, UPDATE_ROWS, TEXTS, calcBytes, editsMessage } from "../../utils";
import type { SlideGroup, SlideGroupItem, SlideItem } from "../../store/slices/courseSlice";
import type { StaticFormEntity } from "./StaticForm";
import type { Payload } from "../../library/TableMutations";
import type { MutationDataAccumulator, PayloadData } from "../../Hooks/useSaveMutations";
import { store } from "../../store";
import { contentDelay } from "../../constants";
import { mutateEntity } from "../../library/Thunks";
import type { ThunkDispatch, UnknownAction } from "@reduxjs/toolkit";
import type { RootState } from "../../store/types";
import { viewRequest } from "../../store/slices/viewSlice";

/** Flatten SlideGroup[] to a single array of SlideGroupItem (each cover/thumb). */
export function getSlideGroupItems(groups: SlideGroup[]): SlideGroupItem[] {
  return groups.flatMap((group) => {
    const { slides, ...rest } = group;
    return Object.values(rest).filter(
      (x): x is SlideGroupItem => x != null && typeof x === "object" && "isDismissed" in x
    );
  });
}

/** SlideGroupItems that belong to a single banner (group[0]?.bannerId === bannerId). */
export function getSlideGroupItemsForBanner(
  groups: SlideGroup[],
  bannerId: number | undefined
): SlideGroupItem[] {
  if (bannerId == null) return [];
  const forBanner = groups.filter((group) => (group[0] as SlideGroupItem | undefined)?.bannerId === bannerId);
  return getSlideGroupItems(forBanner);
}

/** SlideGroupItems that belong to any of the given banner IDs. */
export function getSlideGroupItemsForBannerIds(
  groups: SlideGroup[],
  bannerIds: number[]
): SlideGroupItem[] {
  if (bannerIds.length === 0) return [];
  const forBanners = groups.filter((group) => {
    const firstBannerId = (group[0] as SlideGroupItem | undefined)?.bannerId;
    return firstBannerId != null && bannerIds.includes(firstBannerId);
  });
  return getSlideGroupItems(forBanners);
}

/** Nested slide rows (`SlideGroup.slides`) for groups whose cover matches the course banner. */
export function getSlideItemsForBanner(
  groups: SlideGroup[],
  bannerId: number | undefined
): SlideItem[] {
  if (bannerId == null) return [];
  const forBanner = groups.filter(
    (group) => (group[0] as SlideGroupItem | undefined)?.bannerId === bannerId
  );
  return forBanner.flatMap((group) => (group.slides ?? []).flatMap((row) => row));
}

/** Slide rows under a quiz followup pennant (`row[0]?.bannerId === pennantId`). */
export function getSlideItemsForPennant(groups: SlideGroup[], pennantId: number): SlideItem[] {
  const group = groups.find((g) => g.slides?.some((row) => row[0]?.bannerId === pennantId));
  if (!group?.slides) return [];
  const rows = group.slides.filter((row) => row[0]?.bannerId === pennantId);
  if (rows.length === 0) return [];
  return rows.flat();
}

export function getSlideItemsForPennantIds(groups: SlideGroup[], pennantIds: number[]): SlideItem[] {
  if (pennantIds.length === 0) return [];
  return pennantIds.flatMap((id) => getSlideItemsForPennant(groups, id));
}

/** Map instruction-like item (title, content, imageurl) to StaticForm defaultValues. */
export function instructionDefaults(item: {
  title: string;
  content: string;
  imageurl: string;
  id?: number;
  bannerId?: number;
}): FieldValues {
  return {
    instruction: item.title,
    details: item.content,
    imageurl: item.imageurl,
    id: item.id ?? "",
    bannerId: item.bannerId ?? "",
  };
}

/** Map filter-like item (title, quote) to StaticForm defaultValues. */
export function filterDefaults(item: { title: string; quote: string; id?: number; bannerId?: number }): FieldValues {
  return {
    filter: item.title,
    purpose: item.quote,
    id: item.id ?? "",
    bannerId: item.bannerId ?? "",
  };
}

/** Map sifter-like item (title, quote) to StaticForm defaultValues. */
export function sifterDefaults(item: { title: string; quote: string; id?: number; bannerId?: number }): FieldValues {
  return {
    sifter: item.title,
    purpose: item.quote,
    id: item.id ?? "",
    bannerId: item.bannerId ?? "",
  };
}

/** Map dashboard-like item (title, quote) to StaticForm defaultValues. */
export function dashboardDefaults(item: { title: string; quote: string; id?: number; bannerId?: number }): FieldValues {
  return {
    dashboard: item.title,
    purpose: item.quote,
    id: item.id ?? "",
    bannerId: item.bannerId ?? "",
  };
}

/**
 * Generic StaticForm submit handler.
 *
 * Builds an UPDATE_ROWS/TEXTS-style payload (similar to TableMutations.saveRowsWithOnlyTextsModified)
 * for the given entity and form data, then logs both the payload and a MutationDataAccumulator.
 *
 * Optionally accepts the original/default values alongside the submitted values so callers
 * can diff or implement custom cancel/rollback logic if needed.
 */
interface onSubmitParams {
  data: FieldValues,
  childEntity: StaticFormEntity,
  parentEntity: StaticFormEntity,
  options?: { initialValues?: FieldValues }
};
export function onSubmit({
  data,
  options,
  childEntity,
  parentEntity,
}: onSubmitParams
): void {
  const rawId = data.id as string | number | undefined;
  const rawBannerId = data.bannerId as string | number | undefined;

  const toNumber = (value: string | number | undefined): number | undefined => {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() !== "" && !Number.isNaN(Number(value))) {
      return Number(value);
    }
    return undefined;
  };

  const childId = toNumber(rawId);
  const parentId = toNumber(rawBannerId);

  const parentIds = parentId !== undefined ? [parentId] : [];
  const childIds = childId !== undefined ? [childId] : [];

  // Use the same fields ordering that TableMutations.andIncludeUtilities relies on.
  const fields = (Tree.getProperty(childEntity, "fields") ?? []) as string[];

  // Restrict to primitive/text-like values that are compatible with the TableMutations TextsFields union.
  type BasicTextsField = string | number | boolean | string[];
  const row: Record<string, BasicTextsField | undefined> = {};
  for (const field of fields) {
    // Field names for these entities (filters, sifters, dashboards, instructions)
    // are aligned with the StaticForm field names (filter, purpose, instruction, details, imageurl, etc.).
    const value = (data as Record<string, unknown>)[field] as BasicTextsField | undefined;
    if (value !== undefined) {
      row[field] = value;
    }
  }

  const texts: BasicTextsField[] = fields.map((field) => row[field] ?? "");
  const size = calcBytes(row, childEntity);

  const payload: Payload = {
    sizeInBytes: [size],
    task: UPDATE_ROWS,
    updateTask: TEXTS,
    parentIds,
    childIds,
    texts,
  };

  // Build a MutationDataAccumulator in the same shape as useSaveMutations.
  const state = store.getState();
  const { session, view } = state;
  const resolvers: string[] = [];
  const payloads: Payload[] = [payload];

  const baseAccumulator: MutationDataAccumulator = {
    requestIsProcessing: view.requestIsProcessing,
    curMailer: session.curMailer,
    pause: session.pauseFetchers,
    curToken: session.curToken,
    curApp: session.curApp,
    quota: session.quota,
    entity: parentEntity,
    mutateRole: session.mutateRole ?? undefined,
    resolvers,
    target: childEntity,
  };

  const mutationData = payloads.reduce<MutationDataAccumulator>(
    (prev, cur) => {
      const { task, ...data } = cur;
      if (task !== UPDATE_ROWS) {
        resolvers.push(task);
        return { ...prev, [task]: data };
      } else if (prev[UPDATE_ROWS]) {
        const { updateTask, ...payloadWithoutTask } = data;
        (prev[UPDATE_ROWS] as PayloadData[]).push(payloadWithoutTask);
        if (updateTask) {
          resolvers.push(updateTask);
        }
        return { ...prev };
      } else {
        const { updateTask, ...payloadWithoutTask } = data;
        if (updateTask) {
          resolvers.push(updateTask);
        }
        return { ...prev, [task]: [payloadWithoutTask] };
      }
    },
    baseAccumulator
  );

  if (childId !== undefined) {
    mutationDatas[childId] = mutationData;
    if (options?.initialValues) initialMutationDatas[childId] = options.initialValues;
  }
}

const mutationDatas: Record<number, MutationDataAccumulator> = {};
const initialMutationDatas: Record<number, FieldValues> = {};

export function getInitialMutationData(childId: number): FieldValues | undefined {
  return initialMutationDatas[childId];
}

export function onCancel(childId: number): void {
  delete mutationDatas[childId];
  delete initialMutationDatas[childId];
}

export function hasMutationData(childId: number): boolean {
  return mutationDatas[childId] !== undefined;
}

export function onSave(childId: number): void {
  if (!mutationDatas[childId]) return;
  const dispatch = store.dispatch as ThunkDispatch<RootState, unknown, UnknownAction>;
  setTimeout(() => dispatch(mutateEntity(mutationDatas[childId])), contentDelay);
  dispatch(viewRequest({ message: editsMessage, completed: false }));
}
