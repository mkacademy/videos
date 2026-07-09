import { DataRow, Metadata } from "../components/Core/types";
import { ActionItem, Status } from "../store/slices/actionSlice";
import { Row } from "../store/slices/rowSlice";

import {
    Tree,
    UPDATE_ROWS,
    DELETE_ROWS,
    INSERT_ROWS,
    ORDINALS,
    STATUSES,
    STATUSESORDINALS,
    STATUSESTEXTS,
    STATUSESTEXTSORDINALS,
    TEXTS,
    TEXTSORDINALS,
} from "../utils";

type TextsFields = string | number | boolean | string[] | Metadata | Record<string, number> | Status;

export interface Payload {
    task: string;
    parentIds?: number[];
    childIds?: number[];
    updateTask?: string;
    ordinals?: number[];
    statuses?: number[];
    sizeInBytes?: number[];
    texts?: TextsFields[];
}

interface BuilderConfig {
    IDs: number[];
    target: string;
    sortedRows: Row[];
    payloads: Payload[];
    sortedTexts: DataRow[];
    sortedStatuses: ActionItem[];
}

interface ModifiedRow {
    id: string;
    order?: number;
    sizeInBytes?: number;
}

export default class Mutations {
    private ObjToArr: (obj: DataRow) => TextsFields[];
    private processedIdsfilter: (t: { id: string }) => boolean;
    private modifieds: ModifiedRow[] | string[] | null;
    private proccesseds: string[];
    private processed: boolean;
    private IDs: number[];
    private target: string;
    private sortedRows: Row[];
    private payloads: Payload[];
    private sortedTexts: DataRow[];
    private sortedStatuses: ActionItem[];

    constructor(build: BuilderConfig) {
        this.IDs = build.IDs;
        this.modifieds = null;
        this.proccesseds = [];
        this.processed = false;
        this.target = build.target;
        this.payloads = build.payloads;
        this.sortedRows = build.sortedRows;
        this.sortedTexts = build.sortedTexts;
        this.processedIdsfilter = () => false;
        this.sortedStatuses = build.sortedStatuses;
        this.ObjToArr = () => [] as TextsFields[];
    }

    static get Builder() {
        class Builder {
            public sortedRows!: Row[];
            public sortedTexts!: DataRow[];
            public sortedStatuses!: ActionItem[];
            public payloads!: Payload[];
            public IDs!: number[];
            public target!: string;

            withRows(rows: Row[]): Builder {
                this.sortedRows = rows.map((row) => ({
                    ...row,
                    id: row.id,
                    order: row.order,
                }));
                return this;
            }

            withTexts(texts: DataRow[]): Builder {
                this.sortedTexts = texts.map((row) => ({
                    ...row,
                    id: row.id,
                }));
                return this;
            }

            withStatuses(statuses: ActionItem[]): Builder {
                this.sortedStatuses = statuses.map((row) => ({
                    ...row,
                    id: row.id,
                }));
                return this;
            }

            withPayloads(payloads: Payload[]): Builder {
                this.payloads = payloads;
                return this;
            }

            withParentIDs(IDs: number[]): Builder {
                this.IDs = IDs;
                return this;
            }

            withTarget(entity: string): Builder {
                this.target = entity;
                return this;
            }

            build(): Mutations {
                return new Mutations(this);
            }
        }
        return Builder;
    }

    andExcludeToBeSaved(): Mutations {
        if (this.processed && this.proccesseds.length === 0) {
            this.proccesseds = (this.modifieds as ModifiedRow[]).map((r) => r.id);
        } else if (this.processed) {
            this.proccesseds = this.proccesseds.concat(this.modifieds as string[]);
        }
        this.processedIdsfilter = (t: { id: string }) =>
            this.proccesseds.findIndex((id) => id === t.id) === -1;
        return this;
    }

    andIncludeUtilities(): Mutations {
        const fields: string[] = Tree.getProperty(this.target, "fields") || [];
        this.ObjToArr = (O: DataRow) =>
            Object.values(fields.reduce((o: Partial<DataRow>, k: string) => ({ ...o, [k]: O[k] }), {}));
        return this;
    }

    saveDeletedRows(purgeRows: (ids: string[]) => void): Mutations {
        const localIds = this.sortedRows
            .filter((row) => row.deleted && parseInt(row.id) < 0)
            .map((deleted) => deleted.id.toString());

        if (localIds.length > 0) purgeRows(localIds);

        const serverIds = this.sortedRows
            .filter((row) => row.deleted && parseInt(row.id) > -1)
            .map((deleted) => parseInt(deleted.id));

        if (serverIds.length > 0) {
            this.payloads.push({
                childIds: serverIds,
                parentIds: this.IDs,
                task: DELETE_ROWS,
            });
        }
        return this;
    }

