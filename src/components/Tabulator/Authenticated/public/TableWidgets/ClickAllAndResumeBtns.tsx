import React from "react";
import { Button, Spinner } from "react-bootstrap";
import { useSelector, useDispatch } from "react-redux";
import { pauseFetchers } from "../../../../../store/slices/sessionSlice";
import { clickInteractions } from "../../../../../store/slices/interactionSlice";
import { RootState } from "../../../../../store/types";
import * as styles from "../../../../../styles/descendantsWrapper.module.css";
import * as saveAndResume from "../../../../../styles/saveAndResume.module.css";

const stylesProps = {
  btn: saveAndResume["btn"],
  flexxing: saveAndResume["flexxing"],
  container: saveAndResume["container"],
  HorizantolFlex: styles["HorizantolFlex"],
  btnPrimary: saveAndResume["btn-primary"],
  btnWarning: saveAndResume["btn-warning"],
  spinnerBorderSm: saveAndResume["spinner-border-sm"],
}


const ClickAllAndResumeBtns: React.FC = () => {
  const paused = useSelector((state: RootState) => state.session.pauseFetchers);
  const clicked = useSelector((state: RootState) => state.interaction.clicked);
  
  const dispatch = useDispatch();

  const pauseToggler = () => dispatch(pauseFetchers());
  const clickselected = () => dispatch(clickInteractions(clicked));

  return (
    <div className={stylesProps.container}>
      <div className={stylesProps.HorizantolFlex + " " + stylesProps.flexxing}>
        {clicked.length > 0 ? (
          <Button variant="primary" disabled className={stylesProps.btn + " " + stylesProps.btnPrimary}>
            <Spinner
              as="span"
              size="sm"
              role="status"
              animation="border"
              aria-hidden="true"
              className={stylesProps.spinnerBorderSm}
            />
          </Button>
        ) : (
          <Button variant="primary" onClick={clickselected} className={stylesProps.btn + " " + stylesProps.btnPrimary}>
            Click
          </Button>
        )}
        <Button variant="warning" onClick={pauseToggler} className={stylesProps.btn + " " + stylesProps.btnWarning}>
          {paused ? "Resume" : "Pause"}
        </Button>
      </div>
    </div>
  );
};

export default ClickAllAndResumeBtns;
