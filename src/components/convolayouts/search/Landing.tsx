import React from "react";
import {
  setRoutes,
  matchKeyword,
  insertKeyword,
  removeKeyword,
  unmatchKeyword,
  setSelectedRoute,
  SelectedRoute,
  Search,
  Route,
} from "../../../store/slices/searchSlice";
import { setPagedRoute } from "../../../store/slices/paginationSlice";
import { Link } from "react-router-dom";
import { BsSearch } from "react-icons/bs";
const Logo = new URL("../../../Images/logo256x256.png", import.meta.url).href;   
import { useDispatch, useSelector } from "react-redux";
import { Form, InputGroup, Row } from "react-bootstrap";
import RouteTag from "../../DisplayedTags/WebAppTags/RouteTag";
import SearchTag from "../../DisplayedTags/WebAppTags/SearchTag";
import RouteAlertTag from "../../DisplayedTags/WebAppTags/RouteAlertTag";
import useSearchBar from "../../../Hooks/useSearch/useSearchBar";
import SearchResults from "../../DisplayedTags/WebAppTags/SearchResults";
import { updateCsObj } from "../../../store/slices/paginationSlice";
import { capitalizeFirstLetter, getAlias } from "../../../utils";
import * as styles from "../../../styles/search.module.css";
import * as menuStyles from "../../../styles/menutags.module.css";

interface LandingProps {
  webapp: string;
  isLoading: boolean;
  searchHistory: Search[];
  setWebApp: (app: string) => void;
  routesRef: { current: Record<string, string>[] };
  searchManager: (payload: { searchedRoutes: Search[] }) => void;
}

interface RootState {
  search: {
    searches: Search[];
    selectedRoute: SelectedRoute;
    routes: Record<string, Route>;
  };
  session: {
    roles: string[];
    curApp: number;
  };
}

const styleProps = {
  alert: menuStyles["alert"],
  thumbs: menuStyles["thumbs"],
  search: menuStyles["search"],
  menutag: menuStyles["menutag"],
  toBadge: menuStyles["toBadge"],
  fromBadge: menuStyles["fromBadge"],
  filterBadge: menuStyles["filterBadge"],
  small_thumbs: menuStyles["small_thumbs"],
  verticalFlex: menuStyles["verticalFlex"],
  HorizantolFlex: menuStyles["HorizantolFlex"],
};

