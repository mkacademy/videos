import React from 'react';
import { Image } from "react-bootstrap";
const pickedout = new URL("../../../Images/green_dot.png", import.meta.url).href;
const unselected = new URL("../../../Images/black_dot.png", import.meta.url).href;
import { Search, SelectedRoute } from '../../../store/slices/searchSlice';
interface RouteTagProps {
  to: string;
  from: string;
  name?: string;
  index: number;
  toIMG?: string;
  fromIMG?: string;
  selected: boolean;
  isLoading: boolean;
  keywords: Array<Search>;
  setSelected: (payload: SelectedRoute | number) => void;
  setPaginated: (payload: [number, string] | string) => void;
  styles: {
    menutag: string,
    search: string,
    alert: string,
    thumbs: string,
    toBadge: string,
    fromBadge: string,
    filterBadge: string,
    verticalFlex: string
    small_thumbs: string,
    HorizantolFlex: string,
  };
}
const RouteTag: React.FC<RouteTagProps> = ({
  to,
  from,
  index,
  toIMG,
  fromIMG,
  keywords,
  selected,
  isLoading,
  setSelected,
  setPaginated,
  styles,
}) => {
  const dispathcers = (payload: SelectedRoute) => {
    setPaginated(payload.traversal);
    setSelected(payload);
  };
  const dotImg = selected ? pickedout : unselected;
  const payload = { traversal: from + to, keywords, index };
  const setter = !selected && !isLoading ? () => dispathcers(payload) : undefined;
  const updexer = selected && !isLoading ? () => setSelected(index + 1) : undefined;
  const dndexer = selected && !isLoading ? () => setSelected(index - 1) : undefined;
  return (
    <div role="alert" className={`fade alert alert-primary ${styles.menutag} ${styles.alert} show`}>
      <div className={styles.HorizantolFlex}>
        <div className={`${styles.thumbs} ${styles.HorizantolFlex}`}>
          <Image src={fromIMG} className={styles.fromBadge} />
          <Image src={toIMG} className={styles.toBadge} onClick={setter} />
        </div>
        <div className={`${styles.small_thumbs} ${styles.verticalFlex}`}>
          <Image
            onClick={updexer}
            src={dotImg}
            roundedCircle
            className={styles.filterBadge}
          />
          <Image
            onClick={dndexer}
            roundedCircle
            src={dotImg}
            className={`${styles.filterBadge} ${styles.search}`}
          />
        </div>
      </div>
    </div>
  );
};

export default RouteTag; 