import { Button } from "react-bootstrap";
import React, { useEffect, useRef, useState } from "react";

import * as optionsStyles from "../../../../../styles/options.module.css";
import * as descendantsAndOptions from "../../../../../styles/descendantsAndOptions.module.css";
import * as descendantsWrapper from "../../../../../styles/descendantsWrapper.module.css";  
import { CreateInteractionPayload, DeleteInteractionPayload } from "../../../../../store/slices/interactionSlice";

const stylesProps = {
  actions: optionsStyles["actions"],
  actions_: descendantsAndOptions["actions"],
  HorizantolFlex: descendantsWrapper["HorizantolFlex"],
};

interface Option {
  owner: boolean | null;
  undone: boolean;
}


interface TableRowOptionProps {
  responses: number;
  parentID: string;
  clicked: number[];
  childID: string;
  options: Option[];
  /** When set, skips scanning `options` (parent builds lookup per row). */
  resolvedOption?: Option;
  create: (payload: CreateInteractionPayload) => void;
  remove: (payload: DeleteInteractionPayload) => void;
  row: number; 
}

interface OrigParentIDRef {
  isRealID: boolean;
  origID: number | null;
}

const getPlaceholder = (parentID: string): Option => {
  const placeholder: Option = { owner: null, undone: false };
  placeholder[parentID] = null;
  return placeholder;
};

const thisOption = (options: Option[], parentID: string, childID: string, row: number): Option =>
  options.find((o) => o[childID] === row) ?? getPlaceholder(parentID);

export default function TableRowOption({
  responses,
  parentID,
  clicked,
  childID,
  options,
  resolvedOption,
  create,
  remove,
  row,
}: TableRowOptionProps) {
  const origParentID = useRef<OrigParentIDRef | undefined>(undefined);
  const isInit: boolean = responses === 0;
  const payload: CreateInteractionPayload = { parentID, childID, compositeId: [null, row] };
  const option: Option =
    resolvedOption ?? thisOption(options, parentID, childID, row);
  const isResolved: boolean = option.owner !== null;
  const isMutated: boolean = option.undone === true;
  const [hover, setHover] = useState<boolean>(false);
  const [isCreate, setIsCreate] = useState<boolean | undefined>(undefined);
  const isCreater: boolean = isResolved && option.owner === true;
  const canBeSaved: boolean = !isMutated && option[parentID] === null;
  const isToBeDeleted: boolean = isMutated && option[parentID] === null;
  const hasParentID: boolean = option[parentID] !== null && option[parentID] > -1;
  const hasNewParentID: boolean = option[parentID] !== null && option[parentID] === -1;
  const canBeUnSaved: boolean =
    (hasParentID || (hasNewParentID && !isInit)) && !isCreater && !isMutated;
  const canBeRemoved: boolean = hasParentID && isCreater;
  if (origParentID.current === undefined && isResolved) {
    origParentID.current = {
      isRealID: hasParentID,
      origID: option[parentID],
    };
    if (canBeUnSaved) setIsCreate(true);
  } else if (origParentID.current && !isInit) {
    const { isRealID } = origParentID.current;
    if (!isRealID)
      origParentID.current = {
        isRealID: true,
        origID: -1,
      };
  } else if (origParentID.current && isInit) {
    const { origID } = origParentID.current;
    if (origID === -1)
      origParentID.current = {
        isRealID: false,
        origID: null,
      };
  }

  const origID: number | null = origParentID.current?.origID ?? null;
  const isRealID: boolean = origParentID.current?.isRealID ?? false;
  const newID: number = origID ?? -1;
  const isToBeSaved: boolean = option[parentID] === newID && isMutated;
  const upayload: DeleteInteractionPayload = { ...payload, compositeId: [origID, row] };
  const cpayload: CreateInteractionPayload = { ...payload, compositeId: [newID, row] };

  useEffect(() => {
    setHover((hover) => {
      if (hover && isCreate === undefined) return false;
      else return hover;
    });
  }, [isCreate]);

  const showUndoBtn = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setHover(true);
  };

  const hideUndoBtn = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setHover(false);
  };

  const onRemoveClicked = (): void => {
    remove(upayload);
    setIsCreate(false);
  };

  const onSaveClicked = (): void => {
    // console.log(cpayload);
    create(cpayload);
    setIsCreate(true);
  };

  const onUndoClicked = (): void => {
    setHover(false);
    if (isCreate !== undefined) {
      !isCreate ? create(upayload) : remove(upayload);
      if (!isRealID && isInit) setIsCreate(undefined);
      else setIsCreate(!isCreate);
    }
  };

  const btnRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (btnRef.current) {
      const curBtn = btnRef.current.getElementsByTagName("button")[0];
      if (curBtn && clicked.includes(row)) curBtn.click();
    }
  }, [btnRef, clicked, row]);

  return (
    <div className={stylesProps.HorizantolFlex + " " + stylesProps.actions + " " + stylesProps.actions_} ref={btnRef}>
      {isResolved ? (
        <React.Fragment>
          {hover && isCreate !== undefined && (
            <Button
              size="sm"
              variant="warning"
              onClick={onUndoClicked}
              onMouseLeave={hideUndoBtn}
            >
              Undo
            </Button>
          )}
          {!hover && canBeUnSaved && (
            <Button
              variant={"success"}
              size="sm"
              onClick={showUndoBtn}
              onMouseOver={showUndoBtn}
            >
              Saved
            </Button>
          )}
          {!hover && isToBeSaved && (
            <Button
              variant="info"
              size="sm"
              onClick={showUndoBtn}
              onMouseOver={showUndoBtn}
            >
              Saved
            </Button>
          )}
          {!hover && isToBeDeleted && (
            <Button
              variant="secondary"
              size="sm"
              onClick={showUndoBtn}
              onMouseOver={showUndoBtn}
            >
              Removed
            </Button>
          )}
          {canBeSaved && (
            <Button variant="primary" size="sm" onClick={onSaveClicked}>
              Save
            </Button>
          )}
          {canBeRemoved && (
            <Button variant="danger" size="sm" onClick={onRemoveClicked}>
              Remove
            </Button>
          )}
        </React.Fragment>
      ) : (
        <Button variant="primary" size="sm" disabled>
          Pending
        </Button>
      )}
    </div>
  );
}