    saveCreatedRows(): Mutations {
        const idsfilter = (ro: Row) => !ro.deleted && parseInt(ro.id) < 0;
        const createds = this.sortedRows
            .filter(idsfilter)
            .map((IDRow) => ({ id: IDRow.id, order: IDRow.order }));

        const tFilter = (t: DataRow) =>
            createds.findIndex((IDRow) => IDRow.id === t.id.toString()) > -1;

        const sFilter = (s: ActionItem) =>
            createds.findIndex((IDRow) => IDRow.id === s.id.toString()) > -1;

        const CreatedTexts = this.sortedTexts.filter(tFilter).map(this.ObjToArr);

        if (createds.length > 0) {
            this.payloads.push({
                task: INSERT_ROWS,
                parentIds: this.IDs,
                childIds: createds.map((r) => parseInt(r.id)),
                ordinals: createds.map((r) => r.order),
                texts: CreatedTexts.reduce((a, e) => a.concat(e), []),
                statuses: this.sortedStatuses
                    .filter(sFilter)
                    .map((s) => parseInt(s.status.current.toString())),
            });
        }
        return this;
    }

    saveRowsWithAllModified(): Mutations {
        const Idsfilter = (row: Row) =>
            !row.deleted &&
            row.modified &&
            this.sortedTexts[row.index].modified &&
            this.sortedStatuses[row.index].modified;

        this.modifieds = this.sortedRows
            .filter(Idsfilter)
            .map(({ id, order, index }) => ({
                id,
                order,
                sizeInBytes: this.sortedTexts[index].sizeInBytes,
            }));

        const mtFilter = (t: DataRow) =>
            (this.modifieds as ModifiedRow[]).findIndex(({ id }) => id === t.id.toString()) > -1;

        const msFilter = (s: ActionItem) =>
            (this.modifieds as ModifiedRow[]).findIndex(({ id }) => id === s.id.toString()) > -1;

        const M1 =
            this.modifieds && this.modifieds.length > 0
                ? this.sortedTexts.filter(mtFilter).map(this.ObjToArr)
                : [];

        if ((this.processed = this.modifieds !== null && this.modifieds.length > 0 && this.IDs.length <= 1)) {
            this.payloads.push({
                task: UPDATE_ROWS,
                parentIds: this.IDs,
                updateTask: STATUSESTEXTSORDINALS,
                texts: M1.reduce((a, e) => a.concat(e), []),
                childIds: (this.modifieds).map(({ id }) => parseInt(id)),
                ordinals: (this.modifieds).map(({ order }) => order!),
                sizeInBytes: (this.modifieds).map(({ sizeInBytes }) => sizeInBytes!),
                statuses: this.sortedStatuses
                    .filter(msFilter)
                    .map((s) => s.status.current),
            });
        }
        return this;
    }

    saveRowsWithOnlyOrderModified(): Mutations {
        const Idsfilter = (row: Row) => !row.deleted && row.modified;
        this.modifieds = this.sortedRows
            .filter(this.processedIdsfilter)
            .filter(Idsfilter)
            .map(({ id, order }) => ({ id, order }));

        if (this.modifieds && this.modifieds.length > 0 && this.IDs.length <= 1) {
            this.payloads.push({
                task: UPDATE_ROWS,
                parentIds: this.IDs,
                updateTask: ORDINALS,
                childIds: (this.modifieds).map(({ id }) => parseInt(id)),
                ordinals: (this.modifieds).map(({ order }) => order!),
            });
        }
        return this;
    }

    saveRowsWithOnlyTextsModified(): Mutations {
        const Idsfilter = (row: Row) =>
            !row.deleted &&
            this.sortedTexts[row.index].id &&
            parseInt(this.sortedTexts[row.index].id.toString()) > -1 &&
            this.sortedTexts[row.index].modified;

        this.modifieds = this.sortedRows
            .filter(this.processedIdsfilter)
            .filter(Idsfilter)
            .map(({ id, index }) => ({
                id,
                sizeInBytes: this.sortedTexts[index].sizeInBytes,
            }));

        const mtFilter = (t: DataRow) =>
            (this.modifieds as ModifiedRow[]).findIndex(({ id }) => id === t.id.toString()) > -1;

        const M6 =
            this.modifieds && this.modifieds.length > 0
                ? this.sortedTexts.filter(mtFilter).map(this.ObjToArr)
                : [];

        if ((this.processed = this.modifieds !== null && this.modifieds.length > 0)) {
            this.payloads.push({
                task: UPDATE_ROWS,
                updateTask: TEXTS,
                parentIds: this.IDs,
                texts: M6.reduce((a, e) => a.concat(e), []),
                childIds: (this.modifieds).map(({ id }) => parseInt(id)),
                sizeInBytes: (this.modifieds).map(({ sizeInBytes }) => sizeInBytes!),
            });
        }
        return this;
    }

