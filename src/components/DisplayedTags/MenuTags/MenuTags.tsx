import React, { ReactNode } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Col, Row } from 'react-bootstrap';
import { RootState } from '../../../store/types';
import { toggleParents, toggleSearches } from '../../../store/slices/viewSlice';
import MenuTag from './MenuTag';
import * as styles from '../../../styles/filtertags.module.css';
import { ScreenBuilderTypes } from '../../../Hooks/useScreensBuilder';
import { MenuItemWithOverrides } from './Screen';
import { InitLoadingPayload } from '../../../library/actions';

const styleProps = {
  mobile: styles["mobile"],
  menuTags: styles["menuTags"],
  selectedMenu: styles["selectedMenu"],
  colSmAuto: styles['col-sm-auto'],
};

interface MenuTagsProps {
  selectedTraversal: string;
  traversalsObj: Record<string, ScreenBuilderTypes>;
  setSelected: (data: InitLoadingPayload) => void;
  children?: ReactNode;
  isMobile?: boolean;
}

const MenuTags: React.FC<MenuTagsProps> = ({
  selectedTraversal,
  traversalsObj,
  setSelected,
  children,
  isMobile = false,
}) => {
  const dispatch = useDispatch();

  // Individual useSelector hooks for each prop as requested
  const curRoutes = useSelector((state: RootState) => state.session.curRoutes);
  const isFetching = useSelector((state: RootState) => state.session.isFetching);

  // Action dispatchers using modern Redux pattern
  const showParents = () => dispatch(toggleParents());
  const showSearches = () => dispatch(toggleSearches());

  const dial = (type: string) => {
    if (type === "parents") showParents();
    else if (type === "searches") showSearches();
  };

  return (
    <Row className={isMobile ? styleProps.mobile : styleProps.menuTags}>
      {Object.entries(traversalsObj).map(([key, values], i) => {
        const selected = selectedTraversal === key;
        const selectedCss = selected ?
          styleProps.selectedMenu + " " + styleProps.colSmAuto
          : styleProps.colSmAuto;
        const toggler = selected ? dial : undefined;
        const menuItem = values as MenuItemWithOverrides;
        if (!menuItem.parentData) return null;
        return (
          <Col
            key={key}
            sm={!isMobile && "auto"}
            className={selectedCss}
          >
            <MenuTag
              index={i}
              {...menuItem}
              toggler={toggler}
              selected={selected}
              curRoutes={curRoutes}
              isFetching={isFetching}
              setSelected={setSelected}
              parentData={menuItem.parentData!}
            />
          </Col>
        );
      })}
      {children}
    </Row>
  );
};

export default MenuTags;
