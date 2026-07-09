import React from "react";
import { useSelector, useDispatch } from "react-redux";
import { Carousel } from "react-bootstrap";
import RowDivider from "../Dividers/Splitters";
import useMediaQuery from "../../Hooks/useQueryMedia";
import { Link, useNavigate } from "react-router-dom";
import { getEntity } from "../../utils";
import useScreensBuilder from "../../Hooks/useScreensBuilder";
import { initLoading, InitLoadingPayload } from "../../library/actions";
import { toggleRow } from "../../store/slices/rowSlice";
import { cookIngredients } from "../../utils";
import { toggleContent } from "../../store/slices/contentSlice";
import { DataRow } from "../Core/types";
import { RootState } from "../../store/types";
import { ParentData } from "../../store/slices/viewSlice";
import { CookIngredientsProps } from "../../utils";
import { IconKey } from "../../Hooks/useIconsAssembler";
import * as styles from "../../styles/unified.module.css";
import { ScreenBuilderTypes } from "../../Hooks/useScreensBuilder";

const stylesProps = {
  carouselCss: styles["carouselCSS"],
  colParent: styles["col-parent"],
  verticalFlex: styles["verticalFlex"],
  carouselItem: styles["carousel-item"],
  title: styles["title"],
  gutter: styles["gutter"],
  IMGcontainer: styles["IMGcontainer"],
}


interface UnifiedCarouselComponentProps {
  entityType?: string;
  parentType?: string;
}

interface GenericCarouselProps {
  item: DataRow;
  icons: Record<IconKey, string> | undefined;
  preserveIngredients: (payload: InitLoadingPayload) => void;
  defaultTake: number;
  curApp: number;
  parentType: string;
}

const UnifiedCarouselComponent: React.FC<UnifiedCarouselComponentProps> = ({
  entityType = 'dashboard',
  parentType = 'dashboards'
}) => {
  const dispatch = useDispatch();

  const icons = useSelector((state: RootState) => state.view.icons);
  const fetchedData = useSelector((state: RootState) => state.content);
  const expanded = useSelector((state: RootState) => state.view.toggleLayout);
  const defaultTake = useSelector((state: RootState) => state.session.defaultTake);
  const curApp = useSelector((state: RootState) => state.session.curApp);

  const toggler = (payload: string | number) => {
    dispatch(toggleRow(payload.toString()));
    dispatch(toggleContent(Number(payload)));
  };

  const preserveIngredients = (payload: InitLoadingPayload) => {
    dispatch(initLoading(payload));
  };

  const visibles = fetchedData.filter((row: DataRow) => !row.deleted)

  return (
    <React.Fragment>
      {visibles.map((item: DataRow) => (
        <React.Fragment key={item.id}>
          <RowDivider
            fields={[entityType, "purpose"]}
            content={item}
            toggler={toggler}
          />
          {!expanded && (
            <GenericCarousel
              preserveIngredients={preserveIngredients}
              defaultTake={defaultTake}
              item={item}
              icons={icons}
              curApp={curApp}
              parentType={parentType}
            />
          )}
        </React.Fragment>
      ))}
    </React.Fragment>
  );
};

const chunkSizes: number[] = [1, 2, 3, 4, 6, 6, 7];

const GenericCarousel: React.FC<GenericCarouselProps> = ({
  item,
  icons,
  preserveIngredients,
  defaultTake,
  curApp,
  parentType
}) => {
  const { screen: screenIndex } = useMediaQuery();
  const [chunks, activeIndex, handleSelect] = useScreensBuilder(
    screenIndex,
    chunkSizes,
    Array.isArray(icons) ? icons : []
  );
  const navigate = useNavigate();

  const parentData: ParentData = {
    curApp,
    parent: parentType,
    IDs: [item.id.toString()],
  };

  return (
    <Carousel
      className={stylesProps.carouselCss}
      activeIndex={activeIndex}
      onSelect={handleSelect}
      indicators={true}
      controls={false}
      interval={null}
      touch={false}
      slide={false}
    >
      {chunks.map((icons: Record<IconKey, ScreenBuilderTypes>, index: number) => (
        <Carousel.Item className={stylesProps.carouselItem} key={index}>
          <div className={stylesProps.colParent}>
            {Object.keys(icons).map((key: string, i: number) => (
              <React.Fragment key={i}>
                <Link className={stylesProps.IMGcontainer}
                  onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
                    e.preventDefault();
                    const ingredients = {
                      entity: getEntity(key),
                      search: undefined,
                      parentData,
                      defaultTake,
                    };
                    const spread = cookIngredients(ingredients);
                    if (spread) {
                      const extendedIngredients = {
                        ...ingredients,
                        search: undefined,
                        prefix: spread.pfx,
                      } as CookIngredientsProps;
                      preserveIngredients(extendedIngredients);
                      navigate(spread.url);
                    }
                  }}
                  to="#"
                >
                  <div className={stylesProps.verticalFlex}>
                    <img alt={key} src={icons[key]} />
                    <span className={stylesProps.title}>{key}</span>
                  </div>
                </Link>
                <div className={stylesProps.gutter}></div>
              </React.Fragment>
            ))}
          </div>
        </Carousel.Item>
      ))}
    </Carousel>
  );
};

export default UnifiedCarouselComponent;
