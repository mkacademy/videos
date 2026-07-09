import React, { useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Button, FormControl } from "react-bootstrap";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { ABORT } from "../../utils";
import { getValidParams } from "../Pagination/TableViewPager";
import { viewLoading, viewYoink } from "../../store/slices/viewSlice";
import { RootState } from "../../store/types";
import * as styles from "../../styles/navbar.module.css";
import * as searchBoxStyles from "../../styles/searchBox.module.css";

const styleProps = {
  btn: styles["btn"],
  btnFlex: searchBoxStyles["btnFlex"],
  mrSm2: searchBoxStyles["mr-sm-2"],
  flexItem: searchBoxStyles["flex-item"],
  formControl: searchBoxStyles["form-control"],
  btnOutlineLight: searchBoxStyles["btn-outline-light"],
};

interface SearchBoxProps {
  setExpanded: (expanded: boolean) => void;
  displayed?: string;
}

const SearchBox: React.FC<SearchBoxProps> = ({ setExpanded, displayed }) => {
  const dispatch = useDispatch();

  // Individual useSelector hooks for each prop (modern Redux pattern)
  const defaultTake = useSelector((state: RootState) => state.session.defaultTake);
  const isFetching = useSelector((state: RootState) => state.session.isFetching);
  const isLoading = useSelector((state: RootState) => state.view.isFetching);

  const { search, pathname } = useLocation();
  const { skip, take } = getValidParams(search, defaultTake);
  const navigate = useNavigate();
  const text = useRef<HTMLInputElement>(null);

  const handleSearchClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    setExpanded(false);
    e.preventDefault();
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();

    if (isFetching || isLoading) return;

    if (text.current && text.current.value !== "") {
      const seek = text.current.value;
      const searchQuery = `?seek=${seek}&skip=${skip}&take=${take}`;
      navigate({ pathname, search: searchQuery }, { replace: true });
      text.current.value = "";
      dispatch(viewYoink(seek));
      dispatch(viewLoading());
    } else {
      navigate({ pathname, search: "" }, { replace: true, state: ABORT });
    }
  };

  return (
    <React.Fragment>
      <FormControl
        type="text"
        ref={text}
        className={styleProps.mrSm2 + " " + styleProps.formControl}
        placeholder="Search"
        defaultValue={displayed}
      />
      <Link
        onClick={handleSearchClick}
        className={styleProps.flexItem}
        to="#"
      >
        <Button variant="outline-light" disabled={isFetching || isLoading} 
        className={styleProps.btn + " " + styleProps.btnOutlineLight}>
          <div className={styleProps.btnFlex}>
            <span>Search</span>
          </div>
        </Button>
      </Link>
    </React.Fragment>
  );
};

export default SearchBox;
