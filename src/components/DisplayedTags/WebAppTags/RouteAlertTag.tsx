import React from 'react';
import * as styles from '../../../styles/searchtags.module.css';

interface RouteAlertTagProps {
  routeAlias: string;
  horizontalFlex: string;
  selected?: boolean;
  onSelect?: () => void;
}

const RouteAlertTag: React.FC<RouteAlertTagProps> = ({
  routeAlias,
  horizontalFlex,
  selected,
  onSelect,
}) => {
  const clickable = !!onSelect && !selected;
  const selectedClass = selected ? styles['selectedCss'] : '';
  const clickableClass = clickable ? styles['clickable'] : '';
  const tagClass = `${styles['greyCss']} ${selectedClass} ${clickableClass} fade alert text-nowrap show`;
  const handleClick = clickable ? onSelect : undefined;
  return (
    <div role="alert" className={tagClass} onClick={handleClick}>
      <div className={horizontalFlex}>
        <span className={styles['searchTagText']}>{routeAlias}</span>
      </div>
    </div>
  );
};

export default RouteAlertTag;
