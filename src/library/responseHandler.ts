import {
    SUCCESS,
    UPDATE_ROWS,
    DELETE_ROWS,
    ADD_ROWS,
    INSERT_ROWS,
    truncatedStringify,
} from "../utils";
import {
    stepsCompleted,
    coursesCompleted,
    tutorialsCompleted,
    quizzesCompleted,
    containerCompleted,
} from "./actions";
import { MutateEntityResponse } from "../library/types";
import { UpdateStatusesPayload } from "../store/slices/actionSlice";
import { UpdateOrdinalsPayload } from "../store/slices/rowSlice";
import { UpdateTextsPayload } from "../store/slices/textSlice";



interface ResponseHandlerParams {
    resetStatuses?: (items: UpdateStatusesPayload[]) => void;
    resetOrdinals?: (items: UpdateOrdinalsPayload[]) => void;
    resetTexts?: (items: UpdateTextsPayload[]) => void;
    resetOwnerships?: (ids: string[]) => void;
    purgeRows?: (ids: string[]) => void;
    syncIDs?: (ids: string[]) => void;
    response: MutateEntityResponse;
    restoreRows?: () => void;
}

const OWNERSHIP_UPDATE_REPLY = /^success,\[\],\[\],\[\],\[\],\[\],\[\],\[[\d,\s]+\]$/;

const imply = (id: string): boolean => id !== "" && id !== " ";

const pred = (id: string): { id: string, modified: boolean } => ({ id, modified: false });

export default function responseHandler({
    resetStatuses,
    resetOrdinals,
    restoreRows,
    resetTexts,
    purgeRows,
    response,
    syncIDs,
    resetOwnerships,
}: ResponseHandlerParams): void {
    console.log(truncatedStringify(response, 30, 2));
    const zero: number = 0;
    const reply: string = response.reply || "";
    const firstComma: number = reply.indexOf(",");
    const result: string = reply.substring(zero, firstComma);
    const data: string = reply.substring(firstComma + 2, reply.length - 1);
    if (response.task === INSERT_ROWS) {
        if (result === SUCCESS) {
            const ids = data.replace(/, /g, ":").split(":");
            syncIDs?.(ids);
        } else {
            console.log(result, response.task, data);
        }
    } else if (response.task === DELETE_ROWS) {
        if (result === SUCCESS) {
            const ids = data.replace(/, /g, ",").split(",");
            purgeRows?.(ids);
        } else {
            restoreRows?.();
            console.log(result, response.task, data)
        }
    } else if (response.task === ADD_ROWS) {
        if (result === SUCCESS) {
            const ids = data.replace(/, /g, ",").split(",");
            purgeRows?.(ids);
        } else {
            restoreRows?.();
            console.log(result, response.task, data)
        }
    } else if (response.task === UPDATE_ROWS) {
        if (result === SUCCESS) {
            if (OWNERSHIP_UPDATE_REPLY.test(reply)) {
                const ownershipData = reply.substring(firstComma + 1);
                const segments = ownershipData.split("],[");
                const lastSegment = segments[segments.length - 1].replace(/^\[/, "").replace(/\]$/, "");
                const ids = lastSegment.split(",").map((id) => id.trim()).filter(imply);
                resetOwnerships?.(ids);
                return;
            }
            const lastComma: number = data.lastIndexOf("],");
            const updatedIDs: string = data.substring(zero, lastComma);
            const IDs: string[] = updatedIDs.split("],[");
            const updatedTexts: string[] | undefined = IDs[zero]
                ?.replace(/, /g, ",")
                .split(",")
                .filter(imply);

            const updatedStates: string[] | undefined = IDs[1]
                ?.replace(/, /g, ",")
                .split(",")
                .filter(imply);

            const updatedOrders: string[] | undefined = IDs[2]
                ?.replace(/, /g, ",")
                .split(",")
                .filter(imply);

            if (updatedStates && updatedStates.length > 0) {
                resetStatuses?.(updatedStates.map(pred));
            }
            if (updatedOrders && updatedOrders.length > 0) {
                resetOrdinals?.(updatedOrders.map(pred));
            }
            if (updatedTexts && updatedTexts.length > 0) {
                resetTexts?.(updatedTexts.map(pred));
            }
        } else {
            console.log(result, response.task, data);
        }
    }
}

export const getEditedType = (route: string | undefined): string | undefined => {
    if (route && route.endsWith("lowersifters")) return containerCompleted.type;
    else if (route && route.endsWith("sifters")) return coursesCompleted.type;
    else if (route && route.endsWith("filters")) return tutorialsCompleted.type;
    else if (route && route.endsWith("dashboards")) return quizzesCompleted.type;
    else if (route && route.endsWith("instructions")) return stepsCompleted.type;
    return undefined;
};
