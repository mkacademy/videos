import React from "react";
import { Carousel } from "react-bootstrap";
import { Tree as entities } from "../../../../utils";
import Descendants from "../../Authenticated/private/TableColumns/Descendants";
import { IconKey } from "../../../../Hooks/useIconsAssembler";
import * as styles from "../../../../styles/descendantsWrapper.module.css";
import { Column, DesktopTable } from "../../../../Hooks/useTabulator";
import { ScreenBuilderTypes } from "../../../../Hooks/useScreensBuilder";

const stylesProps = {
    inCarousel: styles["inCarousel"],
    tablesCSS: styles["tablesCSS"],
    tutorialsInstructions: styles["TutorialsInstructions"],
    programsCourses: styles["ProgramsCourses"],
    snapshotsNotes: styles["SnapshotsNotes"],
    qaurtet: styles["Qaurtet"],
    notTutorialsInstructions: styles["notTutorialsInstructions"],
    repeated: styles["repeated"],
    HorizantolFlex: styles["HorizantolFlex"],
    noOutlier: styles["noOutlier"],
};

export interface ChunkData {
    [key: string]: ScreenBuilderTypes;
}

interface DescendantsWrapperProps {
    variables?: [ChunkData[], number, (index: number) => void];
    Constraints?: { CSS: () => string, max: number };
    icons?: Record<IconKey, string>;
    rest: DesktopTable | Column;
    isTablet: boolean;
    padCount?: number;
    entity: string;
}

export const tablesCSS = (className: string, isTablet: boolean) => {
    const classNames = className.split(" ");
    return isTablet ?
        `${stylesProps.tablesCSS} ${classNames.find((str) => str === stylesProps.tutorialsInstructions) !== undefined
            ? stylesProps.tutorialsInstructions
            : stylesProps.notTutorialsInstructions}
        ${classNames.find((str) => str === stylesProps.programsCourses) !== undefined
            ? stylesProps.programsCourses
            : ""}
        ${classNames.find((str) => str === stylesProps.snapshotsNotes) !== undefined &&
            classNames.find((str) => str === stylesProps.repeated) !== undefined
            ? stylesProps.snapshotsNotes + " " + stylesProps.repeated
            : ""}
        ${classNames.find((str) => str === stylesProps.qaurtet) !== undefined
            ? stylesProps.qaurtet
            : ""}`
        : `${stylesProps.tablesCSS} ${classNames.find((str) => str === stylesProps.tutorialsInstructions) !== undefined
            ? stylesProps.tutorialsInstructions
            : ""}
        ${classNames.find((str) => str === stylesProps.qaurtet) !== undefined
            ? stylesProps.qaurtet
            : ""}`;
};

const first = 0;
const second = 1;

const getStyles = (chunkCSS: string, isQartet: boolean, isTablet: boolean, i: number): string => {
    const firstDuet = stylesProps.programsCourses + " " + stylesProps.qaurtet;
    const secondDuet = stylesProps.tutorialsInstructions + " " + stylesProps.qaurtet;
    const isSingleDuet = isTablet && i === 0 && chunkCSS === stylesProps.snapshotsNotes;
    const isRepeatedDuet = isTablet && i === 1 && chunkCSS === stylesProps.snapshotsNotes;
    if ((isQartet && i === 0) || isSingleDuet) return firstDuet;
    else if (isRepeatedDuet) return secondDuet;
    return chunkCSS;
};

const DescendantsWrapper: React.FC<DescendantsWrapperProps> = (props) => {
    const { Constraints, entity, variables, rest, isTablet, icons, padCount } = props;
    const TitlesDictionary: Record<string, string[]> = entities.getProperty(entity, "ordinals") || {};
    const noOutlier: boolean = entities.getProperty(entity, "descendents") === null;
    const [chunks, activeIndex, handleSelect] = variables || [];
    delete rest['entityName'];
    const descendents: Record<string, ScreenBuilderTypes>[] = chunks ? chunks.slice(1) : [rest as Column];
    const activeDescendantIndex =
        descendents.length > 0 ? Math.min(activeIndex ?? 0, descendents.length - 1) : 0;
    const activeChunk = descendents[activeDescendantIndex];

    return (
        <React.Fragment>
            {chunks === undefined ? (
                descendents.map((chunk: Record<string, ScreenBuilderTypes>) => {
                    const values = Object.values(chunk);
                    const isQartet = isTablet && values[0] === values[1];
                    return Object.keys(chunk).map((key: string, i: number) => {
                        const chunkkey = getStyles(chunk[key] as string, isQartet, isTablet, i);
                        return (
                            <div className={stylesProps.HorizantolFlex + " " + tablesCSS(chunkkey, Boolean(isTablet))}
                                key={key}
                            >
                                <div>
                                    <Descendants
                                        title={TitlesDictionary[key]?.[first]}
                                        padCount={padCount || 0}
                                        entity={entity}
                                        icons={icons || ({} as Record<IconKey, string>)}
                                    />
                                </div>
                                <div>
                                    <Descendants
                                        title={TitlesDictionary[key]?.[second]}
                                        padCount={padCount || 0}
                                        entity={entity}
                                        icons={icons || ({} as Record<IconKey, string>)}
                                    />
                                </div>
                            </div>
                        );
                    });
                })
            ) : (
                <Carousel
                    indicatorLabels={descendents.map(() => 'carousel-indicator')}
                    activeIndex={activeIndex}
                    onSelect={handleSelect}
                    controls={false}
                    interval={null}
                    touch={false}
                    slide={false}
                    className={stylesProps.inCarousel + " " + Constraints?.CSS()}
                >
                    {activeChunk && (
                        <Carousel.Item key={activeDescendantIndex}>
                            <div className="tablesz">
                                {Object.keys(activeChunk).map((key: string, k: number) => {
                                    const keys = Object.keys(activeChunk);
                                    const isSecondDuet = keys.length - 1 === k;
                                    const cls = noOutlier && isSecondDuet ? stylesProps.noOutlier : "";
                                    return (
                                        <div
                                            className={
                                                stylesProps.HorizantolFlex +
                                                " " +
                                                tablesCSS(activeChunk[key] as string, Boolean(isTablet))
                                            }
                                            key={key}
                                        >
                                            <div>
                                                <Descendants
                                                    title={TitlesDictionary[key]?.[first]}
                                                    padCount={padCount || 0}
                                                    entity={entity}
                                                    icons={icons || ({} as Record<IconKey, string>)}
                                                />
                                            </div>
                                            <div>
                                                <Descendants
                                                    title={TitlesDictionary[key]?.[second]}
                                                    padCount={padCount || 0}
                                                    noOutlier={cls}
                                                    entity={entity}
                                                    icons={icons || ({} as Record<IconKey, string>)}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </Carousel.Item>
                    )}
                </Carousel>
            )}
        </React.Fragment>
    );
};

export default DescendantsWrapper;
