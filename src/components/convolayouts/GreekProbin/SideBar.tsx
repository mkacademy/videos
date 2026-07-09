import {
  navLinkTop,
  navLinkMiddle,
  navLinkBottom,
  NavLinkTop,
  NavLinkBottom,
  NavLinkMiddle,
} from "../../../library/sideBarMenus";
import { iconsImgs } from "../../../library/sideBarMenus";
import useSidebar, { LinkState } from "../../../Hooks/useControlPanel/useSidebar";
import React from "react";
import { SidebarState } from "../../../store/slices/sidebarSlice";
import * as stylesSidebar from '../../../styles/cpanelSide.module.css';
import { AppItem } from "../../../Hooks/useControlPanel/useSidebar";
import { InitLoadingPayload } from "../../../library/actions";

const styleProps = {
  top: stylesSidebar["top"],
  middle: stylesSidebar["middle"],
  bottom: stylesSidebar["bottom"],
  active: stylesSidebar["active"],
  sidebar: stylesSidebar["sidebar"],
  navigation: stylesSidebar["navigation"],
  navList: stylesSidebar["nav-list"],
  navItem: stylesSidebar["nav-item"],
  navLink: stylesSidebar["nav-link"],
  navLinkIcon: stylesSidebar["nav-link-icon"],
  navLinkText: stylesSidebar["nav-link-text"],
}

interface SidebarProps {
  webapp: string;
  reset: () => void;
  defaultTake: number;
  isExpandableId: number;
  setLookUp: () => void;
  activeLinks: LinkState[];
  executables: SidebarState;
  setWebApp: (webapp: string) => void;
  cpanelManager: (payload: InitLoadingPayload) => void;  
  highlighter: (params: { id: number; isExpandable: boolean }) => void;
  setActiveLinks: (updater: (prev: LinkState[]) => LinkState[]) => void;
  action: (params: { title: string; prefix?: string; isFilter: boolean }) => void;
}

export default function Sidebar(props: SidebarProps) {
  const {
    webapps,
    setWebApp,
    tabulator,
    unselector,
    topSelector,
    activeLinks,
    executables,
    lookUpToggler,
    middleSelector,
    isExpandableId,
    bottomSelector,
  } = useSidebar(props);
  return (
    <div className={`${styleProps.sidebar}`}>
      <nav className={`${styleProps.navigation}`}>
        <ul className={`${styleProps.navList}`}>
          <li className={`${styleProps.navItem}`}>
            <a href="#" className={`${styleProps.navLink}`} onClick={unselector}>
              <img
                className={`${styleProps.navLinkIcon}`}
                src={iconsImgs.alert}
                alt="unselect"
              />
              <span className={`${styleProps.navLinkText}`}>Unselect</span>
            </a>
          </li>
          <li className={`${styleProps.navItem}`}>
            <a
              href="#"
              className={`${styleProps.navLink}`}
              onClick={
                !executables.isLookupEnabled
                  ? () => console.log("lookup disabled")
                  : lookUpToggler
              }
            >
              <img
                className={`${styleProps.navLinkIcon}`}
                src={
                  executables.isLookupEnabled
                    ? !executables.isLookupSelected
                      ? iconsImgs.empty_check
                      : iconsImgs.check
                    : iconsImgs.search
                }
                alt="unselect"
              />
              <span className={`${styleProps.navLinkText}`}>LookUp</span>
            </a>
          </li>
          {navLinkTop.map((nlk: NavLinkTop) => {
            const clickHandler = (e: React.MouseEvent) => topSelector(e, nlk);
            const active = isExpandableId === nlk.id ? styleProps.active : "";
            return (
              <li className={`${styleProps.navItem}`} key={nlk.id}>
                <a
                  href="#"
                  onClick={clickHandler}
                  className={`${styleProps.navLink} ${styleProps.top} ${active}`}
                >
                  <img
                    src={nlk.image}
                    alt={nlk.title}
                    className={`${styleProps.navLinkIcon}`}
                  />
                  <span className={`${styleProps.navLinkText}`}>{nlk.title}</span>
                </a>
              </li>
            );
          })}
          {activeLinks.map((nlk: LinkState, i: number) => {
            const predicate = ({ id }: NavLinkMiddle) => id === nlk.id;
            const match = navLinkMiddle.find(predicate);
            const active = nlk.isActive ? styleProps.active : "";
            const clickHandler = (e: React.MouseEvent) => middleSelector(e, match);
            return match === undefined ? (
              <React.Fragment key={i} />
            ) : (
              <li className={`${styleProps.navItem}`} key={match.id}>
                <a
                  href="#"
                  onClick={clickHandler}
                  className={`${styleProps.navLink} ${styleProps.middle} ${active}`}
                >
                  <img
                    src={match.image}
                    alt={match.title}
                    className={`${styleProps.navLinkIcon}`}
                  />
                  <span className={`${styleProps.navLinkText}`}>{match.title}</span>
                </a>
              </li>
            );
          })}
          {navLinkBottom.map((nlk: NavLinkBottom) => {
            const clickHandler = (e: React.MouseEvent) => bottomSelector(e, nlk);
            const notFilterSelected =
              nlk.prefix === undefined &&
              ((nlk.title === "Downward" &&
                executables.direction === true) ||
                (nlk.title === "Upward" && executables.direction === false));
            const isFilterSelected =
              nlk.prefix && executables["filter"] === nlk.title;
            const isSelected = isFilterSelected || notFilterSelected;
            const active = isSelected ? styleProps.active : "";
            return (
              <li className={`${styleProps.navItem}`} key={nlk.id}>
                <a
                  href="#"
                  onClick={clickHandler}
                  className={`${styleProps.navLink} ${styleProps.bottom} ${active}`}
                >
                  <img
                    className={`${styleProps.navLinkIcon}`}
                    src={nlk.image}
                    alt={nlk.title}
                  />
                  <span className={`${styleProps.navLinkText}`}>{nlk.title}</span>
                </a>
              </li>
            );
          })}
          <li className={`${styleProps.navItem}`}>
            <a href="#" className={`${styleProps.navLink}`} onClick={tabulator}>
              <img
                className={`${styleProps.navLinkIcon}`}
                src={iconsImgs.gears}
                alt="Tabulate"
              />
              <span className={`${styleProps.navLinkText}`}>Tabulate</span>
            </a>
          </li>
          {webapps.map(({ isActive, app, id, title, image }: AppItem) => {
            const clickHandler = (e: React.MouseEvent) => setWebApp(e, app);
            const active = isActive ? styleProps.active : "";
            return (
              <li className={`${styleProps.navItem}`} key={id}>
                <a
                  href="#"
                  onClick={clickHandler}
                  className={`${styleProps.navLink} ${styleProps.middle} ${active}`}
                >
                  <img src={image} alt={title} className={`${styleProps.navLinkIcon}`} />
                  <span className={`${styleProps.navLinkText}`}>{title}</span>
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
} 