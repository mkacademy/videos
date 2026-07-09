import React from "react";
import { useSelector, useDispatch } from "react-redux";
import { Image, NavDropdown } from "react-bootstrap";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { RootState } from "../../store/types";
const avatar = new URL("../../Images/avatar.png", import.meta.url).href;
const convolutions = new URL("../../Images/convolutions.png", import.meta.url).href;
import TimeTag from "../DisplayedTags/FilterTags/TimeTag";
import {
  viewParentData,
} from "../../store/slices/viewSlice";
import { importTexts, InitReloadingPayload, exportTexts } from "../../library/actions";
import {
  escrowContents,
  escrowRows,
  initReloading,
} from "../../library/actions";
import { clearData as clearReducers, EntityTypeMap } from "../../store/slices/rowSlice";
import { appendContent } from "../../store/slices/contentSlice";
import { appendRows, ResultPayload } from "../../store/slices/rowSlice";
import { removeTimestamp } from "../../store/slices/stashSlice";
import { prependWarning } from "../../store/slices/errorSlice";
import { getInteractionIDs, getActionFromUrl, getCurAppName, ADD_ROWS } from "../../utils";
import { useSignOut } from "../../Hooks/useSignOut";
import { navigateConvolutionOrWarn } from "../../library/convolutionNavSearch";
import * as styles from "../../styles/controls.module.css";
import { DataRow } from "../Core/types";
import { getStashCellRows, StashState } from "../../store/slices/stashSlice";

const styleProps = {
  navbarIMG: styles["navbar-IMG"],
  navbarDropdown: styles["dropdown"],
  navbarAvatar: styles["navbar-Avatar"],
  navbarDropdownItem: styles["dropdown-item"],
  navbarViewToggler: styles["navbar-viewToggler"],
};

interface ControlsProps {
  setDoAction: (action: string) => void;
  setExpanded: (expanded: boolean) => void;
}

