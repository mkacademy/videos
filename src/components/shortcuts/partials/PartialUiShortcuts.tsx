import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../../store/types';
import { UnzipAndHydrate, hydrateSkeletons } from '../../../library/actions';
import PartialNavigation from './PartialNavigation';
import PartialAccount from './PartialAccount';
import { getCurAppName } from '../../../utils';
import { useSignOut } from '../../../Hooks/useSignOut';
import * as styles from '../../../styles/shortcuts.module.css';
import { PartialShortcutsProps } from '../ShortcutsProps';
import { prependError } from '../../../store/slices/errorSlice';
import Roots from '../../convolayouts/Modals/Roots';

const PartialUiShortcuts: React.FC<PartialShortcutsProps> = ({ convCss, formatter, skeletons, loading }) => {
  const dispatch = useDispatch();
  const [isOpen, setIsOpen] = useState(false);
  const webapp = useSelector((state: RootState) => state.session.curApp);
  const showCuts = useSelector((state: RootState) => state.session.showShortcuts);
  const authenticated = useSelector((state: RootState) => state.session.authenticated);
  const isUnzipCourses = useSelector((state: RootState) => state.settings.isUnzipCourses);
  const isUnzipQuizzes = useSelector((state: RootState) => state.settings.isUnzipQuizzes);
  const isUnzipTutorials = useSelector((state: RootState) => state.settings.isUnzipTutorials);
  const isNotUnzipping = useSelector((state: RootState) => state.settings.isNotUnzipping);
  const isNotSkeletons = useSelector((state: RootState) => state.settings.isNotSkeletons);
  const app = getCurAppName(webapp.toString());
  const cssClass = convCss.endsWith('cpanel') ? styles['cShortContainer'] : '';
  const handleSignOut = useSignOut();

  useEffect(() => {
    if (!isNotUnzipping) dispatch(UnzipAndHydrate());
  }, [isNotUnzipping]);

  useEffect(() => {
    if (!isNotSkeletons) dispatch(hydrateSkeletons());
  }, [isNotSkeletons]);

  const styleProps = {
    shortcut: styles['shortcut'],
    'shortcut-Container': styles['shortcut-Container'],
    [convCss]: convCss.endsWith('cpanel') ? styles['cpanel'] : convCss,
  };

  if (!showCuts) return null;

  return (
    <div className={`${styles['shortcuts']} ${cssClass}`}>
      <PartialNavigation
        convCss={convCss}
        styles={styleProps}
        isUnzipCourses={isUnzipCourses}
        isUnzipQuizzes={isUnzipQuizzes}
        isUnzipTutorials={isUnzipTutorials}
      />
      <PartialAccount
        webapp={app}
        loading={loading}
        convCss={convCss}
        styles={styleProps}
        formatter={formatter}
        skeletons={skeletons}
        handleSignOut={handleSignOut}
        authenticated={authenticated}
        isNotUnzipping={isNotUnzipping}
        isNotSkeletons={isNotSkeletons}
        showError={(payload) => dispatch(prependError(payload))}
      />
      <Roots headline={app} isShow={isOpen} showRoots={setIsOpen} />
    </div>
  );
};

export default PartialUiShortcuts;
