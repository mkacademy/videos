import { Middleware } from '@reduxjs/toolkit';
import { RootState } from '../types';
import {
  initializedLoading,
} from '../slices/sessionSlice';
import {
  mutateAlgorithm
} from '../slices/traversalSlice';
import {
  exportAlgorithm,
  exportTexts,
  exportTraversals,
  importTraversals,
  importAlgorithm,
  importTexts,
  importStash,
  appendTraversals,
  appendImports,
} from '../../library/actions';
import { ADD_ROWS, Tree as entities } from '../../utils';
import { clearOnlyWarnings, prependError as insertError, prependWarning } from '../slices/errorSlice';
import { appendRows, EntityTypeMap, ResultPayload, Row } from '../slices/rowSlice';
import { appendRoutes, removeTimestamp, setStashInventoryNavSelection } from '../slices/stashSlice';
import { initFileManager, viewExports as insertExports } from '../slices/viewSlice';
import { DataRow, MenuItem } from '../../components/Core/types';
import {
  buildCommentsStashImportPayloads,
  isCommentsStashRoutesData,
} from '../../library/commentsStashUtils';
import {
  buildEscrowStashImportFromRoutesData,
  buildMemberStashImportFromRoutesData,
} from '../../library/ShortcutsUtils';
import { commentsTimestamp, isPncUserApp } from '../../utils';

interface ExpandTextsParams {
  isExpand: boolean;
  entity: string;
  texts: DataRow[];
}

const filterImportTextRows = (entity: string, data: DataRow[]): DataRow[] => {
  const predicate = (row: Partial<DataRow>) =>
    Object.values(row).every((value) => value !== undefined);
  const connections = entities.getProperty(entity, 'connections');
  const predicate0 = (descendentsSums: Record<string, number>) =>
    connections?.findIndex((connection: string) =>
      Number.isNaN(descendentsSums[connection])
    ) === -1;
  const fields = [...(entities.getProperty(entity, 'fields') || [])];
  fields.push('descendentsSums', 'sizeInBytes', 'keywords', 'metadata', 'id');
  return data
    .filter(
      (row: DataRow) =>
        typeof row === 'object' && !Array.isArray(row) && row !== null
    )
    .map((row: DataRow) =>
      fields.reduce(
        (acc: Partial<DataRow> & { status: number }, field: string) => ({
          ...acc,
          [field]: row[field],
        }),
        { status: 0 }
      )
    )
    .filter(predicate)
    .filter((row) => row.descendentsSums && predicate0(row.descendentsSums)) as DataRow[];
};

/** Stash JSON round-trip: rows from {@link getStashCellRows} (e.g. PNC tutorial content) may omit tree-entity fields. */
const filterStashImportRows = (_entity: string, data: DataRow[]): DataRow[] =>
  data.filter(
    (row): row is DataRow =>
      typeof row === 'object' &&
      row !== null &&
      !Array.isArray(row) &&
      row.id !== undefined &&
      row.id !== null
  );

const expandTexts = ({ isExpand, entity, texts }: ExpandTextsParams): DataRow[] => {
  if (!isExpand) return texts;
  const textAreas = entities.getProperty(entity, "form")?.textAreas;
  if (textAreas) {
    const parser = new DOMParser();
    const fields = textAreas.map(({ name }: { name: string }) => name);
    const contents = texts.map((text) => text[fields[0]]);
    const content = contents.reduce((prev, cur) => prev + cur, "");
    const htmlDoc = parser.parseFromString(
      "<div>" + content + "</div>",
      "text/xml"
    );
    const collection = htmlDoc.getElementsByTagName("p");
    for (let paragraph of collection) console.log(paragraph.textContent);
    return texts;
  } else return texts;
};

