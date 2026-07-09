
import { Handler } from "../../store/slices/errorSlice";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { outRoutes, appIndeces } from "../../library/commsUtils";
import { Tutor, IncomingMessage, OutgoingMessage, OutgoingType } from "../../store/slices/commsSlice";
import { AppDispatch, RootState } from "../../store";
import { navigateConvolutionOrWarn, stickyFsqFromState } from "../../library/convolutionNavSearch";


interface Props {
  webapp: string;
  tutors: Tutor[];
  pathname: string;
  outgoing: OutgoingMessage[];
  incoming: IncomingMessage[];
  encodedData: Record<string, string>;
  dismissals: Record<string, boolean>;
}

export const withReciepients = (payload: { response: OutgoingMessage[]; handlers: Record<string, Handler[]> }) => {
  const { response, handlers } = payload;
  const getRecipients = ({ type, targets = [] }: { type: OutgoingType; targets?: (string | number)[] }) => {
    const route = outRoutes[type];
    let handlesKey: string;
    if (route?.startsWith("bosses")) 
      handlesKey = "handlesBosses";
    else if (route?.startsWith("minions")) 
      handlesKey = "handlesMinions";
    else if (route?.startsWith("underbosses")) 
      handlesKey = "handlesUnderbosses";
    else 
      handlesKey = route ?? "";
    return (handlers[handlesKey] ?? [])
      .filter(({ id }) => targets.includes(id))
      .map(({ keyword }) => keyword);
  };
  return response.map((outgoing: OutgoingMessage) => ({
    reciepients: getRecipients(outgoing),
    ...outgoing,
  }));
};

const useCommunications = ({
  webapp,
  tutors,
  outgoing,
  incoming,
  pathname,
  dismissals,
  encodedData,
}: Props) => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const stickyFsq = useSelector((state: RootState) => stickyFsqFromState(state));
  const tabChnageHandler = (tab: string) => {
    navigateConvolutionOrWarn(
      dispatch,
      navigate,
      '/convolution/' + tab,
      encodedData[appIndeces[tab]],
      stickyFsq,
    );
  };

  switch (webapp) {
    case "tutors": {
      const dismised = dismissals[pathname] ?? false;
      const filtered = tutors.filter(
        ({ isDismissed }) => isDismissed === dismised
      );
      return {
        outgoing,
        incoming,
        tutors: filtered,
        tabChnageHandler,
        noIncoming: true,
        noOutgoing: true,
        noTutors: filtered.length === 0,
      };
    }
    case "outgoing": {
      const dismised = dismissals[pathname] ?? false;
      const filtered = outgoing.filter(
        ({ isDismissed }) => isDismissed === dismised
      );
      return {
        tutors,
        incoming,
        noTutors: true,
        tabChnageHandler,
        noIncoming: true,
        outgoing: filtered,
        noOutgoing: filtered.length === 0,
      };
    }
    case "incoming": {
      const dismised = dismissals[pathname] ?? false;
      const filtered = incoming.filter(
        ({ isDismissed }) => isDismissed === dismised
      );
      return {
        tutors,
        outgoing,
        tabChnageHandler,
        incoming: filtered,
        noIncoming: filtered.length === 0,
        noOutgoing: true,
        noTutors: true,
      };
    }
    default:
      return {
        tutors,
        outgoing,
        incoming,
        noTutors: true,
        noIncoming: true,
        noOutgoing: true,
        tabChnageHandler,
      };
  }
};

export default useCommunications; 