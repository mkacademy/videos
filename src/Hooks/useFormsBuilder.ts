import { FieldValues, useForm } from "react-hook-form";
import { useRef, useMemo, useState, useEffect } from "react";
import {
    SAVE_CHANGES,
    UNDO_CHANGES,
    getInteractionIDs,
    Tree, globalVars,
    incrementID,
} from "../utils";
import { Row } from "../store/slices/rowSlice";
import { BaseEntityData, DataRow, MockedDataReturn } from "../components/Core/types";
import { UpdateTextsPayload } from "../store/slices/textSlice";
import { FormKeys } from "../utils";
import { imageFileToDataUrl } from "../library/imageCompression";

interface ByteInfo {
    formNo: number;
    bytes: number;
    formatted: string;
}

export interface Entity {
    id: string;
    imageurl?: string | File;
    deleted?: boolean;
    checked?: boolean;
    modified?: boolean;
    index?: number;
}

export interface ParsedEntity extends Entity {
    imageurl?: string;
}

interface TotalBytesError {
    max: string;
    total: string;
}

interface UseFormsBuilderProps {
    IDs?: string[];
    rows: Row[];
    editID?: string;
    entity: string;
    parent: string | undefined;
    appendData: (entity: string, parent: string | undefined, data: DataRow[]) => void;
    updateData: (entities: UpdateTextsPayload[]) => void;
    paddingForm: ArrayLike<number>;
    texts: DataRow[];
}

export const totalBytes: ByteInfo[] = [];

const actions = [UNDO_CHANGES, SAVE_CHANGES];

const isDev = process.env.NODE_ENV === 'development';

const replacer = (key: string, value: unknown): unknown => {
    if (key === "ref") return undefined;
    else return value;
};

const isTrueMatch = (field: string, id: string): boolean => {
    const lastIndex = field.lastIndexOf("-");
    const len = lastIndex + id.length + 1;
    if (lastIndex === -1) return true;
    else if (len > field.length) return true;
    else return false;
};

const parseForm = (data: FieldValues, fields: string[], id: string): FieldValues => {
    return fields
        .filter((field) => field.endsWith(id) && isTrueMatch(field, id))
        .reduce(
            (o, field) => ({
                ...o,
                [field.substring(0, field.length - id.length)]: data[field],
            }),
            {}
        );
};

export const extractSnapshots = async (
    entities: Entity[],
    prevUrls: Array<{ id: string; imageurl?: string }>
): Promise<ParsedEntity[]> => {
    return await Promise.all(
        entities.map(async (entity, index) => {
            const parsedEntity: Partial<ParsedEntity> = {};
            const fields = Object.keys(entity);

            for (let i = 0; i < fields.length; i++) {
                const imagefile = entity[fields[i]].item
                    ? entity[fields[i]].item(0)
                    : entity[fields[i]];

                if (fields[i] === "imageurl" && imagefile) {
                    try {
                        const { dataUrl, preparedFile } = await imageFileToDataUrl(imagefile);
                        parsedEntity[fields[i]] = dataUrl;
                        totalBytes.push({
                            formNo: index + 1,
                            bytes: preparedFile.size,
                            formatted: getFormattedSize(preparedFile.size),
                        });
                    } catch (error) {
                        parsedEntity[fields[i]] = 'data:image';
                        console.log(error);
                    }
                } else if (fields[i] === "imageurl" && prevUrls?.length > 0) {
                    const prevUrl = prevUrls.find(({ id }) => id === entity.id);
                    parsedEntity[fields[i]] = prevUrl?.imageurl;
                }
            }
            return { ...entity, ...parsedEntity } as ParsedEntity;
        })
    );
};

const getFormattedSize = (bytes: number): string => {
    const fSExt = ["Bytes", "KB", "MB", "GB"];
    let i = 0;
    let currentBytes = bytes;

    while (currentBytes > 900) {
        currentBytes /= 1024;
        i++;
    }
    return Math.round(currentBytes * 100) / 100 + " " + fSExt[i];
};

export const isTotalBytesTooLarge = (totalBytes: ByteInfo[]): false | TotalBytesError => {
    const max = 99871849; // less than 100mb
    const total = totalBytes.reduce(
        (totalBytes, obj) => totalBytes + obj.bytes,
        0
    );

    if (total < max) return false;

    const maxIndex = totalBytes.length - 1;
    const formarttedTotal = getFormattedSize(total);
    const prefix = "Total files size exceed the max of ";

    return {
        max: prefix + getFormattedSize(max),
        total:
            totalBytes.length === 1
                ? "(" + totalBytes[0].formNo + ")" + totalBytes[0].formatted
                : totalBytes.reduce(
                    (summation, obj, i) =>
                        `${i < maxIndex ? " + " : ""} (${obj.formNo})${obj.formatted
                        } ${summation}`,
                    " = " + formarttedTotal
                ),
    };
};

const getContents = (rows: Entity[], editID?: string): Entity[] => {
    return rows.length > 0
        ? editID
            ? rows.filter((row) => row.id === editID)
            : rows.filter((row) => !row.deleted && row.checked)
        : [];
};