const FilesManager: Middleware<{}, RootState> = ({ getState, dispatch }) => {
  return (next) => (action) => {
    if (initFileManager.match(action)) {
      const state = getState();
      const { payload: doAction } = action;
      switch (doAction) {
        case exportTraversals.type: {
          return next(
            insertExports({
              actionType: doAction,
              exportedData: state.traversal.traversals,
            })
          );
        }
        case exportAlgorithm.type: {
          return next(
            insertExports({
              actionType: doAction,
              exportedData: state.traversal.algorithm,
            })
          );
        }
        case exportTexts.type: {
          const { toggleLayout, entity } = state.view;
          const { content: contentReducer, row: rows } = state;
          const visibles = rows.filter((row: Row) => !row.deleted && row.checked);
          const texts = visibles.map((v: Row) => contentReducer[v.index]);
          const params: ExpandTextsParams = { isExpand: toggleLayout, entity: entity || '', texts };
          return next(
            insertExports({
              exportedData: expandTexts(params),
              actionType: doAction,
            })
          );
        }
        default:
          return next(action);
      }
    }

    if (appendImports.match(action)) {
      const state = getState();
      const { payload: { data, actionType } } = action;
      switch (actionType) {
        case importTraversals.type:
          return next({ type: appendTraversals.type, payload: data });
        case importAlgorithm.type:
          return next({ type: mutateAlgorithm.type, payload: data });
        case importTexts.type:
          const { isIncognito, isAppend } = state.session;
          const { entity, parent } = state.view;
          const canImportTexts = !isIncognito;
          if (canImportTexts) {
            if (entity && parent) {
              if (Array.isArray(data)) {
                const content = filterImportTextRows(entity, data);
                if (content.length > 0) {
                  setTimeout(() => {
                    const operation = ADD_ROWS;
                    const params = {
                      entity,
                      parent,
                      isAppend,
                      payload: content,
                      keywords: undefined, // already inside
                    } as ResultPayload & { entity: keyof EntityTypeMap };
                    const { payload: appendPayload, type: appendType } = appendRows(params);
                    dispatch({ type: appendType, payload: { ...appendPayload, operation } });
                  });
                  const message = `successfully extracted ${content.length}/${data.length} rows`;
                  dispatch(clearOnlyWarnings());
                  return next(prependWarning(message));
                } else {
                  const message = "file is empty or incorrect Format!";
                  return next(insertError(message));
                }
              } else return next(insertError(" incorrect file Format!"));
            } else return next(insertError("parent or child is not set!"));
          } else return next(insertError("Import requires authenticated (cognito) view — switch off incognito."));
        case importStash.type: {
          if (!Array.isArray(data) && typeof data === 'object' && data !== null) {
            const routesData = data as Record<string, DataRow[]>;
            if (isCommentsStashRoutesData(routesData)) {
              const appendPayloads = buildCommentsStashImportPayloads(
                routesData,
                commentsTimestamp
              );
              if (!appendPayloads.length) {
                return next(insertError('Comments stash import file has no valid comment rows.'));
              }
              let importedRows = 0;
              const routeLabels: string[] = [];
              for (const payload of appendPayloads) {
                importedRows += payload.content.length;
                routeLabels.push(payload.approute);
              }
              setTimeout(() => {
                for (const { approute, timestamp } of appendPayloads) {
                  dispatch(removeTimestamp({ approute, timestamp }));
                }
                dispatch(appendRoutes(appendPayloads));
              });
              const message = `Imported ${importedRows} comment thread${importedRows === 1 ? '' : 's'} into comments stash (${routeLabels.join(', ')}).`;
              dispatch(clearOnlyWarnings());
              return next(prependWarning(message));
            }
            if (isPncUserApp(state.session.curApp)) {
              const built = buildEscrowStashImportFromRoutesData(
                state,
                routesData,
                filterStashImportRows
              );
              if (!built.ok) {
                return next(insertError(built.error));
              }
              const { appendPayloads, stashNav, importedRows, totalRows, routeLabels } = built;
              setTimeout(() => {
                dispatch(appendRoutes(appendPayloads));
                dispatch(setStashInventoryNavSelection(stashNav));
              });
              const message = `Imported ${importedRows}-${totalRows} rows into new Escrowed_items group (${routeLabels.join(', ')}).`;
              dispatch(clearOnlyWarnings());
              return next(prependWarning(message));
            }
            const built = buildMemberStashImportFromRoutesData(
              state,
              routesData,
              filterStashImportRows
            );
            if (!built.ok) {
              return next(insertError(built.error));
            }
            const { appendPayloads, importedRows, totalRows, routeLabels } = built;
            setTimeout(() => {
              for (const { approute, timestamp } of appendPayloads) {
                dispatch(removeTimestamp({ approute, timestamp }));
              }
              dispatch(appendRoutes(appendPayloads));
            });
            const message = `Imported ${importedRows}-${totalRows} rows into escrow stash (${routeLabels.join(', ')}).`;
            dispatch(clearOnlyWarnings());
            return next(prependWarning(message));
          }
          return next(insertError('Stash import file must be a JSON object keyed by approute.'));
        }
        default:
          return next(insertError("unknown file action " + actionType));
      }
    }

    if (initializedLoading.match(action)) {
      const { payload: { isExtractAlgo, ...payload } } = action;
      if (isExtractAlgo) {
        return next({ type: mutateAlgorithm.type, payload });
      } else return next(action);
    }

    if (appendTraversals.match(action)) {
      const state = getState();
      const { prefix } = state.session;
      const { payload: selectedMenu } = action;
      const { algorithm } = state.traversal;
      const { permittedRoutes } = state.settings;
      const predicate = (m: MenuItem) => ({
        ...m,
        prefix,
        contentIds: [],
        urlID: m.from + m.to,
      });
      const predicate0 = ({ urlID }: { urlID: string }) => permittedRoutes.includes(urlID);
      switch (selectedMenu) {
        case "sessionAlgorithm":
          return next(appendTraversals(algorithm));
        case "allRoots": {
          const traversals = (entities.getProperty("foundation", "menu") || [])
            .concat(entities.getProperty("minions", "menu") || [])
            .concat(entities.getProperty("underbosses", "menu") || [])
            .concat(entities.getProperty("bosses", "menu") || [])
            .concat(entities.getProperty("dashboards", "menu") || [])
            .concat(entities.getProperty("sifters", "menu") || [])
            .concat(entities.getProperty("filters", "menu") || [])
            .concat(entities.getProperty("instructions", "menu") || [])
            .map(predicate)
            .filter(predicate0);
          return next(appendTraversals(traversals));
        }
        case "contentRoots": {
          const traversals = (entities.getProperty("instructions", "menu") || [])
            .concat(entities.getProperty("dashboards", "menu") || [])
            .concat(entities.getProperty("sifters", "menu") || [])
            .concat(entities.getProperty("filters", "menu") || [])
            .map(predicate)
            .filter(predicate0);
          return next(appendTraversals(traversals));
        }
        case "usersRoots": {
          const traversals = (entities.getProperty("minions", "menu") || [])
            .concat(entities.getProperty("underbosses", "menu") || [])
            .concat(entities.getProperty("bosses", "menu") || [])
            .map(predicate)
            .filter(predicate0);
          return next(appendTraversals(traversals));
        }
        default:
          return next(appendTraversals([]));
      }
    }

    return next(action);
  };
};

export default FilesManager;