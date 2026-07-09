import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../../store/types';
import {
  copyBannerIdToClipboard,
  removeBannerIdFromClipboard,
} from '../../../library/EncodingVerifierUtils';
import { useBannerIdOnClipboard } from '../../../Hooks/useBannerIdOnClipboard';
import { resetChapters } from '../../../store/slices/courseSlice';
import {
  BannerSection,
  BannerQuoteColumn,
  BannerTitleColumn,
} from '../Tutorial/Container';
import { prependError } from '../../../store/slices/errorSlice';

const courseCopyIcon = new URL('../../../Images/course_copy.png', import.meta.url).href;

interface BannerProps {
  id: number;
  total?: number;
  title: string;
  quote: string;
  leftQuote?: boolean;
  isHighlighted?: boolean;
  titleColumnSelected?: boolean;
  onWrapperClick?: React.MouseEventHandler<HTMLDivElement>;
  selector: (payload: { ids: number[] }) => void;
}

const bannerKind = 'tutorial';

const Banner: React.FC<BannerProps> = ({
  id,
  total,
  title,
  quote,
  selector,
  leftQuote,
  isHighlighted,
  onWrapperClick,
  titleColumnSelected = false,
}) => {
  const dispatch = useDispatch();
  const copyIcon = courseCopyIcon;
  const banner = `${title.toUpperCase()} (${total ?? 0})`;
  const showCopyIcons = useSelector((state: RootState) => state.settings.showCopyIcons);
  const aquiredClipboardConsent = useSelector((state: RootState) => state.settings.aquiredClipboardConsent);
  const { isOnClipboard, recheck, clipboardCheckComplete } = useBannerIdOnClipboard(
    bannerKind,
    id,
    showCopyIcons,
    aquiredClipboardConsent,
  );
  const showClipboardIcon = showCopyIcons && clipboardCheckComplete;

  const dismissHandler = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dispatch(resetChapters());
    dispatch(prependError('Chapter mode disabled'));
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
        onWrapperClick={onWrapperClick}
        titleColumnSelected={titleColumnSelected}
      />
      {!leftQuote && <BannerQuoteColumn {...quoteColumnProps} />}
    </BannerSection>
  );
};

export default Banner;
