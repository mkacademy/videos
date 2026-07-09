import React, { useState } from "react";
import LinkifiedText from "../LinkifiedText";
import { DataRow } from "../Core/types";
import * as styles from "../../styles/splitters.module.css";
import * as styles2 from "../../styles/divider.module.css";

const stylesProps = {
  container: styles2["container"],
  jumbotron: styles["jumbotron"],
  description: styles2["description"],
  noscrollvisible: styles2["noscrollvisible"],
  greyBar: styles2["greyBar"],
  checked: styles2["checked"],
}

interface SplittersProps {
  content: DataRow;
  fields: [string, string];
  toggler: (id: number) => void;
}

const Splitters: React.FC<SplittersProps> = ({ content, fields, toggler }) => {
  const classes = content.checked ? stylesProps.greyBar + " " + stylesProps.checked : stylesProps.greyBar;
  const [showPurpose, setShowPurpose] = useState<boolean>(true);
  const [field1, field2] = fields;
  
  return (
    <React.Fragment>
      <div onClick={() => setShowPurpose(!showPurpose)} className={stylesProps.container}>
        <span className={stylesProps.description + " " + stylesProps.noscrollvisible}>{content[field1]}</span>
        <div className={classes}></div>
      </div>
      {showPurpose && (
        <div
          className={stylesProps.jumbotron}
          role="button"
          tabIndex={0}
          onClick={() => toggler(content.id as number)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              toggler(content.id as number);
            }
          }}
        >
          <p>
            <LinkifiedText text={String(content[field2] ?? "")} />
          </p>
        </div>
      )}
    </React.Fragment>
  );
};

export default Splitters;
