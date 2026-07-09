import React, { JSX } from "react";
import { Carousel } from "react-bootstrap";
import { Tree as entities } from "../../../../../utils";
import Descendants from "../../private/TableColumns/Descendants";
import { IconKey } from "../../../../../Hooks/useIconsAssembler";
import * as styles from "../../../../../styles/descendantsWrapper.module.css";
import { tablesCSS } from "../../../Anonymous/ColumnsGroupers/DescendantsWrapper";
import * as descendantsWrapper from "../../../../../styles/descendantsWrapper.module.css";
import { Column, DesktopTable } from "../../../../../Hooks/useTabulator";
import { ScreenBuilderTypes } from "../../../../../Hooks/useScreensBuilder";

const stylesProps = {
  inCarousel: styles["inCarousel"],
  snapshotsNotes: styles["SnapshotsNotes"],
  HorizantolFlex: styles["HorizantolFlex"],
  programsCourses: styles["ProgramsCourses"],
  tablesCSS_: descendantsWrapper["tablesCSSResponsive"],
  qaurtet: styles["Qaurtet"],
};

interface DescendantsWrapperProps {
  Constraints?: { CSS: () => string, max: number };
  variables?: [Record<string, ScreenBuilderTypes>[], number, (index: number) => void];
  icons: Record<IconKey, string>;
  rest: DesktopTable | Column;
  isTablet: boolean;
  padCount: number;
  entity: string;
}

const first = 0;
const second = 1;

const getStyles = (
  chunkCSS: string,
  isOptionsDuet: boolean,
  isTablet: boolean,
  i: number
): string => {
  const repeatedFirstDuet = "Default_CSS";
  const firstDuet = stylesProps.programsCourses + " " + stylesProps.qaurtet;
  const isSingleDuet = isTablet && i === 0 && chunkCSS === stylesProps.snapshotsNotes;
  if (isSingleDuet) return firstDuet;
  else if (isOptionsDuet) return repeatedFirstDuet;
  return chunkCSS;
};

export default (props: DescendantsWrapperProps): JSX.Element => {
  const { Constraints, entity, variables, rest, isTablet, icons, padCount } = props;
  const TitlesDictionary: Record<string, string[]> = entities.getProperty(entity, "ordinals") || {};
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
          const keys = Object.keys(chunk);
          const isOptionsDuet = isTablet && keys.length === 1;
          return keys.map((key: string, i: number) => {
            const chunkkey = getStyles(chunk[key] as string, isOptionsDuet, isTablet, i);
            return (
              <div className={stylesProps.HorizantolFlex + " " + tablesCSS(chunkkey, isTablet) + " " + stylesProps.tablesCSS_} key={key}>
                <div>
                  <Descendants
                    title={TitlesDictionary[key]?.[first]}
                    padCount={padCount}
                    entity={entity}
                    icons={icons}
                  />
                </div>
                <div>
                  <Descendants
                    title={TitlesDictionary[key]?.[second]}
                    padCount={padCount}
                    entity={entity}
                    icons={icons}
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
                {Object.keys(activeChunk).map((key: string) => (
                  <div className={stylesProps.HorizantolFlex + " " + tablesCSS(activeChunk[key] as string, isTablet)} key={key}>
                    <div>
                      <Descendants
                        title={TitlesDictionary[key]?.[first]}
                        padCount={padCount}
                        entity={entity}
                        icons={icons}
                      />
                    </div>
                    <div>
                      <Descendants
                        title={TitlesDictionary[key]?.[second]}
                        padCount={padCount}
                        entity={entity}
                        icons={icons}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Carousel.Item>
          )}
        </Carousel>
      )}
    </React.Fragment>
  );
};
