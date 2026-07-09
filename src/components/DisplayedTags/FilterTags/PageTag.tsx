import { useState } from "react";
const badge = new URL("../../../Images/badge.png", import.meta.url).href;
import { Alert, Image } from "react-bootstrap";
const tick = new URL("../../../Images/Green-check-mark.png", import.meta.url).href;
import * as styles from '../../../styles/filtertags.module.css';

const styleProps = {
  pageTag: styles["pageTags"],
  pageTagText: styles["pageTagText"],
  pageCloseBadge: styles["pageCloseBadge"],
  HorizontalFlex: styles["HorizontalFlex"],
};

interface PageTagProps {
  page: string;
  selected: boolean;
  removePage: (page: string) => void;
  unmarkSearch: (page: string) => void;
  markSearch: (page: string) => void;
}

const closeHandler = (
  page: string, 
  removePage: (page: string) => void, 
  unmarkSearch: (page: string) => void
) => (e: React.MouseEvent<HTMLImageElement>) => {
  removePage(page);
  unmarkSearch(page);
  e.preventDefault();
  e.stopPropagation();
  e.nativeEvent.stopImmediatePropagation();
};

export default function PageTag({
  page,
  selected,
  removePage,
  unmarkSearch,
  markSearch,
}: PageTagProps) {
  const [marked, setMarked] = useState<boolean>(selected);
  const params: [string, (page: string) => void, (page: string) => void] = [page, removePage, unmarkSearch];
  
  return (
    <Alert className={styleProps.pageTag + " text-nowrap"}>
      <div className={styleProps.HorizontalFlex}>
        <span
          className={styleProps.pageTagText}
          onClick={() => {
            setMarked((marked) => !marked);
            if (marked) unmarkSearch(page);
            else markSearch(page);
          }}
        >
          {page}
        </span>
        <Image
          roundedCircle
          className={styleProps.pageCloseBadge}
          src={marked ? tick : badge}
          onClick={marked ? undefined : closeHandler(...params)}
        />
      </div>
    </Alert>
  );
}
