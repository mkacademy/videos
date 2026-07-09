import React from "react";
import { Tree as entities } from "../../../../../utils";
import Descendants from "../../private/TableColumns/Descendants";
import OptionsColumn from "../TableColumns/OptionsColumn";
import { IconKey } from "../../../../../Hooks/useIconsAssembler";
import * as styles from "../../../../../styles/descendantsAndOptions.module.css";

const stylesProps = {
  optionsCss: styles["optionsCss"],
  descendentCSS: styles["descendentCSS"],
};

interface DescendantsAndOptionsProps {
  Actions?: string;
  entity: string;
  icons: Record<IconKey, string>;
  isDesktop: boolean;
  padCount: number;
}

const DescendantsAndOptions: React.FC<DescendantsAndOptionsProps> = (props) => {
  const { Actions, entity, icons, isDesktop, padCount } = props;
  if (Actions === undefined) return <React.Fragment />;
  const descendents: string = entities.getProperty(entity, "descendents") || "";
  const hasOutlier = isDesktop && descendents !== "";
  return (
    <React.Fragment>
      {!hasOutlier ? (
        <div className={stylesProps.optionsCss}>
          <OptionsColumn padCount={padCount} entity={entity} />
        </div>
      ) : (
        <React.Fragment>
          <div className={stylesProps.descendentCSS}>
            <Descendants
              padCount={padCount}
              title={descendents}
              entity={entity}
              icons={icons}
            />
          </div>
          <div className={stylesProps.optionsCss}>
            <OptionsColumn padCount={padCount} entity={entity} />
          </div>
        </React.Fragment>
      )}
    </React.Fragment>
  );
};

export default DescendantsAndOptions;
