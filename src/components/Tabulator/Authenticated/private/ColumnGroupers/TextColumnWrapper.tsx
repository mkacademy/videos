import React from "react";
import { structure } from "../../../../../utils";
import TextColumn from "../TableColumns/TextColumn";
import * as textColWrapper from "../../../../../styles/TextColWrapper.module.css";
import * as textColWrapper_ from "../../../../../styles/TextColWrapper_.module.css";
import * as textColWrapper__ from "../../../../../styles/TextColWrapper__.module.css";
import { RootState } from "../../../../../store/types";
import { useSelector } from "react-redux";

const stylesProps = {
  tableCSS: textColWrapper["tablesCSS"],
  noOutlier: textColWrapper["noOutlier"],
  hasOutlier: textColWrapper["hasOutlier"],
  noOutlier_: textColWrapper_["noOutlier"],
  hasOutlier_: textColWrapper_["hasOutlier"],
  noOutlier__: textColWrapper__["noOutlier"],
  hasOutlier__: textColWrapper__["hasOutlier"],
};

const tableCSS = (className: string, isIncognito: boolean, isPrivate: boolean) => {

  if (isIncognito)
    return `${structure.noOutlier.find((str) => str === className) !== undefined
      ? stylesProps.noOutlier
      : ""}
    ${structure.hasOutlier.find((str) => str === className) !== undefined
        ? stylesProps.hasOutlier
        : ""}`;
  else if (!isIncognito && !isPrivate)
    return `${structure.noOutlier.find((str) => str === className) !== undefined
      ? stylesProps.noOutlier__
      : ""}
    ${structure.hasOutlier.find((str) => str === className) !== undefined
        ? stylesProps.hasOutlier__
        : ""}`;
  else if (!isIncognito && isPrivate)
    return `${structure.noOutlier.find((str) => str === className) !== undefined
      ? stylesProps.noOutlier_
      : ""}
    ${structure.hasOutlier.find((str) => str === className) !== undefined
        ? stylesProps.hasOutlier_
        : ""}`;

  return "";

};

interface TextColumnWrapperProps {
  entityName: string;
  padCount?: number;
}

const TextColumnWrapper: React.FC<TextColumnWrapperProps> = (props) => {
  const { entityName, padCount = 0 } = props;
  const isIncognito = useSelector((state: RootState) => state.session.isIncognito);
  const isPrivate = useSelector((state: RootState) => state.session.isPrivate);
  const _tableCSS = tableCSS(entityName, isIncognito, isPrivate);
  return (
    <React.Fragment>
      {entityName && (
        <div className={stylesProps.tableCSS + " " + _tableCSS + " " + entityName}>
          <TextColumn title={entityName} padCount={padCount} />
        </div>
      )}
    </React.Fragment>
  );
};

export default TextColumnWrapper;
