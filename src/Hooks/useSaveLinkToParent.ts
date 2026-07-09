import { useParams } from "react-router-dom";
import { useCallback, useEffect, useRef } from "react";
import { SUCCESS, REMOVE_ROWS, ADD_ROWS } from "../utils";
import { ParentData } from "../store/slices/viewSlice";
import { Row } from "../store/slices/rowSlice";
import { MutateEntityResponse } from "../library/types";
import { MutationDataAccumulator } from "./useSaveMutations";
import { useSelector } from "react-redux";
import { RootState } from "../store";
import { getName } from "../components/convolayouts/GreekProbin/Screen";

export interface UpdateSelectedParams {
    evaluators: { parentIdsCount: number, operation: string };
    checkedIds?: string[];
    delayTime: number;
    operation: string;
    parentId: number;
    parent: string;
}

interface UseSaveLinkToParentParams {
    rows: Row[];
    quota: number;
    indeces: number[];
    operation: string;
    mutateRole: string;
    parentData: ParentData;
    response: MutateEntityResponse | string | undefined;
    freezeSelected: (parentId: string) => void;
    updateSelected: (params: UpdateSelectedParams) => void;
    mutateTable: (payload: MutationDataAccumulator) => void;
    upadteFoundation: (params: { operation: string }) => void;
    curToken?: string | null;
    curMailer?: number;
    curApp?: number;
}

interface UseSaveLinkToParentReturn {
    target: string | undefined;
    callback: (e: Event) => void;
    response: MutateEntityResponse | string | undefined;
    parentEntity: string;
    operation: string;
    parents: string[];
}

export default function useSaveLinkToParent({
    rows,
    quota,
    indeces,
    response,
    operation,
    mutateRole,
    mutateTable,
    updateSelected,
    freezeSelected,
    upadteFoundation,
    parentData: { parent, IDs },
    curMailer,
    curToken,
    curApp
}: UseSaveLinkToParentParams): UseSaveLinkToParentReturn {
    // console.log(indeces);
    const parentIds = useRef<number[]>([]);
    const { target } = useParams<{ target: string }>();
    const handles = useSelector((state: RootState) => state.error.handles);
    const evaluator = useCallback((): ((row: Row) => boolean) => {
        return operation === REMOVE_ROWS && parentIds.current.length > 0
            ? (row: Row) => row.checked && row.frozen
            : (row: Row) => row.checked && !row.frozen;
    }, [operation]);

    const callback = (e: Event): void => {
        const selecteds = rows.filter(evaluator());
        const ids = selecteds.map(({ id }) => parseInt(id));
        const payload = {
            quota,
            target,
            mutateRole,
            curMailer,
            curToken,
            curApp,
            entity: parent,
            resolvers: [operation],
            [operation]: {
                childIds: ids,
                parentIds: parentIds.current,
            },
        };
        if (ids.length > 0) mutateTable(payload);
        e.preventDefault();
    };

    const responseReply = typeof response === 'object' && response ? response.reply : response;
    useEffect(() => {
        if (responseReply?.startsWith?.(SUCCESS)) {
            if (parentIds.current.length > 0)
                for (let index = 0; index < parentIds.current.length; index++) {
                    const parentId = parentIds.current[index];
                    const delayTime = 100 + 100 * index;
                    setTimeout(() => {
                        console.log("updating was delayed by - ", delayTime);
                        updateSelected({
                            evaluators: { parentIdsCount: parentIds.current.length, operation },
                            delayTime: delayTime + 100 * parentIds.current.length,
                            operation,
                            parentId,
                            parent: parent || "",
                        });
                    }, delayTime);
                }
            else if (parent?.toLowerCase() === "foundation")
                setTimeout(() => upadteFoundation({ operation }));
            if (operation === ADD_ROWS)
                for (let index = 0; index < parentIds.current.length; index++) {
                    const delayTime = 100 + 100 * index + 100 * parentIds.current.length;
                    setTimeout(() => {
                        console.log("matching was delayed by - ", delayTime);
                        freezeSelected(parentIds.current[index].toString());
                    }, delayTime);
                }
        } else if (responseReply)
            console.log(responseReply);
    }, [
        responseReply,
        operation,
        parent,
    ]);

    useEffect(() => {
        parentIds.current = indeces.map((index) => parseInt(IDs[index]));
    }, [indeces, IDs]);

    return {
        target,
        callback,
        response,
        operation,
        parentEntity: parent || "",
        parents: indeces.map((index) => getName(handles, parent, parseInt(IDs[index])) || "-unknown-"),
    };
}
