
import { Handler } from "../../store/slices/errorSlice";
import { outRoutes } from "../../library/commsUtils";
import { OutgoingMessage } from "../../store/slices/commsSlice";
import { OutgoingType } from "../../library/commsUtils";

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

