import React from "react";
import { Link } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { pauseFetchers } from "../../../store/slices/sessionSlice";
import type { RootState } from "../../../store/index";
import * as styles from "../../../styles/tablesConnector.module.css";

const QueryConnector: React.FC = () => {
    const paused = useSelector((state: RootState) => state.session.pauseFetchers);
    const dispatch = useDispatch();
    
    const toggler = () => dispatch(pauseFetchers());
    const message = `${paused ? "Resume" : "Pause"} Querying`;
    
    return (
        <div className={styles["tablesConnector"]}>
            <Link to="#" onClick={toggler}>
                {message}
            </Link>
        </div>
    );
};

export default QueryConnector;
