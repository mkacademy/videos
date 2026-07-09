import React from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { switchToMaximunFeature } from "../../store/slices/settingsSlice";
import * as styles from "../../styles/forbidden.module.css";

const Forbidden: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const handleLetMeIn = () => {
    dispatch(switchToMaximunFeature());
  };

  return (
    <div className={styles["page"]}>
      <div className={styles["container"]}>
        <div className={styles["lockIcon"]} aria-hidden="true">
          🔒
        </div>

        <h1 className={styles["title"]}>403</h1>
        <h2 className={styles["subtitle"]}>Access Forbidden</h2>

        <p className={styles["description"]}>
          You do not have permission to view this resource. The server understood your request but refuses to authorize it.
        </p>

        <div className={styles["btnContainer"]}>
          <button
            type="button"
            className={`${styles["btn"]} ${styles["btnPrimary"]}`}
            onClick={handleLetMeIn}
          >
            Yes, I do let me in
          </button>
          <button
            type="button"
            className={`${styles["btn"]} ${styles["btnSecondary"]}`}
            onClick={() => navigate(-1)}
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
};

export default Forbidden;
