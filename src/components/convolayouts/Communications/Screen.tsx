import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../../store';
import { Container, Tab, Tabs } from 'react-bootstrap';
import { _500 as Notfound } from '../../views/404';
import Tutors from './Tutors';
import { Incoming, Outgoing } from './Messages';
import useCommunications from '../../../Hooks/useCommunications/useCommunications';
import {
  setSelectedTutors,
  toggleIncoming,
  toggleOutgoing,
  setSelectedIncomings,
  setSelectedOutgoings,
  toggleTutor,
  outlineTutor,
  outlineOutgoing,
  outlineIncoming,
  TutorStatus,
} from '../../../store/slices/commsSlice';
import { mutateMailer } from '../../../store/slices/sessionSlice';
import { IncommingButtonLabel, OutgoingButtonLabel } from '../../../library/commsUtils';
import * as commsStyles from '../../../styles/comms.module.css';
import * as _404styles from '../../../styles/404.module.css';

interface CommunicationsScreenProps {
  webapp: string;
  pathname: string;
  isLoading: boolean;
}

const Communications: React.FC<CommunicationsScreenProps> = ({
  webapp,
  pathname,
  isLoading,
}) => {
  const dispatch = useDispatch();
  const tutors = useSelector((state: RootState) => state.comms.tutors);
  const outgoing = useSelector((state: RootState) => state.comms.outgoing);
  const incoming = useSelector((state: RootState) => state.comms.incoming);
  const encodedData = useSelector((state: RootState) => state.pagination.cs);
  const dismissals = useSelector((state: RootState) => state.session.dismissals);
  const authenticated = useSelector((state: RootState) => state.session.authenticated);

  const selectTutors = (payload: { id: number; isActive?: TutorStatus; isAble?: TutorStatus }) => {
    dispatch(setSelectedTutors(payload));
  };

  const selectTutor = (payload: { ids: string[] }) => {
    dispatch(outlineTutor(payload));
  };

  const toggleTutors = (payload: string) => {
    dispatch(toggleTutor(payload));
  };

  const curMailerSetter = (payload: number) => {
    dispatch(mutateMailer(payload));
  };

  const selectIncoming = (payload: { ids: string[] }) => {
    dispatch(outlineIncoming(payload));
  };

  const selectOutgoing = (payload: { ids: string[] }) => {
    dispatch(outlineOutgoing(payload));
  };

  const toggleIncomings = (payload: string) => {
    dispatch(toggleIncoming(payload));
  };

  const toggleOutgoings = (payload: string) => {
    dispatch(toggleOutgoing(payload));
  };

  const selectIncomings = (payload: { id: string; btnLabel: IncommingButtonLabel; source: string }) => {
    dispatch(setSelectedIncomings(payload));
  };

  const selectOutgoings = (payload: { id: string; btnLabel: OutgoingButtonLabel }) => {
    dispatch(setSelectedOutgoings(payload));
  };



  const {
    noTutors,
    noIncoming,
    noOutgoing,
    tabChnageHandler,
  } = useCommunications({
    webapp,
    tutors,
    pathname,
    outgoing,
    incoming,
    dismissals,
    encodedData,
  });

  const isempty = "oops! nothing in here";
  const isFetching = `loading ${webapp}... please wait`;
  const [showEmptyAfterStable, setShowEmptyAfterStable] = React.useState(false);
  React.useEffect(() => {
    let timer: number | undefined;
    if (!isLoading) {
      timer = window.setTimeout(() => {
        setShowEmptyAfterStable(true);
      }, 1000);
    } else {
      setShowEmptyAfterStable(false);
    }
    return () => {
      if (timer !== undefined) {
        window.clearTimeout(timer);
      }
    };
  }, [isLoading]);
  const notFoundMessage = isLoading || !showEmptyAfterStable ? isFetching : isempty;
  const tutorIsSelected = tutors.find((tutor: { checked?: boolean }) => tutor.checked);
  return (
    <Container>
      <Tabs
        id="tutors"
        activeKey={webapp}
        transition={false}
        onSelect={(key: string | null) => key && tabChnageHandler(key)}
      >
        <Tab title="Tutors" eventKey="tutors" disabled={isLoading}>
          {noTutors ? (
            <div className={`${_404styles["notFound"]} ${commsStyles["notFound"]}`}>
              <Notfound message={notFoundMessage} />
            </div>
          ) : (
            <Tutors
              tutors={tutors}
              clickHandler={selectTutors}
              outlineHandler={selectTutor}
              authenticated={authenticated}
              dismissHandler={toggleTutors}
              setCurMailer={curMailerSetter}
            />
          )}
        </Tab>
        <Tab
          title="Incoming"
          eventKey="incoming"
          disabled={isLoading || !tutorIsSelected}
        >
          {noIncoming ? (
            <div className={`${_404styles["notFound"]} ${commsStyles["notFound"]}`}>
              <Notfound message={notFoundMessage} />
            </div>
          ) : (
            <Incoming
            tutors={tutors}
              messages={incoming}
              authenticated={authenticated}
              clickHandler={selectIncomings}
              outlineHandler={selectIncoming}
              dismissHandler={toggleIncomings}
            />
          )}
        </Tab>
        <Tab title="Outgoing" eventKey="outgoing" disabled={isLoading}>
          {noOutgoing ? (
            <div className={`${_404styles["notFound"]} ${commsStyles["notFound"]}`}>
              <Notfound message={notFoundMessage} />
            </div>
          ) : (
            <Outgoing
              messages={outgoing}
              authenticated={authenticated}
              clickHandler={selectOutgoings}
              outlineHandler={selectOutgoing}
              dismissHandler={toggleOutgoings}
            />
          )}
        </Tab>
      </Tabs>
    </Container>
  );
};

export default Communications; 