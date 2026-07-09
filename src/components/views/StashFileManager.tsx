import React, { useRef, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { getCurAppName } from '../../utils';
import { isCommentsStashRoutesData } from '../../library/commentsStashUtils';
import { appendImports, exportTexts, importStash } from '../../library/actions';
import { tryStringifyForExport } from '../../library/jsonStringifyUtils';
import { clearExports } from '../../store/slices/viewSlice';
import { prependError } from '../../store/slices/errorSlice';
import { RootState } from '../../store/types';
import { DataRow } from '../Core/types';

const exportTextsType = exportTexts.type;
const importStashType = importStash.type;

const getFilename = (webapp: string): string => `stash_${webapp}_${Date.now()}`;

const isStashRoutesRecord = (value: unknown): value is Record<string, DataRow[]> =>
  typeof value === 'object' &&
  value !== null &&
  !Array.isArray(value) &&
  Object.values(value).every((v) => Array.isArray(v));

/**
 * Stash export/import for profile C (Ctrl+Shift+C / Ctrl+Shift+D).
 * Export: {@link exportSelectedCascadingStashRoutes} → `viewExports.exportedDatas`.
 * Import: {@link beginImportSelectedStashRoutes} → `initFileManager(importStash)` (PNC: Escrowed_items group; member apps: escrowTimestamp).
 */
const StashFileManager: React.FC = () => {
  const dispatch = useDispatch();
  const actionType = useSelector((state: RootState) => state.view.actionType);
  const exportedDatas = useSelector((state: RootState) => state.view.exportedDatas);
  const curApp = useSelector((state: RootState) => state.session.curApp);
  const action = useRef<string | undefined>(undefined);
  const fileRef = useRef<HTMLInputElement>(null);

  if (actionType) action.current = actionType;

  const readFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    const { files } = event.target;
    if (!files || files.length === 0) return;

    fileReader.readAsText(files[0], 'UTF-8');
    fileReader.onload = (e) => {
      try {
        const parsed: unknown = JSON.parse(e.target?.result as string);
        if (!isStashRoutesRecord(parsed)) {
          dispatch(prependError('Stash import file must be a JSON object keyed by approute.'));
          return;
        }
        dispatch(
          appendImports({
            data: parsed,
            actionType: action.current || importStashType,
          })
        );
      } catch (error) {
        dispatch(prependError(`unknown format ${error}`));
      }
    };
    event.target.value = '';
  };

  useEffect(() => {
    if (exportedDatas && actionType === exportTextsType) {
      const webapp = getCurAppName(curApp);
      const fileName =
        isCommentsStashRoutesData(exportedDatas)
          ? `Stash_comments_${Date.now()}`
          : getFilename(webapp);
      const stringifyResult = tryStringifyForExport(exportedDatas, 2);
      if (!stringifyResult.ok) {
        dispatch(prependError(stringifyResult.message));
        dispatch(clearExports());
        return;
      }
      const blob = new Blob([stringifyResult.json], { type: 'application/json' });
      const href = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = href;
      link.download = `${fileName}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(href);
      dispatch(clearExports());
      return;
    }

    if (actionType === importStashType) {
      setTimeout(() => {
        dispatch(clearExports());
        fileRef.current?.click();
      }, 500);
    }
  }, [actionType, exportedDatas, curApp, dispatch]);

  return (
    <div style={{ display: 'none' }}>
      <input ref={fileRef} type="file" accept=".json,application/json" onChange={readFile} />
    </div>
  );
};

export default StashFileManager;
