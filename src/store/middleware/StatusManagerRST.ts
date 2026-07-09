import { Middleware } from '@reduxjs/toolkit';
import {
  setImageUrls,
  insertImageUrls,
  updateSteps,
  InsertImageUrlsPayload,
} from '../../library/actions';
import { updateStatuses, toggleAction } from '../slices/actionSlice';
import { appendRoute as stashRows, getStashCellRows } from '../slices/stashSlice';
import { viewRequest } from '../slices/viewSlice';
import { escrowUploads, escrowUploads as setUploads } from '../slices/settingsSlice';
import { prependError as insertError, prependErrors as insertErrors } from '../slices/errorSlice';
import { fileManager } from '../../library/FileManager';
import { contentDelay } from '../../constants';
import { Tree as entities, globalVars, getInteractionIDs, updPred } from '../../utils';
import { RootState, AppDispatch } from '../index';
import { DataRow, Metadata, MockedDataReturnTypes } from '../../components/Core/types';
import { ParsedEntity } from '../../Hooks/useFormsBuilder';
import { SerializableFile } from '../slices/settingsSlice';

const errorMsg0 = "Invalid or no timestmap selected";
const uploadMessage = "Uploading Images... please wait";
const errorMsg1 = "no steps in selected timestamp to update";
const msg = "invalid route, make sure the destination is steps";
const msg0 = "invalid container or route, please select a valid route or container!";


interface ImageUpdate {
  id: number;
  imageurl: string;
  edited: boolean;
}

interface SetFetchedDataParams {
  approute: string;
  timestamp: string;
  dispatch: AppDispatch;
  fetchedData: DataRow[];
  uploads: SerializableFile[];
  prevImgUrls: { id: string; imageurl: string }[];
}

const toIdPred = ({ id }: { id: number }) => id;

const StatusManager: Middleware<{}, RootState> = ({ getState, dispatch }) => (next) => (action) => {
  const state = getState();

  if (toggleAction.match(action)) {
    const { payload } = action;
    const { status } = payload;
    if (status.initial === status.current)
      return next({ type: "ABORT_STATUS_UPDATE" });
    else if (status.current !== 0) {
      const { roleIndex, roles } = state.session;
      if (roles && roles[roleIndex]) {
        const role = roles[roleIndex];
        if (role.includes("USER") && roles.length === 1)
          return next({ type: action.type, payload: { ...payload, modified: false } });
      }
    }
    return next(action);
  }
  if (updateStatuses.match(action)) {
    const { payload } = action;
    const { roleIndex, roles } = state.session;
    if (roles && roles[roleIndex]) {
      const role = roles[roleIndex];
      if (role.includes("USER") && roles.length === 1)
        return next(updateStatuses(payload.map((obj) => ({
          status: { initial: 0, current: 0 },
          ...obj,
        }))));
    }
    return next(action);
  }
  if (insertImageUrls.match(action)) {
    const {
      stash: stashReducer,
      settings: { uploads },
    } = state;
    const entity = "instructions";
    const { payload } = action;
    const { timestamp, approute } = payload;
    const timestamps = stashReducer[approute];
    const parent = approute.replace(entity, "");
    const curFetchedData =
      timestamps && timestamps[timestamp] != null
        ? getStashCellRows(timestamps[timestamp])
        : undefined;
    if (curFetchedData === undefined || curFetchedData.length === 0) return next(insertError(errorMsg0));
    if (uploads.length > 0) {
      dispatch(
        viewRequest({
          message: uploadMessage,
          completed: false,
        })
      );
      const { globallyUniqueIDs } = globalVars;
      const { parentID, childID } = getInteractionIDs(parent, entity);
      const connections = entities.getProperty(entity, "connections");
      const mockedData = entities.getProperty(entity, "mockedData");
      const Containers = getSelectedContainers(payload, state);
      if (mockedData && connections && Containers.ids.length > 0) {
        const metadatas: Metadata[] = Array.from({ length: uploads.length }).map(
          (_, i) => {
            const metadata: Metadata = {
              ordinal: Containers.nextOrdinal + i,
              owner: true,
            };
            if (childID) metadata[childID] = globallyUniqueIDs - i;
            if (parentID) metadata[parentID] = Containers.ids;
            return metadata;
          }
        );
        const pred = (row: MockedDataReturnTypes): DataRow => ({
          ...row,
          keywords: [],
          id: parseInt(row.id),
          metadata: row.metadata as Metadata,
        });
        const fetchedData = mockedData?.(metadatas, connections).map(pred);
        const predicate = ({ id, imageurl }: { id: string | number; imageurl?: string }) => ({
          id: typeof id === 'string' ? id : id.toString(),
          imageurl: imageurl ?? ""
        });
        const prevImgUrls = fetchedData.map(predicate);
        const filpred = ({ imageurl }: { imageurl?: string }) => imageurl;
        const params: SetFetchedDataParams = {
          fetchedData: fetchedData.filter(filpred),
          prevImgUrls: prevImgUrls.filter(filpred),
          timestamp,
          dispatch,
          approute,
          uploads,
        };
        const updater = () => setFetchedData(params);
        setTimeout(updater, contentDelay + 1000);
      } else {
        dispatch(viewRequest({ completed: true }));
        dispatch(insertError(msg0));
      }
      return next({ type: "ABORT" });
    }
  }

  if (setImageUrls.match(action)) {
    const {
      stash: stashReducer,
      settings: { uploads },
    } = state;
    const { payload } = action;
    const { timestamp, approute } = payload;
    const timestamps = stashReducer[approute];
    const fetchedData =
      timestamps && timestamps[timestamp] != null
        ? getStashCellRows(timestamps[timestamp])
        : undefined;
    if (fetchedData === undefined || fetchedData.length === 0) return next(insertError(errorMsg0));
    if (fetchedData.length > 0 && uploads.length > 0) {
      dispatch(
        viewRequest({
          message: uploadMessage,
          completed: false,
        })
      );
      const predicate = ({ id, imageurl }: { id: string | number; imageurl?: string }) => ({
        id: typeof id === 'string' ? id : id.toString(),
        imageurl: imageurl || ""
      });
      const prevImgUrls = fetchedData.filter(item => updPred({
        deleted: item.deleted ?? false,
        checked: item.checked ?? false,
        imageurl: item.imageurl
      })).map(predicate);
      const params: SetFetchedDataParams = {
        fetchedData,
        timestamp,
        approute,
        uploads,
        dispatch,
        prevImgUrls,
      };
      const updater = () => setFetchedData(params);
      setTimeout(updater, contentDelay + 1000);
    } else if (fetchedData.length === 0)
      return next(insertError(errorMsg1));
    return next({ type: "ABORT" });
  }

  return next(action);
};

