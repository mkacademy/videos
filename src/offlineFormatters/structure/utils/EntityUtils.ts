import { Tree } from "../../../utils";
/**
 * Same key set as entity `connections` → `descendentsSums` keys.
 */
export function emptyDescendentsSumsForEntity(
  entityPluralName: string | null | undefined,
): Record<string, number> {
  if (entityPluralName == null) {
    return {};
  }
  const connections = Tree.getProperty(entityPluralName, "connections") ?? [];
  return Object.fromEntries(connections.map((key) => [key, 0]));
}
