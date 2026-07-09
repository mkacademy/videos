import { useEffect } from "react";
import {
    SUCCESS,
    ADD_ROWS,
    UPDATE_ROWS,
    REMOVE_ROWS,
    STATUSES
} from "../utils";
import { MutateEntityResponse } from "../library/types";
import { MutationDataAccumulator, PayloadData } from "./useSaveMutations";
import { Payload } from "../library/TableMutations";
import { InteractionOption } from "../store/slices/interactionSlice";

interface Immutables {
    persistInteractions: () => void;
    purgeInteractions: (statuses: string[]) => void;
    setResponses: (updater: (prev: number) => number) => void;
    mutateTable: (data: MutationDataAccumulator | null, status?: string) => void;
    response: MutateEntityResponse | string | undefined;
    feedback: MutateEntityResponse | string | undefined;
    quota: number | undefined;
    fetchRole: string | null;
    curToken: string | null;
    parentIds: number[];
    curMailer: number;
    parentID: string;
    curApp: number;
    parent: string;
    target: string;
}

interface UseSaveInteractionsProps {
    changes: InteractionOption[];
    childID: string;
    immutables: Immutables;
}

export default function useSaveInteractions({
    changes,
    childID,
    immutables: {
        persistInteractions,
        purgeInteractions,
        setResponses,
        mutateTable,
        curMailer,
        parentIds,
        fetchRole,
        parentID,
        response,
        curToken,
        feedback,
        curApp,
        parent,
        target,
        quota,
    },
}: UseSaveInteractionsProps): () => void {
    useEffect(() => setResponses((prev: number) => prev + 1), [response, setResponses]);

    const callback = (): void => {
        const zero = 0;
        const payloads: Payload[] = [];
        const resolvers: string[] = [];
        const entity = parent;
        const removeds: string[] = changes
            .filter((o: InteractionOption) => o[parentID] === null && o.owner === false)
            .map((removed: InteractionOption) => removed[childID]);

        if (removeds.length > zero)
            payloads.push({
                task: REMOVE_ROWS,
                parentIds: parentIds,
                childIds: removeds.map(id => parseInt(id)),
            });

        const deleteds: string[] = changes
            .filter((o: InteractionOption) => o[parentID] === null && o.owner === true)
            .map((deleted: InteractionOption) => deleted[childID]);

        if (deleteds.length > zero)
            payloads.push({
                parentIds: parentIds,
                task: UPDATE_ROWS,
                childIds: deleteds.map(id => parseInt(id)),
                updateTask: STATUSES,
                statuses: deleteds.map(() => zero),
            });

        const createds: string[] = changes
            .filter((o: InteractionOption) => o[parentID] !== null)
            .map((created: InteractionOption) => created[childID]);

        if (createds.length > zero)
            payloads.push({
                parentIds: parentIds,
                task: ADD_ROWS,
                childIds: createds.map(id => parseInt(id)),
            });

        if (payloads.length > zero) {
            mutateTable(
                payloads.reduce<MutationDataAccumulator>(
                    (prev, cur) => {
                        const { task, ...data } = cur;
                        if (task !== UPDATE_ROWS) {
                            resolvers.push(task);
                            return { ...prev, [task]: data };
                        } else if (prev[UPDATE_ROWS]) {
                            const { updateTask, ...payload } = data;
                            (prev[UPDATE_ROWS] as PayloadData[]).push(payload);
                            if (updateTask) resolvers.push(updateTask);
                            return { ...prev };
                        } else {
                            const { updateTask, ...payload } = data;
                            if (updateTask) resolvers.push(updateTask);
                            return { ...prev, [task]: [payload] };
                        }
                    },
                    {
                        quota,
                        curApp,
                        target,
                        entity,
                        curToken,
                        resolvers,
                        curMailer,
                        mutateRole: fetchRole || undefined,
                    }
                ),
                'pending'
            );
        }
    };

    const responseReply = typeof response === 'object' && response ? response.reply : response;
    useEffect(() => {
        if (responseReply !== undefined) {
            const reply: string = responseReply;
            mutateTable(null, 'completed');
            console.log("response -> " + responseReply);
            if (reply.startsWith(SUCCESS)) persistInteractions();
        }
    }, [responseReply]);

    const feedbackTask = typeof feedback === 'object' && feedback ? feedback.task : feedback;
    useEffect(() => {
        if (feedbackTask !== undefined) {
            console.log("response -> ", feedbackTask);
            const zero = 0;
            const reply: string = feedbackTask;
            const firstComma: number = reply.indexOf(",");
            const result: string = reply.substring(zero, firstComma);
            const data: string = reply.substring(firstComma + 2, reply.length - 1);

            if (feedbackTask === UPDATE_ROWS)
                if (result === SUCCESS) {
                    const lastComma: number = data.lastIndexOf("],");
                    const IDs: string[] = data.substring(zero, lastComma).split("],[");
                    const updatedStatuses: string[] | undefined = IDs[1]?.replace(/, /g, ",").split(",");
                    if (updatedStatuses?.length) purgeInteractions(updatedStatuses);
                } else console.log(result, feedbackTask, data);
            mutateTable(null, 'completed');
        }
    }, [feedbackTask]);

    return callback;
}
