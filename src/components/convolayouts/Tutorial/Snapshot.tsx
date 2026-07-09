import React from 'react';
import { placeholder, textEllipsis } from "../../../utils";
import { isImageDataUrlOrPlaceholder, isValidDataUrl } from '../../views/Instruction';
import { contCss, isHighlight, SlideType, slideStyles } from '../Tutorial/Content';

interface SnapshotProps {
  slide: SlideType;
  showDismiss?: boolean;
  onDismiss?: (e: React.MouseEvent) => void;
  onSnapshotClick?: (e: React.MouseEvent) => void;
}

const Snapshot: React.FC<SnapshotProps> = ({
  slide: { imageurl = "", isHighlighted = false } = {
    id: -1,
    imageurl: "",
    isHighlighted: false,
  },
  showDismiss = false,
  onDismiss,
  onSnapshotClick,
}) => {
  const showAsImage = isImageDataUrlOrPlaceholder(imageurl);
  const imageUrl = isValidDataUrl(imageurl) ? imageurl : placeholder;

  return (
    <React.Fragment>
      {showAsImage ? (
        <div className={`${slideStyles.colSm12} ${slideStyles.colMd12} ${slideStyles.colLg6} ${slideStyles.colXl6} p-0 ${slideStyles.controlsRow}`}>
          {showDismiss && (
            <span className={slideStyles.dismissBtn} onClick={onDismiss}>
              x
            </span>
          )}
          <img
            src={imageUrl}
            alt="placeholder"
            className="img-fluid"
            onClick={onSnapshotClick}
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = placeholder;
            }}
          />
        </div>
      ) : (
        <div className={`${slideStyles.colSm12} ${slideStyles.colMd12} ${slideStyles.colLg6} ${slideStyles.colXl6}`}>
          {showDismiss && (
            <span className={slideStyles.dismissBtn} onClick={onDismiss}>
              x
            </span>
          )}
          <div onClick={onSnapshotClick} className={isHighlighted ? isHighlight + contCss : contCss}>
            <div className={`flex-center flex-col ${slideStyles.flexCenter} ${slideStyles.flexCol}`}>
              <p className={`text-container ${slideStyles.textContainer}`}>
                <span className={slideStyles.quoteContainer}>
                  {textEllipsis(imageurl)}
                </span>
              </p>
            </div>
          </div>
        </div>
      )}
    </React.Fragment>
  );
};

export default Snapshot;
