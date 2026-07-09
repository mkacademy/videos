import React from "react";
import CrudColumn from "../TableColumns/CrudColumn";
import * as actionsWrapper from "../../../../../styles/actionsWrapper.module.css";

interface ActionsWrapperProps {
  Actions?: string;
  padCount: number;
  entity: string;
}

const ActionsWrapper: React.FC<ActionsWrapperProps> = (props) => {
  const { Actions, entity, padCount } = props;
  return (
    <React.Fragment>
      {Actions && Actions.includes("Admin") ? (
        <div className={Actions}>
          <CrudColumn entity={entity} padCount={padCount} />
        </div>
      ) : Actions ? (
        <div className={actionsWrapper["tablesCSS"] + " Actions"}>
          <CrudColumn entity={entity} padCount={padCount} />
        </div>
      ) : null}
    </React.Fragment>
  );
};

export default ActionsWrapper;
