import { Tree, entityNamesOrderedBySelectedRoutes } from "../utils";
import { BaseEntity, MenuItem } from "../components/Core/types";
import * as descendantsWrapper from "../styles/descendantsWrapper.module.css";

interface SettingsWaitProps {
    selectedRoutes: string[];
    baseApply?: (e: React.MouseEvent | boolean) => void;
}

interface Entity extends BaseEntity {
    name: string;
    menu: MenuItem[];
    private: Array<Record<string, string>>;
    columns: Array<Record<string, string>>;
    ordinals: Record<string, string[]>;
    repeated: Array<Record<string, string>> | null;
    overflow: Array<Record<string, string>> | null;
    lowermenu?: MenuItem[];
    highermenu?: MenuItem[];
    connections: string[];
    descendents: null;
    unlocked: string[];
}

// Interface for the intermediate mapped entities
interface MappedEntity {
    name: string;
    menu: MenuItem[];
    private: Array<Record<string, string>>;
    columns: Array<Record<string, string>>;
    ordinals: Record<string, string[]>;
    repeated: Array<Record<string, string>> | null;
    overflow: Array<Record<string, string>> | null;
    lowermenu?: MenuItem[];
    highermenu?: MenuItem[];
    connections: string[];
    descendents: null;
    unlocked: string[];
}

export default function useSettingsWait({ selectedRoutes, baseApply }: SettingsWaitProps) {
    return () => {
        const mappedEntities = Tree.entities
            .filter((entity: BaseEntity) =>
                selectedRoutes.find(
                    (route: string) =>
                        route.startsWith(entity.name) ||
                        route.startsWith("lower" + entity.name) ||
                        route.startsWith("higher" + entity.name)
                )
            )
            .map((entity: BaseEntity) => {
                const {
                    name,
                    menu,
                    columns,
                    ordinals,
                    repeated,
                    overflow,
                    lowermenu,
                    highermenu,
                    connections,
                    descendents,
                    private: priv } = entity as Entity;
                return {
                    name,
                    menu,
                    private: priv,
                    columns,
                    ordinals,
                    repeated,
                    overflow,
                    lowermenu,
                    highermenu,
                    connections,
                    descendents,
                    unlocked: connections.filter(
                        (con: string) => selectedRoutes.indexOf(name + con) > -1
                    ),
                };
            }) as MappedEntity[];

        const allowedNames = new Set(mappedEntities.map((e) => e.name));
        const routeOrder = entityNamesOrderedBySelectedRoutes(Tree.entities, selectedRoutes, allowedNames);
        const byName = new Map(mappedEntities.map((e) => [e.name, e]));
        const entities: MappedEntity[] = routeOrder
            .map((name) => byName.get(name))
            .filter((e): e is MappedEntity => e !== undefined);

        const newEntities = entities.map((entity) => {
            const ordinals: Record<string, string[]> = {};
            const newOverflow: Array<Record<string, string>> = [];
            const newRepeated: Array<Record<string, string>> = [];
            const newColumns: Array<Record<string, string>> = [];
            const {
                menu,
                private: priv,
                columns,
                unlocked,
                repeated,
                overflow,
                lowermenu,
                highermenu,
                connections,
                descendents,
            } = entity;

            const predicate0 = (r: string) => r !== descendents;
            const locked = connections.filter((con: string) => unlocked.indexOf(con) === -1);
            const reorderedConnections = unlocked.concat(locked).filter(predicate0);
            for (let index = 0; index < reorderedConnections.length; index += 2) {
                const child = reorderedConnections[index + 1];
                const parent = reorderedConnections[index];
                ordinals[parent + child] = [parent, child];
            }
            const keys = Object.keys(ordinals);
            for (let index = 0; index < keys.length; index++) {
                if (index < columns.length) {
                    const CSS = Object.values(columns[index])[0];
                    newColumns.push({ [keys[index]]: CSS });
                } else {
                    if (repeated) {
                        const CSS = Object.values(repeated[0])[0];
                        newRepeated.push({ [keys[index]]: CSS });
                    }
                    if (overflow) {
                        const CSS = Object.values(overflow[0])[0];
                        newOverflow.push({ [keys[index]]: CSS });
                    }
                }
            }
            const reorderMenu = (menu: MenuItem[]) => {
                const predicate1 = (m: MenuItem) => selectedRoutes.indexOf(m.from + m.to) === -1;
                const predicate2 = (m: MenuItem) => selectedRoutes.indexOf(m.from + m.to) > -1;
                const lockedMenu = menu.filter(predicate1);
                const unlockedMenu = menu.filter(predicate2);
                return unlockedMenu.concat(lockedMenu);
            };
            const menus =
                lowermenu !== undefined && highermenu !== undefined
                    ? {
                        highermenu: reorderMenu(highermenu),
                        lowermenu: reorderMenu(lowermenu),
                        menu: reorderMenu(menu),
                    }
                    : { menu: reorderMenu(menu) };
            const predicate3 = (obj: Record<string, string>) => Object.values(obj)[0] === descendantsWrapper["SnapshotsNotes"];
            const lastColumn = newColumns[newColumns.length - 1];
            const override = priv?.find(predicate3);
            const predicate4 = (obj: Record<string, string>) =>
                Object.keys(obj)[0] === Object.keys(override || {})[0] && lastColumn
                    ? { [Object.keys(lastColumn)[0]]: descendantsWrapper["SnapshotsNotes"] }
                    : obj;

            const result = {
                ...entity,
                ...menus,
                ordinals,
                columns: newColumns,
                private: override ? priv.map(predicate4) : priv,
                repeated: newRepeated.length > 0 ? newRepeated : null,
                overflow: newOverflow.length > 0 ? newOverflow : null,
            };
            return result as unknown as BaseEntity;
        });
        Tree.setEntities(newEntities);
        if (baseApply) baseApply(false);
    };
}