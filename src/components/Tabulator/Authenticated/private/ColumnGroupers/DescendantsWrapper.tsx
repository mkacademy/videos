import React from "react";
import { Carousel } from "react-bootstrap";
import { Tree as entities } from "../../../../../utils";
import Descendants from "../TableColumns/Descendants";
import { IconKey } from "../../../../../Hooks/useIconsAssembler";
import * as styles from "../../../../../styles/descendantsWrapper.module.css";
import { tablesCSS } from "../../../Anonymous/ColumnsGroupers/DescendantsWrapper";
import { Column, DesktopTable } from "../../../../../Hooks/useTabulator";
import { ScreenBuilderTypes } from "../../../../../Hooks/useScreensBuilder";

const stylesProps = {
  HorizantolFlex: styles["HorizantolFlex"],
  inCarousel: styles["inCarousel"],
  tablesCSS_: styles["tablesCSSResponsive"],
};

const first = 0;
const second = 1;

// Type definitions
interface TitlesDictionary {
  [key: string]: string[];
}

interface DescendantsWrapperProps {
  variables?: [Record<string, ScreenBuilderTypes>[], number, (index: number) => void];
  Constraints?: { CSS: () => string, max: number };
  icons: Record<IconKey, string>;
  padCount: number;
  entity: string;
  isTablet: boolean;
  rest: DesktopTable | Column;
}

const DescendantsWrapper: React.FC<DescendantsWrapperProps> = (props) => {
  const { Constraints, entity, variables, icons, padCount, isTablet, rest } = props;
  const TitlesDictionary: TitlesDictionary = entities.getProperty(entity, "ordinals") || {};
  const [chunks, activeIndex, handleSelect] = variables || [];
  delete rest['entityName'];
  const descendents: Record<string, ScreenBuilderTypes>[] = chunks ? chunks.slice(1) : [rest as Column];
  const activeDescendantIndex =
    descendents.length > 0 ? Math.min(activeIndex ?? 0, descendents.length - 1) : 0;
  const activeChunk = descendents[activeDescendantIndex];
  return (
    <React.Fragment>
      {chunks === undefined ? (
        descendents.map((chunk) =>
          Object.keys(chunk).map((key) => (
            <div className={stylesProps.HorizantolFlex + " " + tablesCSS(chunk[key] as string, isTablet) + " " + stylesProps.tablesCSS_} key={key}>
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
          ))
        )
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
                {Object.keys(activeChunk).map((key) => (
                  <div className={stylesProps.HorizantolFlex + " " + stylesProps.tablesCSS_ + " " + tablesCSS(activeChunk[key] as string, isTablet)} key={key}>
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

export default DescendantsWrapper;
