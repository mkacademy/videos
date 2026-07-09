import React from "react";
import { Tree as entities } from "../../../../utils";
import Descendants from "../../Authenticated/private/TableColumns/Descendants";
import { IconKey } from "../../../../Hooks/useIconsAssembler";
import * as styles from "../../../../styles/descendantsWrapper.module.css";

interface DescendantsOutlierProps {
    entity: string;
    icons: Record<IconKey, string>;
    isDesktop: boolean;
    padCount: number;
}

const DescendantsOutlier: React.FC<DescendantsOutlierProps> = (props) => {
    const { entity, icons, isDesktop, padCount } = props;
    if (!isDesktop) return <React.Fragment />;
    const descendents: string | null = entities.getProperty(entity, "descendents") ?? null;
    return (
        <React.Fragment>
            {descendents !== null && (
                <div className={styles["descendentCSS"]}>
                    <Descendants
                        title={descendents}
                        padCount={padCount}
                        entity={entity}
                        icons={icons}
                    />
                </div>
            )}
        </React.Fragment>
    );
};

export default DescendantsOutlier;
