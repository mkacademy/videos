import { Freight } from '../../library/actions';
import { MutateVisibilityPayload } from '../../library/types';
import { DataRow, Metadata } from '../../components/Core/types';
import { UPDATE_ROWS, VISIBILITY } from '../../utils';
import {
  findSelectedStashFreights,
  parseApprouteChildEntity,
  parseApprouteInteractionIds,
} from '../../library/ShortcutsUtils';
import { getStashCellRows, StashState } from '../slices/stashSlice';
import { RootState } from '../index';

type VisibilitySessionFields = {
  quota: number;
  curToken: string;
  curMailer: number;
  mutateRole: string;
  connects: string;
};

const toFiniteIds = (values: Array<string | number | boolean | null | undefined>): number[] =>
  values
    .map((value) => (typeof value === 'boolean' ? NaN : Number(value)))
    .filter((id) => Number.isFinite(id));

const parentIdsFromStashRows = (
  rows: DataRow[],
  parentKey: string | undefined
): number[] => {
  if (!parentKey) return [];
  const ids = rows.flatMap((row) => {
    const metadataVal = row.metadata?.[parentKey as keyof Metadata];
    if (metadataVal != null) {
      return Array.isArray(metadataVal) ? metadataVal : [metadataVal];
    }
    const bannerId = (row as DataRow & { bannerId?: number }).bannerId;
    return bannerId != null ? [bannerId] : [];
  });
  return [...new Set(toFiniteIds(ids))];
};

export const buildVisibilityPayloadFromFreight = (
  freight: Freight,
  stash: StashState,
  session: VisibilitySessionFields
): MutateVisibilityPayload | null => {
  const childEntity = parseApprouteChildEntity(freight.approute);
  if (!childEntity) return null;

  const parentEntity = freight.approute.slice(0, freight.approute.length - childEntity.length);
  const rows = getStashCellRows(stash[freight.approute]?.[freight.timestamp]).filter(
    (row) => !row.deleted
  );
  const childIds = toFiniteIds(rows.map((row) => row.id));
  if (childIds.length === 0) return null;

  const interactionIds = parseApprouteInteractionIds(freight.approute);
  const parentIds =
    parentEntity.toLowerCase() === 'foundation'
      ? []
      : parentIdsFromStashRows(rows, interactionIds?.parentID);

  return {
    quota: session.quota,
    curToken: session.curToken,
    curMailer: session.curMailer,
    mutateRole: session.mutateRole,
    target: childEntity,
    entity: parentEntity,
    resolvers: [VISIBILITY],
    [UPDATE_ROWS]: {
      visibility: session.connects,
      childIds,
      parentIds,
    },
  };
};

export const buildVisibilityPayloadsFromSelectedStash = (
  state: RootState,
  session: VisibilitySessionFields
): MutateVisibilityPayload[] => {
  const freights = findSelectedStashFreights(state);
  if (!freights?.length) return [];

  return freights
    .map((freight) => buildVisibilityPayloadFromFreight(freight, state.stash, session))
    .filter((payload): payload is MutateVisibilityPayload => payload != null);
};

export const buildVisibilityPayloadFromFetchedData = (
  state: RootState,
  session: VisibilitySessionFields
): MutateVisibilityPayload | null => {
  const { entity, fetchedData, parentData } = state.view;
  const { IDs = [], parent } = parentData ?? {};
  const childIds = toFiniteIds(
    fetchedData?.filter((row: DataRow) => row.checked).map((row: DataRow) => row.id) ?? []
  );
  if (childIds.length === 0) return null;

  return {
    quota: session.quota,
    curToken: session.curToken,
    curMailer: session.curMailer,
    mutateRole: session.mutateRole,
    target: entity || '',
    entity: parent || '',
    resolvers: [VISIBILITY],
    [UPDATE_ROWS]: {
      visibility: session.connects,
      childIds,
      parentIds: toFiniteIds(IDs),
    },
  };
};

export const getVisibilityProgressMessage = (remainingRoutes: number): string =>
  `${visibiltyMsg} (${remainingRoutes} route${remainingRoutes === 1 ? '' : 's'} remaining)`;

export const visibiltyMsg = 'updating visibilty... please wait';
