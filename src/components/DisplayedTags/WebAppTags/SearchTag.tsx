import React from 'react';
import { Image } from 'react-bootstrap';
const badge = new URL("../../../Images/badge.png", import.meta.url).href;
const tick = new URL("../../../Images/Green-check-mark.png", import.meta.url).href;
import { Search } from '../../../store/slices/searchSlice';
import * as styles from '../../../styles/searchtags.module.css';
interface SearchTagProps {
  index: number;
  search: Search;
  yoinkIndex: number;
  isLoading: boolean;
  horizontalFlex: string;
  markSearch: (payload: Search) => void;
  unmarkSearch: (payload: Search) => void;
  removeSearch: (payload: Search) => void;
}

const closeHandler = (
  search: SearchTagProps['search'],
  removeSearch: SearchTagProps['removeSearch'],
  unmarkSearch: SearchTagProps['unmarkSearch'],
  isLoading: boolean
) => (e: React.MouseEvent) => {
  e.preventDefault();
  e.stopPropagation();
  e.nativeEvent.stopImmediatePropagation();
  if (!isLoading) {
    removeSearch(search);
    unmarkSearch(search);
  }
};

const SearchTag: React.FC<SearchTagProps> = ({
  search,
  index,
  isLoading,
  markSearch,
  yoinkIndex,
  unmarkSearch,
  removeSearch,
  horizontalFlex,
}) => {
  const selected = yoinkIndex > -1;
  const highlight = yoinkIndex === index;
  const params = [search, removeSearch, unmarkSearch, isLoading] as const;
  const markHandler = () => {
    if (selected) unmarkSearch(search);
    else markSearch(search);
  };
  const tagsly = 'fade alert alert-primary text-nowrap show';
  const highlighter = styles["defaultCss"] + ' ' + styles["highlightCss"]
  const appliedClass = highlight ? highlighter : styles["defaultCss"];
  const tagClass = ` ${appliedClass} ${tagsly}`;
  return (
    <div role="alert" className={tagClass}>
      <div className={horizontalFlex}>
        <span
          className={styles["searchTagText"]}
          onClick={!isLoading ? markHandler : undefined}
        >
          {search.keyword}
        </span>
        <Image
          roundedCircle
          className={styles["closeBadge"]}
          src={selected ? tick : badge}
          onClick={selected ? undefined : closeHandler(...params)}
        />
      </div>
    </div>
  );
};

export default SearchTag; 