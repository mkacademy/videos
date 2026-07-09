import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Alert, Col, Image, Row, Button, ToggleButton } from "react-bootstrap";
const lockIMG = new URL("../../../Images/lock.png", import.meta.url).href;
import { RootState } from '../../../store/types';
import { getEntity, structure, Tree as tree } from "../../../utils";
import { toggleRoute, toggleRoutes } from "../../../store/slices/settingsSlice";
import { clearData, selectAll } from "../../../store/slices/rowSlice";
import * as styles from "../../../styles/settings.module.css";
import * as settingsTags from "../../../styles/settingsTags.module.css";
import { MenuItem } from '../../Core/types';

const styleProps = {
    settingsCol1: styles["settings-col1"],
    settingsColLg6: styles["col-lg-6"],
    settingsTags: settingsTags["settings-tags"],
    slctbx: styles["slctbx"],
    buttonsContainer: styles["buttons-container"],
    buttonLabel: styles["button-label"],
    fromBadge: settingsTags["fromBadge"],
    toBadge: settingsTags["toBadge"],
    thumbs: settingsTags["thumbs"],
    menuTags: settingsTags["menu-tags"],
    selectedMenu: settingsTags["selectedMenu"],
    btnOutlinePrimary: styles["btn-outline-primary"],
    colSm12: styles["col-sm-12"],
};

const getTraversals = (entity: string) => {
  const traversals = tree.getProperty(entity, "menu") ?? [];
  if (traversals.length === 0) return tree.getProperty("foundation", "menu");
  return traversals;
};

interface ColSixProps {
  children?: React.ReactNode;
  handleChildSel: (entity: string) => void;
  handleSwitchButton: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleButton: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

const ColSix: React.FC<ColSixProps> = ({
  children,
  handleSwitchButton,
  handleChildSel,
  handleButton,
}) => {
  const dispatch = useDispatch();
  
  // Using one useSelector per prop as requested
  const seltype = useSelector((state: RootState) => state.settings.seltype);
  const selecteds = useSelector((state: RootState) => state.settings.selectedRoutes);
  const selectedParent = useSelector((state: RootState) => state.settings.selectedParent);
  const permittedRoutes = useSelector((state: RootState) => state.settings.permittedRoutes);
  const isChildSelection = useSelector((state: RootState) => !state.settings.isParentSelection);

  // Dispatch actions
  const toggle = (payload: string) => dispatch(toggleRoute(payload));
  const toggleAll = (payload: { selecteds: string[]; action: string }) => dispatch(toggleRoutes(payload));

  const pred = ({ to, from }: { to: string; from: string }) => permittedRoutes.indexOf(from + to) > -1;
  const traversals = getTraversals(getEntity(selectedParent));
  const permitted = traversals?.filter(pred) || [];
  const locks = Math.abs(permitted.length - (traversals?.length || 0));

  return (
    <Col className={styleProps.settingsCol1 + " " + styleProps.settingsColLg6} sm={12} lg={6}  >
      <Row className={styleProps.menuTags}>
        {permitted.map((menuTag: MenuItem, i: number) => {
          const { toIMG, fromIMG, to, from } = menuTag;
          const route = from + to;
          const cSS = selecteds.indexOf(route) > -1 ? styleProps.selectedMenu : "";
          return (
            <Col key={i} className={cSS}>
              <Alert className={styleProps.settingsTags}>
                <div
                  className={styleProps.thumbs}
                  onClick={() => {
                    if (isChildSelection)
                      handleChildSel(structure.selOptions[to]);
                    else toggle(route);
                  }}
                >
                  <Image src={fromIMG} className={styleProps.fromBadge} />
                  <Image src={toIMG} className={styleProps.toBadge} />
                </div>
              </Alert>
            </Col>
          );
        })}
        {Array.from({ length: locks }).map((_, i) => {
          return (
            <Col key={i}>
              <Alert className={styleProps.settingsTags}>
                <div className={styleProps.thumbs}>
                  <Image src={lockIMG} className={styleProps.fromBadge} />
                  <Image src={lockIMG} className={styleProps.toBadge} />
                </div>
              </Alert>
            </Col>
          );
        })}
      </Row>
      <Row className="mb-2">
        <Col className={styleProps.buttonsContainer} sm={12} md={6}>
          <Button
            variant="dark"
            className="reset w-100"
            onClick={() => {
              const selecteds = traversals?.map((t: MenuItem) => t.from + t.to) || [];
              toggleAll({ selecteds, action: selectAll.type });
            }}
          >
            Select All
          </Button>
        </Col>
        <Col>
          <Button
            variant="danger"
            className="reset w-100"
            onClick={() => {
              const selecteds = traversals?.map((t: MenuItem) => t.from + t.to) || [];
              toggleAll({ selecteds, action: clearData.type });
            }}
          >
            Clear All
          </Button>
        </Col>
      </Row>

      <Row className="mb-2">
        <Col>
          <Button
            id="foundations-from-handles_btn"
            variant="outline-secondary"
            className="reset w-100"
            type="button"
            onClick={handleButton}
          >
            Foundations from Handles
          </Button>
        </Col>
      </Row>

      <Row className="mb-2">
        <Col sm={12} className={styleProps.buttonLabel + " " + styleProps.colSm12}>
          <ToggleButton
            type="checkbox"
            checked={seltype}
            id="toggle-seltype"
            value="toggle-seltype"
            variant="outline-primary"
            onChange={handleSwitchButton}
            className={styleProps.btnOutlinePrimary}
          >
            {seltype ? "Select Highlighted" : "Select Dismissals"}
          </ToggleButton>
        </Col>
      </Row>
      {children}
    </Col>
  );
};

export default ColSix; 