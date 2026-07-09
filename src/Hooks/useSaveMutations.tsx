import { useEffect } from "react";
import { UPDATE_ROWS } from "../utils";
import { useParams } from "react-router-dom";
import Mutations, { Payload } from "../library/TableMutations";
import responseHandler from "../library/responseHandler";
import { Row, UpdateOrdinalsPayload } from "../store/slices/rowSlice";
import { UpdateTextsPayload } from "../store/slices/textSlice";
import { ActionItem, UpdateStatusesPayload } from "../store/slices/actionSlice";
import { ParentData } from "../store/slices/viewSlice";
import { MutateEntityResponse } from "../library/types";
import { DataRow } from "../components/Core/types";

export type MutationDataAccumulator = {
    requestIsProcessing?: boolean;
    curToken?: string | null;
    curMailer?: number;
    pause?: boolean;
    curApp?: number;
    quota?: number;
    entity?: string;
    mutateRole?: string;
    resolvers?: string[];
    target?: string;
    [key: string]: PayloadData | PayloadData[] | boolean | number | string | string[] | null | undefined;
};

export type PayloadData = Omit<Payload, 'task'>;

interface UseSaveMutationsParams {
    rows: Row[];
    texts: DataRow[];
    mutateRole: string;
    parentData: ParentData;
    statuses: ActionItem[];
    restoreRows: () => void;
    syncIDs: (ids: string[]) => void;
    purgeRows: (ids: string[]) => void;
    response?: MutateEntityResponse | string | undefined;
    resetTexts: (items: UpdateTextsPayload[]) => void;
    mutateTable: (data: MutationDataAccumulator | null, status: string) => void;
    resetOrdinals: (items: UpdateOrdinalsPayload[]) => void;
    resetStatuses: (items: UpdateStatusesPayload[]) => void;
    requestIsProcessing?: boolean;
    curMailer?: number;
    pause?: boolean;
    curToken?: string;
    curApp?: number;
    quota?: number;
}

export default function useSaveMutations({
    rows,
    texts,
    syncIDs,
    statuses,
    response,
    purgeRows,
    mutateRole,
    parentData,
    resetTexts,
    restoreRows,
    mutateTable,
    resetOrdinals,
    resetStatuses,
    requestIsProcessing,
    curMailer,
    pause,
    curToken,
    curApp,
    quota
}: UseSaveMutationsParams): () => void {
    const { target } = useParams<{ target: string }>();
    const { parent, IDs } = parentData;

    const callback = (): void => {
        const payloads: Payload[] = [];
        const resolvers: string[] = [];

        new Mutations.Builder()
            .withPayloads(payloads)
            .withStatuses(statuses)
            .withParentIDs(IDs.map(id => parseInt(id)))
            .withTarget(target!)
            .withTexts(texts)
            .withRows(rows)
            .build()
            .saveDeletedRows(purgeRows)
            .andIncludeUtilities()
            .saveCreatedRows()
            .saveRowsWithAllModified()
            .andExcludeToBeSaved()
            .saveRowsWithOrderAndTextsModified()
            .andExcludeToBeSaved()
            .saveRowsWithOrderAndStatusModified()
            .andExcludeToBeSaved()
            .saveRowsWithStatusAndTextsModified()
            .andExcludeToBeSaved()
            .saveRowsWithOnlyOrderModified()
            .andExcludeToBeSaved()
            .saveRowsWithOnlyTextsModified()
            .andExcludeToBeSaved()
            .saveRowsWithOnlyStatusModified();

        if (payloads.length > 0) {
            const mutationData = payloads.reduce<MutationDataAccumulator>(
                (prev, cur) => {
                    const { task, ...data } = cur;
                    if (task !== UPDATE_ROWS) {
                        resolvers.push(task);
                        return { ...prev, [task]: data };
                    } else if (prev[UPDATE_ROWS]) {
                        const { updateTask, ...payload } = data;
                        (prev[UPDATE_ROWS] as PayloadData[]).push(payload);
                        if (updateTask) {
                            resolvers.push(updateTask);
                        }
                        return { ...prev };
                    } else {
                        const { updateTask, ...payload } = data;
                        if (updateTask) {
                            resolvers.push(updateTask);
                        }
                        return { ...prev, [task]: [payload] };
                    }
                },
                {
                    requestIsProcessing,
                    curMailer,
                    pause,
                    curToken,
                    curApp,
                    quota,
                    entity: parent,
                    mutateRole,
                    resolvers,
                    target,
                }
            );

            mutateTable(mutationData, 'pending');
        }
    };

    const responseReply = typeof response === 'object' && response ? response.reply : undefined;
    useEffect(() => {
        if (responseReply !== undefined) {
            responseHandler({
                response: response as MutateEntityResponse,
                resetStatuses,
                resetOrdinals,
                restoreRows,
                resetTexts,
                purgeRows,
                syncIDs,
            });
            mutateTable(null, 'completed');
        }
    }, [responseReply]);

    return callback;
}