const Controls: React.FC<ControlsProps> = ({ setDoAction, setExpanded }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { pathname, search } = useLocation();

  // Individual useSelector hooks for each prop
  const isAuthenticated = useSelector((state: RootState) => state.session.authenticated);
  const isIncognito = useSelector((state: RootState) => state.session.isIncognito);
  const isPrivate = useSelector((state: RootState) => state.session.isPrivate);
  const isAppend = useSelector((state: RootState) => state.session.isAppend);
  const exData = useSelector((state: RootState) => state.session.exData);
  const imData = useSelector((state: RootState) => state.session.imData);
  const webapp = useSelector((state: RootState) => state.session.curApp);
  const shouldHydrate = useSelector((state: RootState) => state.settings.shouldHydrate);
  const fsq = useSelector((state: RootState) => state.settings.fsq);
  const parent = useSelector((state: RootState) => state.view.parent);
  const entity = useSelector((state: RootState) => state.view.entity);
  const stash = useSelector((state: RootState) => state.stash);

  const timestamps = (parent && entity) ? (stash as StashState)[parent + entity] ?? {} : {};
  const triggers = { isIncognito: !isIncognito, isAppend: !isAppend };

  const restoreData = (payload: { payload: DataRow[]; entity: string | undefined; parent: string | undefined; }) => {
    const { payload: data, entity: dest, parent: orig } = payload;
    if (!dest || !orig) return;
    dispatch(appendRows({ ...payload, isAppend, entity: dest as keyof EntityTypeMap, parent: orig }));
    dispatch(appendContent({ ...payload, isAppend, entity: dest, parent: orig }));
    const { parentID } = getInteractionIDs(orig, dest);
    if (parentID) {
      dispatch(viewParentData(
        data
          .map(({ metadata }: DataRow) => metadata?.[parentID])
          .flat()
          .filter((c) => c != null && c !== "")
          .map(String),
      ));
    }
  };

  const saveRows = (payload: string | undefined) => dispatch(escrowRows(payload));
  const saveContent = (payload: string | undefined) => dispatch(escrowContents(payload));
  const reLoadData = (payload: InitReloadingPayload) => dispatch(initReloading(payload));
  const removeStash = (payload: { approute: string; timestamp: string; }) => dispatch(removeTimestamp(payload));
  const clearData = () => dispatch(clearReducers());
  const signOut = useSignOut();

  return (
    <React.Fragment>
      <Link
        to="#"
        onClick={(e) => {
          e.preventDefault();
          if (getActionFromUrl() !== "view") saveRows(entity);
          else saveContent(entity);
          clearData();
          if (webapp && webapp > 0) {
            const app = getCurAppName(webapp);
            navigateConvolutionOrWarn(
              dispatch,
              navigate,
              '/convolution/' + app,
              undefined,
              { shouldHydrate, fsq },
            );
          } else {
            navigate("/docs");
          }
        }}
      >
        <Image src={convolutions} className={styleProps.navbarIMG + " " + styleProps.navbarViewToggler} />
      </Link>
      <NavDropdown className={styleProps.navbarDropdown}
        title={
          <Image
            src={avatar}
            className={styleProps.navbarIMG + " " + styleProps.navbarAvatar}
            roundedCircle
          />
        }
        id="collasible-nav-dropdown"
      >
        {exData && (
          <NavDropdown.Item className={styleProps.navbarDropdownItem}
            as={Link}
            to="#"
            onClick={(e) => {
              e.preventDefault();
              setDoAction(exportTexts.type);
            }}
          >
            Export
          </NavDropdown.Item>
        )}
        {imData && (
          <NavDropdown.Item className={styleProps.navbarDropdownItem}
            as={Link}
            to="#"
            onClick={(e) => {
              e.preventDefault();
              if (!isIncognito && !isPrivate) {
                const message = "Imported rows in Public view will lose metadata when stashed. Switch to Private (Settings) before stash/unstash.";
                dispatch(prependWarning(message));
              }
              setDoAction(importTexts.type);
            }}
          >
            Import
          </NavDropdown.Item>
        )}
        <NavDropdown.Item className={styleProps.navbarDropdownItem}
          as={Link}
          to="#"
          onClick={(e) => {
            e.preventDefault();
            if (isAuthenticated) {
              setExpanded(false);
              reLoadData(triggers);
            } else {
              navigate(`/login?redirectUrl=${encodeURIComponent(pathname + (search || ""))}`);
            }
          }}
        >
          {isIncognito ? "cognito" : "incognito"}
        </NavDropdown.Item>
        {isAuthenticated && (
          <React.Fragment>
            <NavDropdown.Item
              className={styleProps.navbarDropdownItem}
              as={Link}
              to="/login"
              onClick={(e) => {
                e.preventDefault();
                signOut();
              }}>
              Shutdown
            </NavDropdown.Item>
            <NavDropdown.Item
              className={styleProps.navbarDropdownItem}
              as={Link}
              to="/register">
              My Profile
            </NavDropdown.Item>
          </React.Fragment>
        )}
        {!isAuthenticated && (
          <NavDropdown.Item
            className={styleProps.navbarDropdownItem}
            as={Link}
            to="/verify">
            Verify
          </NavDropdown.Item>
        )}
        {Object.entries(timestamps).map(([key, cell]) => {
          const payload = getStashCellRows(cell);
          return (
          <NavDropdown.Item
            className={styleProps.navbarDropdownItem}
            to="#"
            key={key}
            as={Link}
            onClick={(e) => {
              e.preventDefault();
              if (entity && parent) {
                if (!isPrivate && !isIncognito) {
                  const operation = ADD_ROWS;
                  const params = {
                    entity,
                    parent,
                    isAppend,
                    keywords: undefined, // already inside
                    payload: payload.map((row: DataRow) => ({ ...row, metadata: undefined })),
                  } as ResultPayload & { entity: keyof EntityTypeMap };
                  const { payload: appendPayload, type: appendType } = appendRows(params);
                  dispatch({ type: appendType, payload: { ...appendPayload, operation } });
                }
                else restoreData({ payload, entity, parent });
              }
            }}
          >
            <TimeTag
              removeStash={removeStash}
              entity={entity || ""}
              parent={parent || ""}
              timestamp={key}
              key={key}
            />
          </NavDropdown.Item>
          );
        })}
      </NavDropdown>
    </React.Fragment>
  );
};

export default Controls;
