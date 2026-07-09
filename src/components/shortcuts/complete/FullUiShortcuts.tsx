import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../../store/types';
import { clearEscrow, toggleLayout } from '../../../store/slices/viewSlice';
import { escrowContents, escrowRows } from '../../../library/actions';
import {
  clearFetched,
  overviewOrdinals,
  cacheContent,
  createMocks,
  createOrdering,
  deleteOverview,
  joinOverview,
  showForms,
  unjoinOverview,
  unzipContent,
  zipContent,
  rezipContent,
  highlightAll,
  unHighlightAll,
  clearHighlighted,
  invertHighlighted,
} from '../../../library/actions';
import { clearData as clearReducers } from '../../../store/slices/rowSlice';
import { prependError } from '../../../store/slices/errorSlice';
import { mutatePrefix, toggleDismissed as setDismissed } from '../../../store/slices/sessionSlice';
import Cruds from '../Cruds';
import Editor from '../Editor';
import FullNavigation from './FullNavigation';
import FullAccount from './FullAccount';
import Roots from '../../convolayouts/Modals/Roots';
import { getCurAppName } from '../../../utils';
import { useSignOut } from '../../../Hooks/useSignOut';
import * as styles from '../../../styles/shortcuts.module.css';
import { FullShortcutsProps } from '../ShortcutsProps';

const FullUiShortcuts: React.FC<FullShortcutsProps> = ({ saver, loading, convCss, formatter }) => {
  const dispatch = useDispatch();
  const [isOpen, setIsOpen] = useState(false);
  const entity = useSelector((state: RootState) => state.view.entity);
  const urlParams = useSelector((state: RootState) => state.view.params);
  const webapp = useSelector((state: RootState) => state.session.curApp);
  const parentData = useSelector((state: RootState) => state.view.parentData);
  const encodedDatas = useSelector((state: RootState) => state.pagination.cs);
  const dismissals = useSelector((state: RootState) => state.session.dismissals);
  const showCuts = useSelector((state: RootState) => state.session.showShortcuts);
  const defaultTake = useSelector((state: RootState) => state.session.defaultTake);
  const authenticated = useSelector((state: RootState) => state.session.authenticated);
  const IsProcessing = useSelector((state: RootState) => state.view.requestIsProcessing);
  const isNotUnzipping = useSelector((state: RootState) => state.settings.isNotUnzipping);
  const senderIndex = useSelector((state: RootState) => state.comms.tutors.findIndex(({ checked }) => checked));

  const app = getCurAppName(webapp.toString());
  const cssClass = convCss.endsWith('cpanel') ? styles['cShortContainer'] : '';
  const handleSignOut = useSignOut();

  const styleProps = {
    shortcut: styles['shortcut'],
    'shortcut-Container': styles['shortcut-Container'],
    [convCss]: convCss.endsWith('cpanel') ? styles['cpanel'] : convCss,
  };

  if (!showCuts) return null;

  return (
    <div className={`${styles['shortcuts']} ${cssClass}`}>
      <Editor
        entity={entity || ''}
        webapp={webapp}
        convCss={convCss}
        styles={styleProps}
        urlParams={urlParams}
        defaultTake={defaultTake}
        toggle={() => dispatch(toggleLayout())}
        clearData={() => dispatch(clearReducers())}
        clearTabulator={() => dispatch(clearEscrow())}
        updateOrdinals={() => dispatch(overviewOrdinals())}
        cacheSelected={(key) => dispatch(cacheContent(key))}
        throwError={(error) => dispatch(prependError(error))}
        setPrefix={(prefix) => dispatch(mutatePrefix(prefix))}
        saveRows={(payload) => dispatch(escrowRows(payload))}
        parentData={parentData || { parent: '', curApp: webapp, IDs: [] }}
        saveContent={(payload) => dispatch(escrowContents(payload))}
      />
      <Cruds
        convCss={convCss}
        styles={styleProps}
        setIsOpen={setIsOpen}
        authenticated={authenticated}
        launchzipper={() => dispatch(zipContent())}
        launchrezipper={() => dispatch(rezipContent())}
        launchunzipper={() => dispatch(unzipContent())}
        launchEditor={(pathname) => dispatch(showForms(pathname))}
        launchMokito={(pathname) => dispatch(createMocks(pathname))}
        launchJoiner={(pathname) => dispatch(joinOverview(pathname))}
        launchDeleter={(pathname) => dispatch(deleteOverview(pathname))}
        launchUnjoiner={(pathname) => dispatch(unjoinOverview(pathname))}
        launchOrdering={(pathname) => dispatch(createOrdering(pathname))}
      />
      <FullNavigation
        webapp={webapp}
        convCss={convCss}
        styles={styleProps}
        senderIndex={senderIndex}
        encodedDatas={encodedDatas}
        clearData={() => dispatch(clearReducers())}
        clearTabulator={() => dispatch(clearEscrow())}
      />
      <FullAccount
        webapp={app}
        saver={saver}
        entity={entity}
        loading={loading}
        convCss={convCss}
        styles={styleProps}
        formatter={formatter}
        setIsOpen={setIsOpen}
        dismissals={dismissals}
        IsProcessing={IsProcessing}
        handleSignOut={handleSignOut}
        authenticated={authenticated}
        isNotUnzipping={isNotUnzipping}
        clearData={() => dispatch(clearReducers())}
        saveRows={(payload) => dispatch(escrowRows(payload))}
        showError={(payload) => dispatch(prependError(payload))}
        selectall={(pathname) => dispatch(highlightAll(pathname))}
        saveContent={(payload) => dispatch(escrowContents(payload))}
        unSelectall={(pathname) => dispatch(unHighlightAll(pathname))}
        toggleDismissed={(pathname) => dispatch(setDismissed(pathname))}
        clearSelections={(pathname) => dispatch(clearHighlighted(pathname))}
        invertSelections={(pathname) => dispatch(invertHighlighted(pathname))}
        clearDismissed={({ pathname, payload }) => dispatch(clearFetched({ pathname, payload }))}
      />
      <Roots headline={app} isShow={isOpen} showRoots={setIsOpen} />
    </div>
  );
};

export default FullUiShortcuts;