const Landing: React.FC<LandingProps> = ({
  webapp,
  routesRef,
  setWebApp,
  searchHistory,
  searchManager,
  isLoading,
}) => {
  const dispatch = useDispatch();
  const routes = useSelector((state: RootState) => state.search.routes);
  const searches = useSelector((state: RootState) => state.search.searches);
  const isAdmin = useSelector((state: RootState) => state.session.roles?.length > 2);
  const selectedRoute = useSelector((state: RootState) => state.search.selectedRoute);

  const {
    ref,
    submit,
    isMobile,
    resultsView,
    setWebApp: setWebAppInternal,
    webapps,
  } = useSearchBar({
    webapp,
    isAdmin,
    searches,
    isLoading,
    routesRef,
    searchHistory,
    setWebApp,
    searchManager,
    appendRoutes: (payload) => dispatch(setRoutes(payload)),
    insertSearch: (payload) => dispatch(insertKeyword(payload)),
    preserveSearches: (encodedData: string) => dispatch(updateCsObj(encodedData)),
  });

  const {
    traversal = "",
    keywords = [],
    index = 0,
  } = selectedRoute || {};

  const blocker = (e: React.FormEvent) => e.preventDefault();
  return (
    <div className={`screenFlex ${styles["screenFlex"]}`}>
      <Link to="/pricingplans" className="details noscrollvisible">
        <img src={Logo} width={256} height={256} alt="logo" />
      </Link>
      <Form onSubmit={blocker} className="searchBox">
        <InputGroup className={`searchBarStyles ${styles["searchBarStyles"]}`}>
          <Form.Control type="text" ref={ref} disabled={isLoading} className={`form-control ${styles['form-control']}`} />
          <Link to="#" className="link" onClick={submit}>
            <div className={`input-group-prepend ${styles['input-group-prepend']}`}>
              <InputGroup.Text className={`input-group-text ${styles['input-group-text']}`}>
                <BsSearch />
              </InputGroup.Text>
            </div>
          </Link>
        </InputGroup>
      </Form>
      <div className={`acountLinks ${styles["acountLinks"]}`}>
        {webapps.map((app: string, i: number) => {
          const isActive = app === webapp;
          const selectedCss = isActive ? `active ${styles["active"]}` : "";
          const clickHandler = !isActive
            ? (e: React.MouseEvent) => setWebAppInternal(e, app)
            : resultsView;
          return (
            <React.Fragment key={i}>
              <Link to="#" onClick={clickHandler} className={selectedCss}>
                {app}
              </Link>
              {i < webapps.length - 1 && <span className={`divider ${styles["divider"]}`}>|</span>}
            </React.Fragment>
          );
        })}
      </div>
      <div className={`screenFlex ${styles["screenFlex"]}`}>
        <Row className={isMobile ? menuStyles["mobile"] : menuStyles["menuTags"]}>
          {Object.entries(routes).map(([key, values]) => {
            const selected = traversal === key;
            const selectedCss = selected ? menuStyles["selectedMenu"] : "";
            const colClass = !isMobile ? `col-sm-auto ${menuStyles['col-sm-auto']}` : 'col ';
            return (
              <div key={key} className={selectedCss + ' ' + colClass}>
                <RouteTag
                  {...values}
                  selected={selected}
                  styles={styleProps}
                  isLoading={isLoading}
                  setPaginated={(payload) => dispatch(setPagedRoute(payload))}
                  setSelected={(payload) => dispatch(setSelectedRoute(payload))}
                />
              </div>
            );
          })}
        </Row>
        <Row className={isMobile ? menuStyles["mobile"] : menuStyles["menuTags"]}>
          {searches.map((yoink: Search, i: number) => {
            const predicate0 = ({ keyword }: { keyword: string }) => keyword === yoink.keyword;
            return (
              <div key={i} className={!isMobile ? `col-sm-auto ${menuStyles['col-sm-auto']}` : 'col-sm-auto'}>
                <SearchTag
                  index={index}
                  search={yoink}
                  isLoading={isLoading}
                  horizontalFlex={styleProps.HorizantolFlex}
                  yoinkIndex={keywords.findIndex(predicate0)}
                  markSearch={(payload) => dispatch(matchKeyword(payload))}
                  unmarkSearch={(payload) => dispatch(unmatchKeyword(payload))}
                  removeSearch={(payload) => dispatch(removeKeyword(payload))}
                />
              </div>
            );
          })}
        </Row>
        <div className="mb-2">
          <SearchResults routes={routes} selectedTraversal={traversal} isLoading={isLoading} />
        </div>
        <Row>
          {Object.entries(routes).map(([key, values]) => {
            const { from, to, keywords: routeKeywords, index: routeIndex } = values;
            const route = (from ? getAlias(from) : '') + (to ? capitalizeFirstLetter(getAlias(to)) : '');
            const selected = traversal === key;
            const colClass = !isMobile ? `col-sm-auto ${menuStyles['col-sm-auto']}` : 'col-sm-auto';
            const onSelect = !selected && !isLoading
              ? () => {
                  dispatch(setPagedRoute(key));
                  dispatch(setSelectedRoute({
                    traversal: key,
                    keywords: routeKeywords,
                    index: routeIndex,
                  }));
                }
              : undefined;
            return (
              <div
                key={key}
                className={colClass}
                style={{ paddingLeft: '0.1875rem', paddingRight: '0.1875rem' }}
              >
                <RouteAlertTag
                  routeAlias={route}
                  selected={selected}
                  onSelect={onSelect}
                  horizontalFlex={styleProps.HorizantolFlex}
                />
              </div>
            );
          })}
        </Row>
      </div>
    </div>
  );
};

export default Landing;
