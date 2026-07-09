import React from 'react';
import { RootState } from '../../store/types';
import { useSelector } from 'react-redux';
import FullUiShortcuts from '../shortcuts/complete/FullUiShortcuts';
import PartialUiShortcuts from '../shortcuts/partials/PartialUiShortcuts';
import { ShortcutsProps } from '../shortcuts/ShortcutsProps';
const UiShortcuts: React.FC<ShortcutsProps> = ({ saver, loading, convCss, formatter, skeletons }) => {
  const isUnzipTutorials = useSelector((state: RootState) => state.settings.isUnzipTutorials);
  const isUnzipCourses = useSelector((state: RootState) => state.settings.isUnzipCourses);
  const isUnzipQuizzes = useSelector((state: RootState) => state.settings.isUnzipQuizzes);
  const isMaximumFeatures = !isUnzipCourses && !isUnzipQuizzes && !isUnzipTutorials;
  return isMaximumFeatures
    ? <FullUiShortcuts
      saver={saver}
      loading={loading}
      convCss={convCss}
      formatter={formatter} />
    : <PartialUiShortcuts
      loading={loading}
      convCss={convCss}
      formatter={formatter}
      skeletons={skeletons} />;
};

export default UiShortcuts; 