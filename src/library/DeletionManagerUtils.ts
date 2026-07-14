
export interface AddedItem {
  id: number;
  bannerIds: number[];
}
export const SAVE_ENTITY_TITLE_MAX_LENGTH = 50;

export const truncateSaveEntityTitle = (title: string): string =>
  title.length <= SAVE_ENTITY_TITLE_MAX_LENGTH
    ? title
    : title.slice(0, SAVE_ENTITY_TITLE_MAX_LENGTH);

export const withTruncatedSaveTitle = <T extends { title: string }>(entity: T): T => {
  const title = truncateSaveEntityTitle(entity.title);
  return title === entity.title ? entity : { ...entity, title };
};

export const withTruncatedSaveTitles = <T extends { title: string }>(entities: T[]): T[] =>
  entities.map(withTruncatedSaveTitle);
