import { Dispatch } from 'redux';
import { RootState } from '../store/index';
import { fetchedHandles, Handler } from '../store/slices/errorSlice';
import { globalVars, getInteractionIDs, getPlural, Tree, capitalizeFirstLetter } from '../utils';
import { DataRow } from '../components/Core/types';
import { Quiz } from '../store/slices/quizSlice';
import { Banner } from '../store/slices/tutorialSlice';
import { Banner as CourseBanner } from '../store/slices/courseSlice';
export type ConnectedWebapp = 'quiz' | 'tutorial' | 'course';

interface CreateValidTextsParams {
  to: string;
  from: string;
  state: RootState;
  childIds?: number;
  dispatch?: Dispatch;
  webapp: ConnectedWebapp;
}

const noDuplicates = (r: { id: number }, i: number, self: Array<{ id: number }>) =>
  i === self.findIndex(({ id }) => id === r.id);

const idPred = ({ id }: { id: number }) => id;
const handlePred = ({ id, title: keyword }: { id: number; title: string }): Handler => ({ id, keyword });
const handleRoot = (title: string) => ({ id, ...rest }: DataRow): Handler => ({ id: Number(id), keyword: rest[title] });

export default function createValidTexts({
  to,
  from,
  state,
  webapp,
  childIds,
  dispatch,
}: CreateValidTextsParams): DataRow[] {
  const validTexts: DataRow[] = [];
  const handlesObj: Record<string, Handler[]>[] = [];
  const appRoute = from + to;
  const { globallyUniqueIDs } = globalVars;
  const { addCount } = state.session;
  const mockedData = Tree.getProperty(to, "mockedData");
  const connections = Tree.getProperty(to, "connections");
  const formatter = Tree.getProperty(to, "nonFormattedData");
  const { parentID, childID } = getInteractionIDs(from, to);
  const predicate = ({ isHighlighted }: { isHighlighted: boolean }) => isHighlighted;

  const createValidTexts = (IDs?: number[], maxOrdinals?: number[], handlers?: Record<string, Handler[]>) => {
    const nextOrdinal = 1 + (maxOrdinals?.reduce((max, maxOrdinal) => Math.max(max, maxOrdinal), -1) ?? -1);
    const metadatas = Array.from({ length: childIds ?? addCount }).map(
      (_, i) => ({
        [childID as string]: globallyUniqueIDs - i,
        [parentID as string]: IDs ?? [],
        ordinal: nextOrdinal + i,
        owner: true,
      })
    );
    const mockedResults = mockedData?.(metadatas, connections as string[]) ?? [];
    validTexts.push(...mockedResults as DataRow[]);
    if (handlers) handlesObj.push(handlers);
    else {
      const root = childID?.replace("Id", "") ?? "";
      const handle = capitalizeFirstLetter(getPlural(root));
      const object: Record<string, Handler[]> = { ['handles' + handle]: validTexts.map(handleRoot(root)) }
      handlesObj.push(object);
    }
  };

  const createCourseLikeRouteValidTexts = (
    route: string,
    banners: RootState['course']['banners'] | RootState['quiz']['banners'],
    content: RootState['course']['content'] | RootState['quiz']['content']
  ): boolean => {
    if (route === "siftersinstructions" || route === "siftersfilters") {
      const IDs = banners.filter(predicate).map(idPred);
      const handlesSifters = banners.filter(predicate).map(handlePred);
      if (route === "siftersinstructions") {
        const indeces = IDs.map((id) =>
          content.findIndex(({ slides, ...thumbs }) =>
            Object.values(thumbs).some((thumb) => thumb.bannerId === id)
          )
        );
        const maxOrdinals = indeces.filter((index) => index !== -1).map((index) => {
          const { slides, ...thumbs } = content[index];
          return Object.values(thumbs).reduce((max, thumb) => Math.max(max, thumb.ordinal), -1);
        });
        createValidTexts(IDs, maxOrdinals, { handlesSifters });
      } else {
        const indeces = IDs.map((id) => banners.findIndex((banner) => banner.id === id));
        const maxOrdinals = indeces
          .filter((index) => index !== -1)
          .map((index) =>
            banners[index].pennants.reduce((max, pennant) => Math.max(max, pennant.ordinal), -1)
          );
        createValidTexts(IDs, maxOrdinals, { handlesSifters });
      }
      return true;
    }
    if (route === "filtersinstructions") {
      const selectedPennants = banners
        .map(({ pennants }) => pennants)
        .flat()
        .filter(predicate)
        .filter(noDuplicates);
      const highlightedSlideGroupItems = content
        .flatMap((slideGroup) =>
          Object.entries(slideGroup)
            .filter(([key, item]) => {
              if (key === "slides") return false;
              if (!item || typeof item !== "object") return false;
              return "isHighlighted" in item && "bannerId" in item && "ordinal" in item && item.isHighlighted;
            })
            .map(([, item]) => item)
        )
        .filter((item): item is { id: number; bannerId: number; ordinal: number } =>
          !!item && typeof item === "object" && "id" in item && "bannerId" in item && "ordinal" in item
        )
        .filter(noDuplicates);
      const selected = selectedPennants.length > 0
        ? selectedPennants
        : highlightedSlideGroupItems
          .flatMap((slideGroupItem) => {
            const sameBanner = banners.find((banner) => banner.id === slideGroupItem.bannerId);
            if (!sameBanner) return [];
            return sameBanner.pennants.filter((pennant) => pennant.ordinal === slideGroupItem.ordinal);
          })
          .filter(noDuplicates);
      const handlesFilters = selected.map(handlePred);
      const indeces = selected.map((pennant) => {
        const index = content.findIndex((slideGroup) => slideGroup?.slides.some((slide) => slide[0]?.bannerId === pennant.id));
        if (index === -1) return undefined;
        const slideIndex = content[index]?.slides.findIndex((slide) => slide[0]?.bannerId === pennant.id);
        return slideIndex !== undefined && slideIndex !== -1 ? [index, slideIndex] : undefined;
      }).filter((indices): indices is [number, number] => indices !== undefined);
      const maxOrdinals = indeces.map(([groupIndex, slideIndex]) => content[groupIndex]?.slides[slideIndex]?.reduce((max, slide) => Math.max(max, slide.ordinal), -1) ?? -1);
      createValidTexts(selected.map(idPred), maxOrdinals, { handlesFilters });
      return true;
    }
    return false;
  };

  switch (webapp) {
    case "tutorial": {
      if (appRoute === "foundationfilters") {
        const { banners } = state.tutorial;
        const redPred = (max: number, banner: Banner) => Math.max(max, banner.ordinal)
        const maxOrdinals = banners.reduce(redPred, 0);
        createValidTexts([], [maxOrdinals]);
      }
      else if (appRoute === "filtersinstructions") {
        const { banners, content } = state.tutorial;
        const IDs = banners.filter(predicate).map(idPred);
        const handlesFilters = banners.filter(predicate).map(handlePred);
        const indeces = IDs.map((id) => content.findIndex((slides) => slides.some((slide) => slide.bannerId === id)));
        const maxOrdinals = indeces.filter((index) => index !== -1).map((index) => content[index].reduce((max, slide) => Math.max(max, slide.ordinal), -1));
        createValidTexts(IDs, maxOrdinals, { handlesFilters });
      }
      break;
    }
    case "course": {
      if (appRoute === "foundationsifters") {
        const { banners } = state.course;
        const redPred = (max: number, banner: CourseBanner) => Math.max(max, banner.ordinal)
        const maxOrdinals = banners.reduce(redPred, -1);
        createValidTexts([], [maxOrdinals]);
      }
      else {
        const { banners, content } = state.course;
        createCourseLikeRouteValidTexts(appRoute, banners, content);
      }
      break;
    }
    case "quiz": {
      if (appRoute === "foundationdashboards") {
        const { quizzes } = state.quiz;
        const redPred = (max: number, quiz: Quiz) => Math.max(max, quiz.ordinal)
        const maxOrdinals = quizzes.reduce(redPred, -1);
        createValidTexts([], [maxOrdinals]);
      }
      else if (appRoute === "dashboardssifters") {
        const { quizzes, banners } = state.quiz;
        const handlesSifters = quizzes.filter(predicate).map(handlePred);
        const IDs = quizzes.filter(predicate).map(idPred);
        const groupedBanners = quizzes.map((quiz) => banners.filter((banner) => banner.id === quiz.bannerId));
        const maxOrdinals = groupedBanners.map((group) => group.reduce((max, banner) => Math.max(max, banner.ordinal), -1));
        createValidTexts(IDs, maxOrdinals, { handlesSifters });
      } else if (appRoute === "dashboardsfilters") {
        const { quizzes, banners } = state.quiz;
        const handlesFilters = quizzes.filter(predicate).map(handlePred);
        const IDs = quizzes.filter(predicate).map(idPred);
        const groupedBanners = quizzes.map((quiz) => banners.filter((banner) => banner.id === quiz.bannerId));
        const maxOrdinals = groupedBanners.map((group) => group.reduce((max, banner) => Math.max(max, banner.ordinal), -1));
        createValidTexts(IDs, maxOrdinals, { handlesFilters });
      } else {
        const { banners, content } = state.quiz;
        createCourseLikeRouteValidTexts(appRoute, banners, content);
      }
      break;
    }
    default:
      break;
  }
  if (dispatch && handlesObj.length > 0)
    dispatch(fetchedHandles(handlesObj.pop()!));

  return formatter?.(validTexts)?.map(({ checked = false, frozen, id, ...theRest }: { checked?: boolean; frozen?: boolean; id?: string | number; }) => ({
    id: typeof id === 'number' ? id : Number(id) || 0,
    isHighlighted: checked,
    isDismissed: false,
    descendentsSums: {},
    sizeInBytes: 0,
    status: 0,
    ...theRest,
  })) ?? [];
}
