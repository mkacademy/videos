import React, { useState, Fragment } from "react";
import { Col } from "react-bootstrap";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../../store/types";
import { initLoading, InitLoadingPayload } from "../../library/actions";
import { toggleRow } from "../../store/slices/rowSlice";
import { toggleContent } from "../../store/slices/contentSlice";
import LinkifiedText from "../LinkifiedText";
import Instruction from "./Instruction";
import { InstructionItem } from "./Instruction";
import * as styles from "../../styles/instructions.module.css";

const stylesProps = {
  instructions: styles["instructions"],
  shortParagrah: styles["shortParagrah"],
  stepNumber: styles["stepNumber"],
  stepName: styles["stepName"],
  stepContent: styles["stepContent"],
  left: styles["left"],
  right: styles["right"],
  colLg4: styles["col-lg-4"],
  colLg8: styles["col-lg-8"],
  colXl3: styles["col-xl-3"],
  colXl9: styles["col-xl-9"],
  paragraph: styles["paragraph"],
};

interface InstructionsListProps {
  instructions: InstructionItem[];
  scrollMutator: (index: number) => void;
}

const getFixedTitle = (instruction: InstructionItem): string => {
  const title = instruction.instruction ?? "";
  return title.length > 18
    ? title.slice(0, 13).toUpperCase()
    : title.toUpperCase();
};

const InstructionsList: React.FC<InstructionsListProps> = ({ instructions, scrollMutator }) => {
  return (
    <div className={stylesProps.instructions}>
      {instructions.map((instruction, i) => (
        <div
          key={instruction.id}
          className={stylesProps.shortParagrah + ' ' + stylesProps.paragraph}
          onClick={() => scrollMutator(i)}
        >
          <span className={stylesProps.stepNumber}>{i + 1}</span>
          <span className={stylesProps.stepName}>{getFixedTitle(instruction)}</span>
          <p className={stylesProps.stepContent}>
            <LinkifiedText text={instruction.details ?? ""} maxLength={300} />
          </p>
        </div>
      ))}
    </div>
  );
};

const Instructions: React.FC = () => {
  const rows = useSelector((state: RootState) => state.row);
  const icons = useSelector((state: RootState) => state.view.icons);
  const fetchedData = useSelector((state: RootState) => state.content);
  const defaultTake = useSelector((state: RootState) => state.session.defaultTake);
  const curApp = useSelector((state: RootState) => state.session.curApp);
  const dispatch = useDispatch();
  
  const [index, setIndex] = useState<number>(0);

  const orderedData = rows.map(({ index }) => fetchedData[index]);
  const visibles = orderedData.filter(({ deleted }) => !deleted) as InstructionItem[];

  const toggler = (payload: number) => {
    dispatch(toggleRow(payload.toString()));
    dispatch(toggleContent(payload));
  };

  const preserveIngredients = (payload: InitLoadingPayload) => {
    dispatch(initLoading(payload));
  };

  return (
    <Fragment>
      <Col lg={4} xl={3} className={stylesProps.left + ' ' + stylesProps.colLg4 + ' ' + stylesProps.colXl3}>
        <InstructionsList instructions={visibles} scrollMutator={setIndex} />
      </Col>
      <Col xs={12} lg={8} xl={9} className={stylesProps.right + ' ' + stylesProps.colLg8 + ' ' + stylesProps.colXl9}>
        <Instruction
          preserveIngredients={preserveIngredients}
          defaultTake={defaultTake}
          instructions={visibles}
          scrollToIndex={index}
          toggler={toggler}
          icons={icons}
          curApp={curApp}
        />
      </Col>
    </Fragment>
  );
};

export default Instructions;
