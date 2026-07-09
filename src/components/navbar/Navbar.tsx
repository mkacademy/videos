import React from "react";
import { useSelector, useDispatch } from "react-redux";
import { Link } from "react-router-dom";
import { Nav, Form, Navbar } from "react-bootstrap";
import { RootState } from "../../store/types";
import { viewMenu, initFileManager } from "../../store/slices/viewSlice";
import { clearTraversals, mutateAlgorithm } from "../../store/slices/traversalSlice";
import { getAlias, capitalizeFirstLetter } from "../../utils";
import useNavMenu from "../../Hooks/useNavMenu";
import Controls from "./Controls";
import SearchBox from "./SearchBox";
import Roots from "../modals/Roots";
import History from "../modals/History";
import * as styles from "../../styles/navbar.module.css";
import * as searchBoxStyles from "../../styles/searchBox.module.css";
import * as controlsStyles from "../../styles/controls.module.css";


const styleProps = {
  navbar: styles["navbar"],
  navLink: styles["nav-link"],
  navbarBrand: styles["navbar-brand"],
  formInline: styles["form-inline"],
  navbarCollapse: styles["navbar-collapse"],
  navbarNav: styles["navbar-nav"],
  navbarToggle: styles["navbar-toggler"],
  mrAuto: styles["mr-auto"],
  searchBox: searchBoxStyles["searchBox"],
  controls: controlsStyles["controls"],
};

const NavbarComponent: React.FC = () => {
  const dispatch = useDispatch();

  // Use individual selectors for each prop
  const spread = useSelector((state: RootState) => state.view.menus);
  const parent = useSelector((state: RootState) => state.view.parent);
  const exAlgorithm = useSelector((state: RootState) => state.session.exAlgorithm);
  const pickedIndex = useSelector((state: RootState) => state.session.selectedMenu);
  const exTraversals = useSelector((state: RootState) => state.session.exTraversals);

  // Action dispatchers
  const setDoAction = (payload: string) => dispatch(initFileManager(payload));
  const navigateMenu = (payload: number) => dispatch(viewMenu(payload));
  const removeHistory = () => dispatch(clearTraversals());
  const removeRoots = () => dispatch(mutateAlgorithm([]));

  const props = { spread, navigateMenu, pickedIndex };
  const { setExpanded, prevClicked, ...toggles } = useNavMenu(props);
  const { backDisable, nextDisable, showHistory, showRoots } = toggles;
  const { nextClicked, history, expanded, roots } = toggles;

  if (parent === undefined) return <React.Fragment />;

  return (
    <React.Fragment>
      <Navbar
        expand="lg"
        bg="primary"
        variant="dark"
        collapseOnSelect
        className={styleProps.navbar}
        expanded={expanded ? true : undefined}
      >
        <Navbar.Brand
          to="#"
          as={Link}
          className={styleProps.navbarBrand}
          onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
            e.preventDefault();
            setExpanded(true);
            showHistory(true);
          }}
        >
          MKACADEMY
        </Navbar.Brand>
        <Navbar.Toggle
          className={styleProps.navbarToggle}
          onClick={() => setExpanded(!expanded)}
          aria-controls="responsive-navbar-nav"
        />
        <Navbar.Collapse className={styleProps.navbarCollapse} id="responsive-navbar-nav">
          <Nav className={styleProps.mrAuto + " " + styleProps.navbarNav}>
            <Nav.Link
              className={styleProps.navLink}
              to="#"
              onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
                e.preventDefault();
                showRoots(true);
              }}
              as={Link}
            >
              {capitalizeFirstLetter(getAlias(parent))}
            </Nav.Link>
            <Nav.Link
              className={styleProps.navLink}
              to="#"
              as={Link}
              disabled={backDisable}
              onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
                e.preventDefault();
                prevClicked();
              }}
            >
              Previous
            </Nav.Link>
            <Nav.Link
              className={styleProps.navLink}
              to="#"
              as={Link}
              disabled={nextDisable}
              onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
                e.preventDefault();
                nextClicked();
              }}
            >
              Next
            </Nav.Link>
          </Nav>
          <Nav className={styleProps.navbarNav}>
            <Form className={styleProps.formInline + " " + styleProps.searchBox + " " + styleProps.controls}>
              <SearchBox setExpanded={setExpanded} />
              <Controls
                setDoAction={setDoAction}
                setExpanded={setExpanded}
              />
            </Form>
          </Nav>
        </Navbar.Collapse>
      </Navbar>
      <Roots
        isShow={roots}
        showRoots={showRoots}
        removeRoots={removeRoots}
        setDoAction={setDoAction}
        exAlgorithm={exAlgorithm}
      />
      <History
        isShow={history}
        setDoAction={setDoAction}
        showHistory={showHistory}
        exTraversals={exTraversals}
        removeHistory={removeHistory}
      />
    </React.Fragment>
  );
};

export default NavbarComponent;
