import React, { useState } from "react";
const badge = new URL("../../../Images/badge.png", import.meta.url).href;
import { Alert, Image } from "react-bootstrap";
const tick = new URL("../../../Images/Green-check-mark.png", import.meta.url).href;
import * as styles from '../../../styles/filtertags.module.css';

const styleProps = {
  parentTag: styles["parentTags"],
  parentTagText: styles["parentTagText"],
  parentTickedBadge: styles["parentTickedBadge"],
  HorizontalFlex: styles["HorizontalFlex"],
};
interface ParentTagProps {
  name?: string;
  selected: boolean;
  parentId: string | number;
  markParent: (parentId: string) => void;
  unmarkParent: (parentId: string) => void;
  removeParent: (parentId: string) => void;
}

const closeHandler = (
  parentId: string,
  removeParent: (parentId: string) => void,
  unmarkParent: (parentId: string) => void
) => (e: React.MouseEvent<HTMLImageElement>) => {
  e.preventDefault();
  e.stopPropagation();
  removeParent(parentId);
  unmarkParent(parentId);
  e.nativeEvent.stopImmediatePropagation();
};

export default function ParentTag({
  name,
  selected,
  parentId,
  markParent,
  unmarkParent,
  removeParent,
}: ParentTagProps): React.JSX.Element {
  const [marked, setMarked] = useState<boolean>(selected);
  const params: [string, (parentId: string) => void, (parentId: string) => void] = [
    parentId.toString(),
    removeParent,
    unmarkParent,
  ];

  return (
    <Alert className={styleProps.parentTag + " text-nowrap"}>
      <div className={styleProps.HorizontalFlex}>
        <span
          className={styleProps.parentTagText}
          onClick={() => {
            setMarked((marked: boolean) => !marked);
            if (marked) unmarkParent(parentId.toString());
            else markParent(parentId.toString());
          }}
        >
          {name ?? "undefined"}
        </span>
        <Image
          onClick={marked ? undefined : closeHandler(...params)}
          src={marked ? tick : badge}
          className={styleProps.parentTickedBadge}
          roundedCircle
        />
      </div>
    </Alert>
  );
}
