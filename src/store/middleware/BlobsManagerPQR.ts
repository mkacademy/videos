import { Middleware } from '@reduxjs/toolkit';
import { RootState } from '../index';
import { Row } from '../slices/rowSlice';
import {
  imageTextSwap,
  mutateImageUrl,
  overviewOrdinals,
  updateStepsOrdinals,
  updateCoversOrdinals,
  updatePennantsOrdinals,
  updateRootsOrdinals,
  OrdinalUpdate,
  updateQuizOrdinals,
  updateQuestionsOrdinals,
  hydrateMetadata,
  MetadataUpdate,
  updateRootsMetadata,
  updateQuizMetadata,
  updateQuestionsMetadata,
  updateStepsMetadata,
  updateCoversMetadata,
  updatePennantsMetadata,
  updateAnswersMetadata,
  isPersistableOrdinal,
} from '../../library/actions';
import { Metadata } from '../../components/Core/types';
import { COMPLETED_MESSAGE, cpanelMessage } from '../slices/viewSlice';

const predicate = (key: string): boolean => key.endsWith("instructions");

const BlobsManager: Middleware<{}, RootState> = (store) => (next) => (action) => {
  if (mutateImageUrl.match(action)) {
    const state = store.getState();
    const { stash: stashReducer } = state;
    const { txtimg, txtswap } = state.settings;

    const selected = Object.keys(stashReducer).filter(predicate);
    if (selected.length > 0) {
      store.dispatch(imageTextSwap({ txtimg, txtswap }));
    }

    return next(cpanelMessage(COMPLETED_MESSAGE));
  }

  if (overviewOrdinals.match(action)) {
    const state = store.getState();
    const { entity, parent } = state.view;
    const { row: rowReducer, text: textReducer } = state;

    const orders = rowReducer.filter(
      (row) =>
        (row.modified || (!row.deleted && parseInt(row.id) < 0)) &&
        isPersistableOrdinal(row.order),
    );
    const inEligible = orders.length === 0 || entity === undefined || parent === undefined;

    if (inEligible) return next(action);

    const rootPred = (row: Row) => ({
      ordinal: row.order,
      id: parseInt(row.id),
      bannerIds: [] as number[],
    });

    const nonRootPred = (rootName: string) => (row: Row) => ({
      ordinal: row.order,
      id: parseInt(row.id),
      bannerIds: row.index !== undefined && textReducer[row.index] && textReducer[row.index]?.["metadata"]
        ? textReducer[row.index]["metadata"]?.[rootName] || []
        : [],
    });

    switch (parent + entity) {
      case "foundationsifters": {
        const updates: OrdinalUpdate[] = orders.map(rootPred);
        return next(updateRootsOrdinals(updates));
      }
      case "foundationfilters": {
        const updates: OrdinalUpdate[] = orders.map(rootPred);
        return next(updateRootsOrdinals(updates));
      }
      case "foundationdashboards": {
        const updates: OrdinalUpdate[] = orders.map(rootPred);
        return next(updateQuizOrdinals(updates));
      }
      case "dashboardsSifters": {
        const updates: OrdinalUpdate[] = orders.map(nonRootPred("dashboardId"));
        return next(updateQuestionsOrdinals(updates));
      }
      case "filtersinstructions": {
        const updates: OrdinalUpdate[] = orders.map(nonRootPred("filterId"));
        return next(updateStepsOrdinals(updates));
      }
      case "siftersinstructions": {
        const updates: OrdinalUpdate[] = orders.map(nonRootPred("sifterId"));
        return next(updateCoversOrdinals(updates));
      }
      case "siftersfilters": {
        const updates: OrdinalUpdate[] = orders.map(nonRootPred("sifterId"));
        return next(updatePennantsOrdinals(updates));
      }
      default:
        return next(action);
    }
  }

  if (hydrateMetadata.match(action)) {
    const { payload: { data, orig: parent, dest: entity } } = action;
    const rootPred = ( childId: string) => (row: Metadata) => ({
      id: row[childId],
      owner: row.owner ?? false,
      ordinal: row.ordinal ?? 0,
    });

    const nonRootPred = (parentId: string, childId: string) => (row: Metadata) => ({
      id: row[childId],
      bannerId: row[parentId],
      owner: row.owner ?? false,
      ordinal: row.ordinal ?? 0,
    });

    switch (parent.toLowerCase() + entity.toLowerCase()) {
      case "foundationsifters": {
        const updates: MetadataUpdate[] = data.map(rootPred( "sifterId"));
        return next(updateRootsMetadata(updates));
      }
      case "foundationfilters": {
        const updates: MetadataUpdate[] = data.map(rootPred( "filterId"));
        return next(updateRootsMetadata(updates));
      }
      case "foundationdashboards": {
        const updates: MetadataUpdate[] = data.map(rootPred( "dashboardId"));
        return next(updateQuizMetadata(updates));
      }
      case "dashboardssifters": {
        const updates: MetadataUpdate[] = data.map(nonRootPred( "dashboardId", "sifterId"));
        return next(updateQuestionsMetadata(updates));
      }
      case "dashboardsfilters": {
        const updates: MetadataUpdate[] = data.map(nonRootPred( "dashboardId", "filterId"));
        return next(updateAnswersMetadata(updates));
      }
      case "filtersinstructions": {
        const updates: MetadataUpdate[] = data.map(nonRootPred( "filterId", "instructionId"));
        return next(updateStepsMetadata(updates));
      }
      case "siftersinstructions": {
        const updates: MetadataUpdate[] = data.map(nonRootPred( "sifterId", "instructionId"));
        return next(updateCoversMetadata(updates));
      }
      case "siftersfilters": {
        const updates: MetadataUpdate[] = data.map(nonRootPred( "sifterId", "filterId"));
        return next(updatePennantsMetadata(updates));
      }
      default:
        return next(action);
    } 
  }
  return next(action);
};

export default BlobsManager;