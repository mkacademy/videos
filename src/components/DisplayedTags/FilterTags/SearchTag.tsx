import { useState } from "react";
const badge = new URL("../../../Images/badge.png", import.meta.url).href;
import { Alert, Image } from "react-bootstrap";
const tick = new URL("../../../Images/Green-check-mark.png", import.meta.url).href;
import * as styles from '../../../styles/filtertags.module.css';

const styleProps = {
  searchTag: styles["searchTags"],
  searchTagText: styles["searchTagText"],
  searchCloseBadge: styles["searchCloseBadge"],
  HorizontalFlex: styles["HorizontalFlex"],
};
interface SearchTagProps {
  search: string;
  selected: boolean;
  markSearch: (search: string) => void;
  unmarkSearch: (search: string) => void;
  removeSearch: (search: string) => void;
}

const closeHandler = (
  search: string, 
  removeSearch: (search: string) => void, 
  unmarkSearch: (search: string) => void
) => (e: React.MouseEvent<HTMLImageElement>) => {
  e.preventDefault();
  e.stopPropagation();
  removeSearch(search);
  unmarkSearch(search);
  e.nativeEvent.stopImmediatePropagation();
};

export default function SearchTag({
  search,
  selected,
  markSearch,
  unmarkSearch,
  removeSearch,
}: SearchTagProps) {
  const [marked, setMarked] = useState<boolean>(selected);
  const params: [string, (search: string) => void, (search: string) => void] = [search, removeSearch, unmarkSearch];
  
  return (
    <Alert className={styleProps.searchTag + " text-nowrap"}>
      <div className={styleProps.HorizontalFlex}>
        <span
          className={styleProps.searchTagText}
          onClick={() => {
            setMarked((marked) => !marked);
            if (marked) unmarkSearch(search);
            else markSearch(search);
          }}
        >
          {search}
        </span>
        <Image
          roundedCircle
          className={styleProps.searchCloseBadge}
          src={marked ? tick : badge}
          onClick={marked ? undefined : closeHandler(...params)}
        />
      </div>
    </Alert>
  );
}
