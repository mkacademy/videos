import React from 'react';
import { layoutCellPointerHandlers } from '../../../library/Shortcuts_b';
import LinkifiedText from '../../LinkifiedText';
import * as styles from '../../../styles/course.module.css';
import * as commentStyles from '../../../styles/comments.module.css';

const taggedIcon = new URL('../../../Images/tagged.png', import.meta.url).href;

export const bannerStyles = {
  row: styles['row'],
  banner: styles['banner'],
  section: styles['section'],
  dismissBtn: styles['dismissBtn'],
  siteName: styles['site-name'],
  flexCenter: styles['flex-center'],
  bgColorGray: styles['bg-color-gray'],
  textColorGray: styles['text-color-gray'],
  quoteContainer: styles['quote-container'],
  textColorWhite: styles['text-color-white'],
  bgColorPrimary: styles['bg-color-primary'],
  sectionMinH: styles['section-min-h'],
  colSm12: styles['col-sm-12'],
  colMd12: styles['col-md-12'],
  colLg6: styles['col-lg-6'],
  colXl6: styles['col-xl-6'],
};

const contCss = `flex-center p-3 p-md-5 ${bannerStyles.flexCenter}`;
const origQuoteCss = `quote ${bannerStyles.textColorGray}`;
const isHighlight = `bg-color-gray text-color-white ${bannerStyles.bgColorGray} ${bannerStyles.textColorWhite} `;

export const BannerSection: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <section
    className={`row section ${bannerStyles.row} ${bannerStyles.section} ${bannerStyles.banner}  pb-lg-3`}
  >
    {children}
  </section>
);

export interface BannerQuoteColumnProps {
  quote: string;
  isHighlighted?: boolean;
  showClipboardIcon: boolean;
  isOnClipboard: boolean;
  copyIconSrc: string;
  onSelect: (e: React.MouseEvent) => void;
  onCopyIconClick: (e: React.MouseEvent<HTMLButtonElement>) => void | Promise<void>;
  onTaggedIconClick: (e: React.MouseEvent<HTMLButtonElement>) => void | Promise<void>;
}

export const BannerQuoteColumn: React.FC<BannerQuoteColumnProps> = ({
  quote,
  isHighlighted,
  showClipboardIcon,
  isOnClipboard,
  copyIconSrc,
  onSelect,
  onCopyIconClick,
  onTaggedIconClick,
}) => (
  <div
    {...layoutCellPointerHandlers(onSelect)}
    className={`${bannerStyles.colSm12} ${bannerStyles.colMd12} ${bannerStyles.colLg6} ${bannerStyles.colXl6}`}
  >
    <div
      className={`${isHighlighted ? isHighlight + contCss : contCss}${
        showClipboardIcon ? ` ${commentStyles['copyIconHost']}` : ''
      }`}
    >
      {showClipboardIcon &&
        (isOnClipboard ? (
          <button
            type="button"
            onClick={onTaggedIconClick}
            aria-label="Remove quote from clipboard"
            className={commentStyles['copyIconButton']}
          >
            <img src={taggedIcon} alt="" className={commentStyles['copyIconImage']} />
          </button>
        ) : (
          <button
            type="button"
            onClick={onCopyIconClick}
            aria-label="Copy quote"
            className={commentStyles['copyIconButton']}
          >
            <img src={copyIconSrc} alt="Copy quote" className={commentStyles['copyIconImage']} />
          </button>
        ))}
      <q className={isHighlighted ? 'quote' : origQuoteCss}>
        &nbsp;
        <span className={bannerStyles.quoteContainer}>
          <LinkifiedText text={quote} maxLength={500} />
        </span>
        &nbsp;
      </q>
    </div>
  </div>
);

export interface BannerTitleColumnProps {
  bannerLabel: string;
  dismissHandler: (e: React.MouseEvent) => void;
  showDismiss?: boolean;
  onWrapperClick?: React.MouseEventHandler<HTMLDivElement>;
  titleColumnSelected?: boolean;
}

export const BannerTitleColumn: React.FC<BannerTitleColumnProps> = ({
  bannerLabel,
  dismissHandler,
  showDismiss = true,
  onWrapperClick,
  titleColumnSelected = false,
}) => (
  <div
    onClick={onWrapperClick}
    className={`${bannerStyles.colSm12} ${bannerStyles.colMd12} ${bannerStyles.colLg6} ${bannerStyles.colXl6} p-0`}
  >
    {showDismiss && (
      <span className={bannerStyles.dismissBtn} onClick={dismissHandler}>
        x
      </span>
    )}
    <div
      className={`flex-center p-5 bg-color-primary section-min-h ${bannerStyles.flexCenter} ${bannerStyles.bgColorPrimary} ${bannerStyles.sectionMinH}`}
      style={titleColumnSelected ? { backgroundColor: 'red' } : undefined}
    >
      <h1
        className={`text-color-white site-name ${bannerStyles.siteName} ${bannerStyles.textColorWhite}`}
      >
        {bannerLabel}
      </h1>
    </div>
  </div>
);
