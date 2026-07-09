import React from 'react';
import Copyrights from "./Copyrights";
import ViewSelector from "./ViewSelector";
import ClassicPager from "../Pagination/Classic";
import { useRecords } from "../../Hooks/useRecords";
import ControlPanel from "../convolayouts/GreekProbin/Screen";
import { CpanelGlobal } from '../views/wrappers/cPanelGlobal';
import * as styles from '../../styles/cpanel.module.css';
import { InitLoadingPayload } from '../../library/actions';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';

interface CpanelProps {
  setWebApp: (app: string) => void;
  cpanelManager: (msg: InitLoadingPayload) => void;
  defaultTake: number;
  noRecords?: boolean;
  convolution: string;
  webapp: string;
}

const Cpanel: React.FC<CpanelProps> = ({ cpanelManager, defaultTake, webapp, setWebApp, noRecords, convolution }) => {
  useRecords({ convolution, webapp });
  const response = useSelector((state: RootState) => state.sidebar.response);
  const requestIsFetching = useSelector((state: RootState) => state.view.requestIsFetching);
  const requestIsSkeletons = useSelector((state: RootState) => state.view.requestIsSkeletons);
  return (
    <CpanelGlobal>
      <div className={`container ${styles["cpanel"]}`}>
        <Copyrights
          formatter={convolution}
          loading={requestIsFetching}
          skeletons={requestIsSkeletons}
          convolution={styles["cpanel"]}
          confirmation={<ViewSelector />}
        >
          <ControlPanel
            webapp={webapp}
            response={response}
            setWebApp={setWebApp}
            defaultTake={defaultTake}
            cpanelManager={cpanelManager}
          />
          <ClassicPager noContent={noRecords}
          />
        </Copyrights>
      </div>
    </CpanelGlobal>
  );
};

export default Cpanel; 