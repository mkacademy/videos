import React, { useState } from 'react';
import { useSelector } from 'react-redux';
const lockIMG = new URL("../../../Images/lock.png", import.meta.url).href;
import { Button, Col, Form, Row } from "react-bootstrap";
import { RootState } from '../../../store/types';
import { structure, applications } from "../../../utils";
import * as styles from "../../../styles/settings.module.css";
import { paddAliases } from "./ColTwo";

const styleProps = {
  verticalFlex: styles["verticalFlex"],
  settingsCol1: styles["settings-col1"],
  settingsColLg6: styles["col-lg-6"],
  selectedFocus: styles["selectedFocus"],
  title: styles["title"],
  slctbx: styles["slctbx"],
  formCheck: styles["form-check-input"],
  row: styles["row_"],
};

const grid: number[][] = [
  [4, 1, 10],
  [5, 6, 2],
  [0, 9, 7],
  [3, 8, 11],
];

interface ColOneProps {
  Icons: { [key: string]: string };
  children?: React.ReactNode;
  handleParentSel: (entity: string) => void;
  handleSelected: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  handleSwitch: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleSwitchLabel: (event: React.MouseEvent<HTMLElement>) => void;
  focusChanged: (event: React.MouseEvent<HTMLElement>) => void;
  handleButton: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

const ColOne: React.FC<ColOneProps> = ({
  Icons,
  children,
  focusChanged,
  handleSelected,
  handleParentSel,
  handleSwitchLabel,
  handleSwitch,
  handleButton,
}) => {
  // Using one useSelector per prop as requested
  const userapp = useSelector((state: RootState) => state.settings.userapp);
  const padding = useSelector((state: RootState) => state.settings.padding);
  const isTabled = useSelector((state: RootState) => state.settings.isTabled);
  const adminapp = useSelector((state: RootState) => state.settings.adminapp);
  const memberapp = useSelector((state: RootState) => state.settings.memberapp);
  const selectedChild = useSelector((state: RootState) => state.settings.selectedChild);
  const selectedParent = useSelector((state: RootState) => state.settings.selectedParent);
  const isParentSelection = useSelector((state: RootState) => state.settings.isParentSelection);

  const curapp = userapp > 0 ? userapp : memberapp > 0 ? memberapp : adminapp;
  const [coupleChapterCoversDisabled, setCoupleChapterCoversDisabled] = useState(false);

  const handleCoupleChapterCoversClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setCoupleChapterCoversDisabled(true);
    handleButton(event);
  };

  return (
    <Col className={styleProps.settingsCol1 + " " + styleProps.settingsColLg6} sm={12} lg={6}>
      <Row>
        <Col>
          <h3
            id="parent_lbl"
            onClick={focusChanged}
            className={isParentSelection ? styleProps.selectedFocus : ""}
          >
            {selectedParent}
          </h3>
        </Col>
        <Col>
          <h3
            id="child_lbl"
            onClick={focusChanged}
            className={isParentSelection ? "" : styleProps.selectedFocus}
          >
            {selectedChild}
          </h3>
        </Col>
      </Row>
      <Row>
        {grid.map((column, i) => (
          <Col key={i}>
            {column.map((index, k) => {
              const entity = structure.icons[index];
              const lcase = entity.toLowerCase();
              const locked = applications[curapp].indexOf(lcase) === -1;
              return (
                <div
                  key={k}
                  className={styleProps.verticalFlex + " mb-2"}
                  onClick={locked ? undefined : () => handleParentSel(entity)}
                >
                  <img
                    alt={locked ? "locked" : entity}
                    src={locked ? lockIMG : Icons[entity]}
                  />
                  <span className={styleProps.title}>{locked ? "locked" : entity}</span>
                </div>
              );
            })}
          </Col>
        ))}
      </Row>
      <Row className="mb-2">
        <Col>
          <Button
            size="lg"
            type="button"
            id="couple-chapter-covers-btn"
            className="w-100"
            onClick={handleCoupleChapterCoversClick}
            disabled={coupleChapterCoversDisabled}
            variant="primary"
          >
            Couple Chapter &amp; Covers
          </Button>
        </Col>
      </Row>
      <Row className={styleProps.slctbx}>
        <Col>
          <select
            value={padding}
            id="padding-select"
            onChange={handleSelected}
          >
            {Object.entries(paddAliases).map(([key, value], i) => (
              <option key={i} value={key}>
                {value}
              </option>
            ))}
          </select>
        </Col>
      </Row>
      <Row className={styleProps.row}>
        <Col>
          <h3
            id="showcased_lbl"
            onClick={handleSwitchLabel}
            className={isTabled ? "" : styleProps.selectedFocus}
          >
            Showcased
          </h3>
        </Col>
        <Col>
          <Form.Check
            type="switch"
            id="format-switch"
          >
            <Form.Check.Input
              type="radio"
              checked={isTabled}
              className={styleProps.formCheck}
              onChange={!isTabled ? handleSwitch : () => { }}
              onClick={isTabled ? handleSwitchLabel : undefined}
            />
          </Form.Check>
        </Col>
        <Col>
          <h3
            id="tabled_lbl"
            onClick={handleSwitchLabel}
            className={isTabled ? styleProps.selectedFocus : ""}
          >
            Tabled
          </h3>
        </Col>
      </Row>
      {children}
    </Col>
  );
};

export default ColOne;
