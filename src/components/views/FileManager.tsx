import React, { useRef, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { getAlias } from '../../utils';
import { appendImports,
  exportAlgorithm,
  exportTexts,
  exportTraversals,
  importAlgorithm,
  importTexts,
  importTraversals,
} from '../../library/actions';
import { clearExports } from '../../store/slices/viewSlice';
import { prependError } from '../../store/slices/errorSlice';
import { tryStringifyForExport } from '../../library/jsonStringifyUtils';
import { RootState } from '../../store/types';
import { DataRow } from '../Core/types';

const exporttypes = [exportTexts.type, exportAlgorithm.type, exportTraversals.type];
const importtypes = [importTexts.type, importAlgorithm.type, importTraversals.type];

const getFilename = (entity: string | undefined, actionType: string): string => {
  switch (actionType) {
    case exportTraversals.type:
      return "history_" + Date.now();
    case exportAlgorithm.type:
      return "algorithm_" + Date.now();
    case exportTexts.type:  
      return getAlias(entity || 'unknown') + "_" + Date.now();
    default:
      throw Error("unknown file action " + actionType);
  }
};

const FileManager: React.FC = () => {
  const dispatch = useDispatch();
  
  // Using one useSelector per prop as requested
  const entity = useSelector((state: RootState) => state.view.entity);
  const actionType = useSelector((state: RootState) => state.view.actionType);
  const exportedData = useSelector((state: RootState) => state.view.exportedData);
  const action = useRef<string | undefined>(undefined);
  const fileRef = useRef<HTMLInputElement>(null);
  
  if (actionType) action.current = actionType;

  const readFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    const { files } = event.target;
    if (!files || files.length === 0) return;
    
    fileReader.readAsText(files[0], "UTF-8");
    fileReader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        dispatch(appendImports({
          data: JSON.parse(content) as DataRow[],
          actionType: action.current || '',
        }));
      } catch (error) {
        dispatch(prependError("unknown format " + error));
      }
    };
    event.target.value = '';
  };

  useEffect(() => {
    if (actionType && (exporttypes as readonly string[]).includes(actionType)) {
      setTimeout(() => {
        // create file in browser
        const fileName = getFilename(entity, actionType || '');
        const stringifyResult = tryStringifyForExport(exportedData, 2);
        if (!stringifyResult.ok) {
          dispatch(prependError(stringifyResult.message));
          dispatch(clearExports());
          return;
        }
        const blob = new Blob([stringifyResult.json], { type: "application/json" });
        const href = URL.createObjectURL(blob);
        
        // create "a" HTML element with href to file
        const link = document.createElement("a");
        link.href = href;
        link.download = fileName + ".json";
        document.body.appendChild(link);
        link.click();
        
        // clean up "a" element & remove ObjectURL
        document.body.removeChild(link);
        URL.revokeObjectURL(href);
        dispatch(clearExports());
      });
    } else if (actionType && (importtypes as readonly string[]).includes(actionType)) {
      setTimeout(() => {
        dispatch(clearExports());
        fileRef.current?.click();
      }, 500);
    } else if (actionType !== undefined) {
      dispatch(prependError("unknown file action " + actionType));
    }
  }, [actionType, entity, exportedData, dispatch]);

  return (
    <div style={{ display: "none" }}>
      <input
        ref={fileRef}
        type="file"
        onChange={readFile}
        onAbort={() => console.log("File selection aborted")}
      />
    </div>
  );
};

export default FileManager;
