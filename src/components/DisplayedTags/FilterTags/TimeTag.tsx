const badge = new URL("../../../Images/badge.png", import.meta.url).href;
import { Alert, Image } from "react-bootstrap";
import * as styles from '../../../styles/filtertags.module.css';

const styleProps = {
  timeTag: styles["timeTags"],
  timeTagText: styles["timeTagText"],
  timeTickedBadge: styles["timeTickedBadge"],
  horizontalFlexCentered: styles["HorizontalFlex-centered"],
};

interface TimeTagProps {
  removeStash: (payload: { timestamp: string; approute: string }) => void;
  timestamp: string;
  entity: string;
  parent: string;
}

const closeHandler = (
  removeStash: (payload: { timestamp: string; approute: string }) => void,
  payload: { timestamp: string; approute: string }
) => (e: React.MouseEvent) => {
  e.preventDefault();
  e.stopPropagation();
  removeStash(payload);
  e.nativeEvent.stopImmediatePropagation();
};

export default function TimeTag({ removeStash, timestamp, entity, parent }: TimeTagProps) {
  const params: [
    (payload: { timestamp: string; approute: string }) => void,
    { timestamp: string; approute: string }
  ] = [removeStash, { timestamp, approute: parent + entity }];
  
  return (
    <Alert className={styleProps.timeTag + " text-nowrap"}>
      <div className={styleProps.horizontalFlexCentered}>
        <span className={styleProps.timeTagText}>{timestamp.substring(0, 8)}</span>
        <Image
          onClick={closeHandler(...params)}
          className={styleProps.timeTickedBadge}
          roundedCircle
          src={badge}
        />
      </div>
    </Alert>
  );
}
