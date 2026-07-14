import { Middleware } from '@reduxjs/toolkit';
import { RootState } from '../index';
import {
  hydrateMetadata,
  MetadataUpdate,
  updateRootsMetadata,
  updateQuizMetadata,
  updateQuestionsMetadata,
  updateStepsMetadata,
  updateCoversMetadata,
  updatePennantsMetadata,
  updateAnswersMetadata,
} from '../../library/actions';
import { Metadata } from '../../components/Core/types';

const BlobsManager: Middleware<{}, RootState> = () => (next) => (action) => {
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