export default function useFormsBuilder(props: UseFormsBuilderProps) {
    const isMounted = useRef<number>(0);
    const submitCount = useRef<number>(0);
    const { globallyUniqueIDs } = globalVars;
    const { IDs, rows, editID, parent, entity } = props;
    const createdEntities = useMemo<ParsedEntity[]>(() => [], []);
    const modifiedEntities = useMemo<ParsedEntity[]>(() => [], []);
    if (!entity) throw new Error("Entity parameter is required");
    const formKeys: FormKeys = Tree.getProperty(entity, "form") ?? { textInputs: [], textAreas: [], dropDowns: [] };
    const mandatoryField: string = formKeys.textInputs[0].name;
    const [isTooLarge, setisTooLarge] = useState<TotalBytesError | undefined>(undefined);
    const { appendData, updateData, paddingForm, texts } = props;
    const { register, handleSubmit, formState, watch } = useForm();
    const errors = formState.errors || {};
    const stringifyedErrors = JSON.stringify(errors, replacer);
    const selecteds = useMemo(() => getContents(rows, editID), [rows, editID]);

    useEffect(() => {
        return () => {
            console.log("unmounting");
            isMounted.current++;
        };
    }, []);

    useEffect(() => {
        const errors = JSON.parse(stringifyedErrors);
        if (
            Object.keys(errors).length !== 0 &&
            formState.submitCount > submitCount.current
        ) {
            console.log(errors);
            submitCount.current = formState.submitCount;
        }
    }, [stringifyedErrors, formState.submitCount]);

    useEffect(() => {
        return () => {
            if (modifiedEntities.length > 0) updateData(modifiedEntities.map(entity => ({
                ...entity,
                modified: entity.modified ?? false
            })));
            if (createdEntities.length > 0) {
                const createdEntitiesIDed = createdEntities.map(
                    ({ modified, ...createdEntity }) => ({
                        ...createdEntity,
                        id: incrementID().toString(),
                    })
                );
                const { parentID, childID } = getInteractionIDs(parent ?? '', entity);
                const nextOrdinal = Math.max(...texts.map((e) => e.metadata?.ordinal ?? 0)) + 1;
                const metadatas = createdEntitiesIDed.map(({ id }, i) => ({
                    ordinal: nextOrdinal + i,
                    [childID || 'childId']: parseInt(id),
                    [parentID || 'parentId']: IDs ?? [],
                    owner: true,
                }));
                const connections: string[] | undefined = Tree.getProperty(entity, "connections");
                const mockData: MockedDataReturn | undefined = Tree.getProperty(entity, "mockedData")?.(
                    metadatas,
                    connections ?? []
                );
                const unformattedData = mockData?.map((mockedEntity: BaseEntityData, i: number) => ({
                    ...mockedEntity,
                    ...createdEntitiesIDed[i],
                    metadata: {
                        ...mockedEntity.metadata,
                        owner: Boolean(mockedEntity.metadata.owner)
                    }
                }));
                appendData(entity, parent, unformattedData ?? []);
            }
        };
    }, [
        modifiedEntities,
        createdEntities,
        isMounted,
        parent,
        entity,
        IDs,
    ]);

    const onSubmit = async (data: FieldValues): Promise<boolean | void> => {
        totalBytes.length = 0;
        const fields = Object.keys(data);
        const _modifiedEntities = selecteds.map((row) => {
            const parsedForm = parseForm(data, fields, row.id);
            const modified = actions[parseInt(parsedForm.modified)] === SAVE_CHANGES;
            return modified ? { ...parsedForm, modified, id: row.id } : { id: row.id, modified };
        });
        const prevUrls = texts.map(({ id, imageurl }) => ({ id: id as string, imageurl }));
        const modofiedsnapshots = await extractSnapshots(
            _modifiedEntities,
            prevUrls
        );
        if (isDev && isMounted.current > 1 || !isDev && isMounted.current > 0) return;
        modifiedEntities.push(...modofiedsnapshots.map(entity => ({
            ...entity,
            modified: entity.modified ?? false
        })));

        const _createdEntities: Entity[] = Array.from(paddingForm)
            .map((_, i) =>
                parseForm(data, fields, (globallyUniqueIDs - i - 1).toString())
            )
            .filter((data) => data[mandatoryField] !== "") as Entity[];
        const newPrevUrls = _createdEntities.map(({ id }) => ({
            imageurl: 'data:image',
            id,
        }));
        const createdsnapshots = await extractSnapshots(
            _createdEntities,
            newPrevUrls
        );
        if (isDev && isMounted.current > 1 || !isDev && isMounted.current > 0) return;
        createdEntities.push(...createdsnapshots);

        const tooLarge = isTotalBytesTooLarge(totalBytes);
        if (tooLarge) return setisTooLarge(tooLarge);
        return !tooLarge;
    };

    const formHooks = { register, handleSubmit, errors, watch };
    return [selecteds, isTooLarge, onSubmit, formKeys, formHooks, isMounted] as const;
}
