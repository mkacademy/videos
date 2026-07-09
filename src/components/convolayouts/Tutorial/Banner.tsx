import React, { RefObject } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../../store/types';
import { useLocation } from 'react-router-dom';
import type { BannerClipboardKind } from '../../../library/EncodingVerifierUtils';
import {
  copyBannerIdToClipboard,
  removeBannerIdFromClipboard,
} from '../../../library/EncodingVerifierUtils';
import { useBannerIdOnClipboard } from '../../../Hooks/useBannerIdOnClipboard';
import {
  BannerSection,
  BannerQuoteColumn,
  BannerTitleColumn,
} from './Container';

const tutorialCopyIcon = new URL('../../../Images/tutorial_copy.png', import.meta.url).href;
const courseCopyIcon = new URL('../../../Images/course_copy.png', import.meta.url).href;

interface BannerProps {
  id: number;
  total?: number;
  title: string;
  quote: string;
  isShow?: boolean;
  leftQuote?: boolean;
  isHighlighted?: boolean;
  positionY?: RefObject<number>;
  toggler: (payload: { selectedId?: number; canToggle?: boolean }) => void;
  dismisser?: (payload: { id: number; isShow?: boolean }) => void;
  selector: (payload: { ids: number[] }) => void;
}

const Banner: React.FC<BannerProps> = ({
  id,
  total,
  title,
  quote,
  isShow,
  toggler,
  selector,
  dismisser,
  leftQuote,
  positionY,
  isHighlighted,
}) => {
  const { pathname } = useLocation();
  const isTutorial = pathname.includes('/convolution/tutorial');
  const bannerKind: BannerClipboardKind = isTutorial ? 'tutorial' : 'course';
  const copyIcon = isTutorial ? tutorialCopyIcon : courseCopyIcon;
  const banner = `${title.toUpperCase()} (${total ?? 0})`;
  const isClickable = leftQuote !== undefined;
  const isMaximumFeatures = useSelector((state: RootState) =>
    !state.settings.isUnzipCourses && !state.settings.isUnzipQuizzes && !state.settings.isUnzipTutorials);
  const showCopyIcons = useSelector((state: RootState) => state.settings.showCopyIcons);
  const aquiredClipboardConsent = useSelector((state: RootState) => state.settings.aquiredClipboardConsent);
  const { isOnClipboard, recheck, clipboardCheckComplete } = useBannerIdOnClipboard(
    bannerKind,
    id,
    showCopyIcons,
    aquiredClipboardConsent,
  );
  const showClipboardIcon = showCopyIcons && clipboardCheckComplete;
  const onExit = () => {
    if (positionY?.current && positionY.current > -1)
      setTimeout(() => window.scrollTo(0, positionY.current), 500);
    toggler({ selectedId: id });
  };

  const dismissHandler = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isClickable) onExit();
    else dismisser?.({ id, isShow });
  };

  const selectHandler = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    selector({ ids: [id] });
  };
  const onCopyIconClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    await copyBannerIdToClipboard(bannerKind, id, showCopyIcons, aquiredClipboardConsent);
    recheck();
  };

  const onTaggedIconClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    await removeBannerIdFromClipboard(bannerKind, id, showCopyIcons, aquiredClipboardConsent);
    recheck();
  };

  const quoteColumnProps = {
    quote,
    isHighlighted,
    showClipboardIcon,
    isOnClipboard,
    copyIconSrc: copyIcon,
    onSelect: selectHandler,
    onCopyIconClick,
    onTaggedIconClick,
  };

  return (
    <BannerSection>
      {leftQuote && <BannerQuoteColumn {...quoteColumnProps} />}
      <BannerTitleColumn
        bannerLabel={banner}
        dismissHandler={dismissHandler}
        showDismiss={isMaximumFeatures || !isClickable}
        onWrapperClick={isClickable ? () => toggler({ selectedId: id }) : undefined}
      />
      {!leftQuote && <BannerQuoteColumn {...quoteColumnProps} />}
    </BannerSection>
  );
};

export default Banner;