    saveRowsWithOnlyStatusModified(): Mutations {
        const Idsfilter = (row: Row) =>
            !row.deleted && this.sortedStatuses[row.index].modified;

        this.modifieds = this.sortedRows
            .filter(this.processedIdsfilter)
            .filter(Idsfilter)
            .map(({ id }) => id);

        const mtFilter5 = (t: ActionItem) => (this.modifieds as string[]).findIndex((id) => id === t.id.toString()) > -1;

        if ((this.processed = this.modifieds !== null && this.modifieds.length > 0)) {
            this.payloads.push({
                task: UPDATE_ROWS,
                parentIds: this.IDs,
                updateTask: STATUSES,
                childIds: (this.modifieds as string[]).map((id) => parseInt(id)),
                statuses: this.sortedStatuses
                    .filter(mtFilter5)
                    .map((s) => parseInt(s.status.current.toString())),
            });
        }
        return this;
    }

    saveRowsWithOrderAndTextsModified(): Mutations {
        const Idsfilter = (row: Row) =>
            !row.deleted && row.modified && this.sortedTexts[row.index].modified;

        this.modifieds = this.sortedRows
            .filter(this.processedIdsfilter)
            .filter(Idsfilter)
            .map(({ id, order, index }) => ({
                id,
                order,
                sizeInBytes: this.sortedTexts[index].sizeInBytes,
            }));

        const mtFilter = (t: DataRow) =>
            (this.modifieds as ModifiedRow[]).findIndex(({ id }) => id === t.id.toString()) > -1;

        const M2 =
            this.modifieds && this.modifieds.length > 0
                ? this.sortedTexts.filter(mtFilter).map(this.ObjToArr)
                : [];

        if ((this.processed = this.modifieds !== null && this.modifieds.length > 0 && this.IDs.length <= 1)) {
            this.payloads.push({
                task: UPDATE_ROWS,
                parentIds: this.IDs,
                updateTask: TEXTSORDINALS,
                childIds: (this.modifieds).map(({ id }) => parseInt(id)),
                texts: M2.reduce((a, e) => a.concat(e), []),
                ordinals: (this.modifieds).map(({ order }) => order!),
                sizeInBytes: (this.modifieds).map(({ sizeInBytes }) => sizeInBytes!),
            });
        }
        return this;
    }

    saveRowsWithOrderAndStatusModified(): Mutations {
        const Idsfilter = (row: Row) =>
            !row.deleted && row.modified && this.sortedStatuses[row.index].modified;

        this.modifieds = this.sortedRows
            .filter(this.processedIdsfilter)
            .filter(Idsfilter)
            .map((IDRow) => ({ id: IDRow.id, order: IDRow.order }));

        const mtFilter = (t: ActionItem) =>
            (this.modifieds as ModifiedRow[]).findIndex(({ id }) => id === t.id.toString()) > -1;

        if ((this.processed = this.modifieds !== null && this.modifieds.length > 0 && this.IDs.length <= 1)) {
            this.payloads.push({
                task: UPDATE_ROWS,
                parentIds: this.IDs,
                updateTask: STATUSESORDINALS,
                childIds: (this.modifieds).map(({ id }) => parseInt(id)),
                ordinals: (this.modifieds).map(({ order }) => order!),
                statuses: this.sortedStatuses
                    .filter(mtFilter)
                    .map((s) => s.status.current),
            });
        }
        return this;
    }

    saveRowsWithStatusAndTextsModified(): Mutations {
        const Idsfilter = (row: Row) =>
            !row.deleted &&
            this.sortedTexts[row.index].modified &&
            this.sortedStatuses[row.index].modified;

        this.modifieds = this.sortedRows
            .filter(this.processedIdsfilter)
            .filter(Idsfilter)
            .map(({ id, index }) => ({
                id,
                sizeInBytes: this.sortedTexts[index].sizeInBytes,
            }));

        const mtFilter = (t: DataRow) =>
            (this.modifieds as ModifiedRow[]).findIndex(({ id }) => id === t.id.toString()) > -1;

        const msFilter = (s: ActionItem) =>
            (this.modifieds as ModifiedRow[]).findIndex(({ id }) => id === s.id.toString()) > -1;

        const M4 =
            this.modifieds && this.modifieds.length > 0
                ? this.sortedTexts.filter(mtFilter).map(this.ObjToArr)
                : [];

        if ((this.processed = this.modifieds !== null && this.modifieds.length > 0)) {
            this.payloads.push({
                task: UPDATE_ROWS,
                parentIds: this.IDs,
                updateTask: STATUSESTEXTS,
                texts: M4.reduce((a, e) => a.concat(e), []),
                childIds: (this.modifieds).map(({ id }) => parseInt(id)),
                statuses: this.sortedStatuses
                    .filter(msFilter)
                    .map((s) => s.status.current),
                sizeInBytes: (this.modifieds).map(({ sizeInBytes }) => sizeInBytes!),
            });
        }
        return this;
    }
}
