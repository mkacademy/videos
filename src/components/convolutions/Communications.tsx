import Copyrights from './Copyrights';
import ViewSelector from './ViewSelector';
import React, { useCallback } from 'react';
import ClassicPager from '../Pagination/Classic';
import { useRecords } from '../../Hooks/useRecords';
import * as commsStyles from '../../styles/comms.module.css';
import { AppGlobal } from '../views/wrappers/appGlobal';
import CommunicationsScreen from '../convolayouts/Communications/Screen';
import * as styles from '../../styles/shortcuts.module.css';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';


interface ConvolutionProps {
  incomingManager: () => void;
  outgoingManager: () => void;
  tutorsManager: () => void;
  convolution: string;
  pathname: string;
  webapp: string;
}

const Communications: React.FC<ConvolutionProps> = ({
  incomingManager,
  outgoingManager,
  tutorsManager,
  convolution,
  pathname,
  webapp,
}) => {

  useRecords({ convolution, webapp });
  const requestIsFetching = useSelector((state: RootState) => state.view.requestIsFetching);
  const requestIsSkeletons = useSelector((state: RootState) => state.view.requestIsSkeletons);
  const action = useCallback(() => {
    switch (webapp) {
      case "tutors":
        tutorsManager();
        break;
      case "outgoing":
        outgoingManager();
        break;
      case "incoming":
        incomingManager();
        break;
      default:
        break;
    }
  }, [webapp, incomingManager, outgoingManager, tutorsManager]);
  return (
    <AppGlobal>
      <div className={`container ${commsStyles["commsContainer"]}`}>
        <Copyrights
          action={action}
          formatter={convolution}
          loading={requestIsFetching}
          skeletons={requestIsSkeletons}
          convolution={styles["carders"]}
          confirmation={<ViewSelector />}
        >
          <CommunicationsScreen
            webapp={webapp}
            pathname={pathname}
            isLoading={requestIsFetching}
          />
          <ClassicPager noContent={false} />
        </Copyrights>
      </div>
    </AppGlobal>

  );
};

export default Communications; 