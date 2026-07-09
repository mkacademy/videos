import React from "react";
import { Link } from "react-router-dom";
import * as styles from "../../styles/notFound.module.css";

const NotFound: React.FC = () => {
  return (
    <div className={styles["page"]}>
      <div className={styles["container"]}>
        <div className={styles["telecomIcon"]}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="80"
            height="80"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
            <line x1="23" y1="1" x2="1" y2="23" />
          </svg>
        </div>

        <h1 className={styles["title"]}>404</h1>
        <h2 className={styles["subtitle"]}>Area Code Not Found</h2>

        <p className={styles["description"]}>
          We're sorry; the page you are trying to reach has an unrecognized address routing rule.
          The directory path may have changed, or the extension no longer accepts outside communication.
        </p>

        <div className={styles["operatorNote"]}>
          NETWORK_ERROR_MSG: [Status 404]
          <br />
          DIAL_STRING_FAILURE: Requested resource is outside our coverage area.
        </div>

        <Link to="/" className={styles["btn"]}>
          Return to Main Line
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