const getSelectedContainers = (payload: InsertImageUrlsPayload, state: RootState): { ids: number[], nextOrdinal: number } => {
  const {
    tutorial: { banners: tutorials, content: tutorialsContent },
    course: { banners: courses, content: coursesContent },
  } = state;
  const { destination, approute } = payload;
  const selectPred = ({ isHighlighted }: { isHighlighted: boolean }) => isHighlighted;

  switch (destination) {
    case "tutorial":
      const tutorialIds = tutorials.filter(selectPred).map(toIdPred);
      const ordinals = tutorialsContent
        .filter((slides) => slides.some((slide) => tutorialIds.includes(slide.bannerId)))
        .flat().map(({ ordinal }) => ordinal);
      return { ids: tutorialIds, nextOrdinal: ordinals.reduce((max, ordinal) => Math.max(max, ordinal) + 1, 0) };
    case "course":
      if (approute === "siftersinstructions") {
        const courseIds = courses.filter(selectPred).map(toIdPred);
        const ordinals = coursesContent
          .filter(({ slides, ...thumbs }) => Object.values(thumbs)
            .some(({ bannerId }) => courseIds.includes(bannerId)))
          .map(({ slides, ...thumbs }) => Object.values(thumbs).map(({ ordinal }) => ordinal)).flat();
        return { ids: courseIds, nextOrdinal: ordinals.reduce((max, ordinal) => Math.max(max, ordinal) + 1, 0) };
      }
      else if (approute === "filtersinstructions") {
        const pennantIds = courses
          .map(({ pennants }) => pennants || [])
          .flat()
          .filter(selectPred)
          .map(toIdPred);
        const ordinals = coursesContent
          .map(({ slides }) => slides.filter((slide) => slide.some(({ bannerId }) => pennantIds.includes(bannerId))))
          .flat().map((slide) => slide.map(({ ordinal }) => ordinal)).flat();
        return { ids: pennantIds, nextOrdinal: ordinals.reduce((max, ordinal) => Math.max(max, ordinal) + 1, 0) };
      }
      else return { ids: [], nextOrdinal: 0 };
    default:
      return { ids: [], nextOrdinal: 0 };
  }
};

const setFetchedData = async ({
  uploads,
  approute,
  dispatch,
  timestamp,
  fetchedData,
  prevImgUrls,
}: SetFetchedDataParams): Promise<void> => {
  if (prevImgUrls.length === 0) {
    dispatch(viewRequest({ completed: true }));
    dispatch(insertError(msg));
    return;
  }

  const predicate1 = (file: File, i: number) => ({
    id: prevImgUrls[i].id,
    imageurl: file,
    modified: true,
  });

  // Retrieve actual File objects from FileManager using serializable file data
  const actualFiles = fileManager.getFiles(uploads);
  const entities = actualFiles.slice(0, prevImgUrls.length).map(predicate1);
  // Import these functions from the appropriate utility file
  const { extractSnapshots, isTotalBytesTooLarge, totalBytes } = await import('../../Hooks/useFormsBuilder');

  const blobs = await extractSnapshots(entities, prevImgUrls);
  const tooLarge = isTotalBytesTooLarge(totalBytes);

  if (tooLarge) {
    const errors = [tooLarge.max, tooLarge.total];
    dispatch(insertErrors(errors));
  } else {
    const images = blobs.map(({ id, ...props }: ParsedEntity) => ({
      ...props,
      id: id,
    }));

    const updates = fetchedData.map((data) => ({
      ...data,
      ...(images.find(({ id }: ParsedEntity) => parseInt(id) === data.id) ?? {}),
    }));

    const upgrades: ImageUpdate[] = images.map(({ imageurl, id }: ParsedEntity) => ({
      edited: true,
      id: parseInt(id),
      imageurl: imageurl ?? "",
    }));

    const freight = {
      approute,
      timestamp,
      content: updates,
    };

    dispatch(stashRows(freight));
    setTimeout(() => dispatch(updateSteps(upgrades)));
  }

  totalBytes.length = 0;

  if (!tooLarge && prevImgUrls.length < uploads.length) {
    const left = uploads.slice(prevImgUrls.length);

    // Get remaining files BEFORE clearing the FileManager
    const remainingFiles = fileManager.getFiles(left);

    dispatch(escrowUploads(null));
    dispatch(setUploads(remainingFiles)); // This clears the FileManager

  } else {
    dispatch(escrowUploads(null));
  }

  dispatch(viewRequest({ completed: true }));
};

export default StatusManager;