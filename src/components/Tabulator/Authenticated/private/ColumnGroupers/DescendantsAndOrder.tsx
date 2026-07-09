import React from "react";
import OrderColumn from "../TableColumns/OrderColumn";
import Descendants from "../TableColumns/Descendants";
import { Tree as entities } from "../../../../../utils";
import { IconKey } from "../../../../../Hooks/useIconsAssembler";
import * as descendantsWrapper from "../../../../../styles/descendantsWrapper.module.css";
import * as descendantsAndOrder from "../../../../../styles/descendantsAndOrder.module.css";

const tablesCSS = (classNames: string, isTablet: boolean) => {
    return isTablet ? `${classNames === descendantsAndOrder["FlexTable"]
        ? descendantsAndOrder["FlexTable"]
        : descendantsAndOrder["notFlexTable"]
        }` : ""
}


interface DescendantsAndOrderProps {
    entity: string;
    padCount: number;
    FlexTable?: string;
    isTablet: boolean;
    icons: Record<IconKey, string>;
}

const DescendantsAndOrder: React.FC<DescendantsAndOrderProps> = (props) => {
    const { FlexTable, entity, icons, padCount, isTablet } = props;
    const styles = descendantsWrapper["HorizantolFlex"] + " " + descendantsAndOrder["tablesCSS"]
    const isFlexTable = FlexTable === descendantsAndOrder["FlexTable"] ||
        FlexTable === descendantsAndOrder["FlexTable"] + " " + descendantsWrapper["repeated"]
    return (
        <React.Fragment>
            {FlexTable && isFlexTable && (
                <div className={styles + " " + tablesCSS(FlexTable, isTablet)}>
                    <div>
                        <Descendants
                            title={entities.getProperty(entity, "descendents") || ""}
                            padCount={padCount}
                            entity={entity}
                            icons={icons}
                        />
                    </div>
                    <div>
                        <OrderColumn title="Order" padCount={padCount} />
                    </div>
                </div>
            )}
        </React.Fragment>
    );
};

export default DescendantsAndOrder;
