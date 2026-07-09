import React from 'react';
import { Image } from 'react-bootstrap';

const stash = new URL('../../Images/stash.png', import.meta.url).href;
const tabled = new URL('../../Images/listView-dark.png', import.meta.url).href;
const showcased = new URL('../../Images/gridView-dark.png', import.meta.url).href;
const convolution = new URL('../../Images/convolution.png', import.meta.url).href;

import { useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Tree, getCurAppName, cookIngredients } from '../../utils';
import { ParentData } from '../../store/slices/viewSlice';
import { AppDispatch, RootState } from '../../store';
import { navigateConvolutionOrWarn } from '../../library/convolutionNavSearch';

interface EditorProps {
  toggle: () => void;
  entity: string;
  webapp: number;
  convCss: string;
  saveRows: (entity: string) => void;
  clearData: () => void;
  urlParams: {
    target?: string;
  };
  setPrefix: (prefix: string) => void;
  parentData: ParentData;
  throwError: (error: string) => void;
  defaultTake: number;
  saveContent: (entity: string) => void;
  cacheSelected: (key: string) => void;
  clearTabulator: () => void;
  updateOrdinals: () => void;
  styles: {
    shortcut: string;
    [key: string]: string;
    'shortcut-Container': string;
  };
}

const Editor: React.FC<EditorProps> = ({
  toggle,
  entity,
  webapp,
  convCss,
  saveRows,
  clearData,
  urlParams,
  setPrefix,
  parentData,
  throwError,
  defaultTake,
  saveContent,
  cacheSelected,
  clearTabulator,
  updateOrdinals,
  styles
}) => {
  const { target } = urlParams;
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { pathname, search } = useLocation();
  const shouldHydrate = useSelector((state: RootState) => state.settings.shouldHydrate);
  const fsq = useSelector((state: RootState) => state.settings.fsq);
  const isApp = pathname.startsWith("/app");
  const cssClass = styles.shortcut + " " + (styles[convCss] ?? "");
  const container = styles['shortcut-Container'] + " " + (styles[convCss] ?? "");

  const ingredients = {
    toggle: true,
    defaultTake,
    parentData: {
      IDs: parentData.IDs?.map(id => id.toString()) || [],
      curApp: parentData.curApp || 0,
      parent: parentData.parent || ''
    },
    entity,
    search,
  };

  const handleCookIngredients = () => {
    const result = cookIngredients(ingredients);
    if (!result) return;
    return result;
  };

  return (
    <React.Fragment>
      {isApp && (
        <React.Fragment>
          <div
            className={container}
            onClick={() => {
              if (target) {
                if (!Tree.isEntity(entity))
                  return throwError("error_unknown_entity");
                const result = handleCookIngredients();
                if (result) {
                  setTimeout(() => saveRows(entity));
                  setPrefix(result.pfx);
                  navigate(result.url);
                }
              } else toggle();
            }}
          >
            <Image className={cssClass} src={showcased} />
          </div>
          <div
            className={container}
            onClick={() => {
              if (!target) {
                const result = handleCookIngredients();
                if (result) {
                  setTimeout(() => saveContent(entity));
                  setPrefix(result.pfx);
                  navigate(result.url);
                }
              }
            }}
          >
            <Image className={cssClass} src={tabled} />
          </div>
          <div
            className={container}
            onClick={() => {
              const { parent } = parentData;
              cacheSelected(parent + entity);
            }}
          >
            <Image className={cssClass} src={stash} />
          </div>
          <div
            className={container}
            onClick={() => {
              if (webapp > 0) {
                const app = getCurAppName(webapp);
                setTimeout(() => clearData(), 100);
                navigateConvolutionOrWarn(
                  dispatch,
                  navigate,
                  '/convolution/' + app,
                  undefined,
                  { shouldHydrate, fsq },
                );
                updateOrdinals();
                clearTabulator();
              }
            }}
          >
            <Image className={cssClass} src={convolution} />
          </div>
        </React.Fragment>
      )}
    </React.Fragment>
  );
};

export default Editor; 