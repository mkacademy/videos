
import { SlideGroup, SlideGroupItem } from '../store/slices/courseSlice';
import type { Banner as TutorialBanner, Content as TutorialContent } from './TutorialUtils';
import { Quiz } from '../store/slices/quizSlice';
import { Banner as CourseBanner } from '../store/slices/courseSlice';


export interface IsDehydratedItem {
  metadata?: { owner?: boolean };
  sizeInBytes: number;
  modified?: boolean;
  edited?: boolean;
  owner?: boolean;
  title: string;
  id: number;
}
export const  isDehydrated = (item: IsDehydratedItem) =>
  (item.metadata?.owner === undefined || item.metadata.owner === false) &&
  (item.modified === undefined || item.modified === false) &&
  (item.edited === undefined || item.edited === false) &&
  (item.owner === undefined || item.owner === false) &&
  item.sizeInBytes === 0 &&
  item.title === '.' &&
  item.id > 0;

/**
 * For {@link getTutorialTrees} / {@link getCourseTrees} / {@link getQuizTrees}.
 * Default `dehydratedOnly` (undefined or true): only {@link IsDehydrated} skeleton rows — matches zip/unpack.
 * `false`: include all entities (live Redux while viewing tutorials/courses/quizzes).
 */
export type TreeEntityFilterOptions = {
  dehydratedOnly?: boolean;
};

function treeEntityPredicate(
  options?: TreeEntityFilterOptions,
): (item: IsDehydratedItem) => boolean {
  if (options?.dehydratedOnly === false) {
    return () => true;
  }
  return (item) => isDehydrated(item);
}

export type TutorialTrees = Record<number, number[]> & { _orphans?: number[] };

export const getTutorialTrees = (
  { banners, content }: {
    banners: TutorialBanner[];
    content: TutorialContent[][];
  },
  options?: TreeEntityFilterOptions,
): TutorialTrees => {
  const keep = treeEntityPredicate(options);
  const filteredBanners = banners.filter(keep);
  const filteredContent = content
    .flat()
    .filter(keep);

  // Group content by bannerId
  const contentByBannerId = filteredContent.reduce((acc, content) => {
    if (!acc[content.bannerId]) {
      acc[content.bannerId] = [];
    }
    acc[content.bannerId].push(content.id);
    return acc;
  }, {} as Record<number, number[]>);

  // Build nested structure: banners with children as objects, without children as array
  const bannersWithChildren: Record<number, number[]> = {};
  const bannersWithoutChildren: number[] = [];

  filteredBanners.forEach((banner) => {
    if (contentByBannerId[banner.id] && contentByBannerId[banner.id].length > 0) {
      bannersWithChildren[banner.id] = contentByBannerId[banner.id];
    } else {
      bannersWithoutChildren.push(banner.id);
    }
  });

  const tutorialIds = {
    ...bannersWithChildren,
    ...(bannersWithoutChildren.length > 0 ? { _orphans: bannersWithoutChildren } : {}),
  };
  return tutorialIds;
};

export type CourseTrees = Record<number, (Record<number, number[]> & { slideGroupItems?: number[] }) |
{ slideGroupItems: number[] }> & { _orphans?: number[] };

export const getCourseTrees = (
  { banners, content }: {
    banners: CourseBanner[];
    content: SlideGroup[];
  },
  options?: TreeEntityFilterOptions,
): CourseTrees => {
  const keep = treeEntityPredicate(options);
  const filteredBanners = banners.filter(keep);
  const filteredPennants = banners
    .flatMap((banner) => banner.pennants)
    .filter(keep);
  const filteredSlidegroupItems = content
    .flatMap((group) => Object.values(group).filter((item): item is SlideGroupItem =>
      typeof item === 'object' && item !== null && 'id' in item && 'title' in item && !Array.isArray(item)
    ))
    .filter(keep);
  const filteredSlides = content
    .flatMap((group) => group.slides)
    .flat()
    .filter(keep);

  // Group slides by pennant ID (slides.bannerId === pennant.id)
  const slidesByPennantId = filteredSlides.reduce((acc, slide) => {
    if (!acc[slide.bannerId]) {
      acc[slide.bannerId] = [];
    }
    acc[slide.bannerId].push(slide.id);
    return acc;
  }, {} as Record<number, number[]>);

  // Group slideGroupItems by banner ID (slideGroupItem.bannerId === banner.id)
  const slideGroupItemsByBannerId = filteredSlidegroupItems.reduce((acc, item) => {
    if (!acc[item.bannerId]) {
      acc[item.bannerId] = [];
    }
    acc[item.bannerId].push(item.id);
    return acc;
  }, {} as Record<number, number[]>);

  // Group pennants by banner ID (pennant.bannerId === banner.id)
  // Each pennant contains its slides (slides.bannerId === pennant.id)
  const pennantsByBannerId = filteredPennants.reduce((acc, pennant) => {
    if (!acc[pennant.bannerId]) {
      acc[pennant.bannerId] = {};
    }
    const parent = acc[pennant.bannerId];
    if (slidesByPennantId[pennant.id] && slidesByPennantId[pennant.id].length > 0) {
      parent[pennant.id] = slidesByPennantId[pennant.id];
    } else {
      if (!parent._orphans) {
        parent._orphans = [];
      }
      parent._orphans.push(pennant.id);
    }
    return acc;
  }, {} as Record<number, Record<number, number[]> & { _orphans?: number[] }>);

  // Build final structure: banners with children as objects, without children as array
  // Banners contain both pennants (with their slides) and slideGroupItems
  const bannersWithChildren: Record<number, (Record<number, number[]> & { slideGroupItems?: number[] }) | { slideGroupItems: number[] }> = {};
  const bannersWithoutChildren: number[] = [];

  filteredBanners.forEach((banner) => {
    const hasPennants = pennantsByBannerId[banner.id] && Object.keys(pennantsByBannerId[banner.id]).length > 0;
    const hasSlideGroupItems = slideGroupItemsByBannerId[banner.id] && slideGroupItemsByBannerId[banner.id].length > 0;

    if (hasPennants || hasSlideGroupItems) {
      if (hasPennants) {
        bannersWithChildren[banner.id] = { ...pennantsByBannerId[banner.id] };
        if (hasSlideGroupItems) {
          bannersWithChildren[banner.id].slideGroupItems = slideGroupItemsByBannerId[banner.id];
        }
      } else {
        // Only slideGroupItems, no pennants
        bannersWithChildren[banner.id] = { slideGroupItems: slideGroupItemsByBannerId[banner.id] };
      }
    } else {
      bannersWithoutChildren.push(banner.id);
    }
  });

  const courseIds = {
    ...bannersWithChildren,
    ...(bannersWithoutChildren.length > 0 ? { _orphans: bannersWithoutChildren } : {}),
  };
  return courseIds;
};



export type QuizTrees = Record<number, {
  banners?: CourseTrees;
  submissions?: number[];
}> & { _orphans?: number[] };

export const getQuizTrees = (
  { quizzes, banners, content }: {
    quizzes: Quiz[];
    banners: CourseBanner[];
    content: SlideGroup[];
  },
  options?: TreeEntityFilterOptions,
): QuizTrees => {
  const keep = treeEntityPredicate(options);
  const filteredQuizzes = quizzes.filter(keep);
  const filteredBanners = banners.filter(keep);
  const filteredPennants = banners
    .flatMap((banner) => banner.pennants)
    .filter(keep);
  const filteredSlidegroupItems = content
    .flatMap((group) => Object.values(group).filter((item): item is SlideGroupItem =>
      typeof item === 'object' && item !== null && 'id' in item && 'title' in item && !Array.isArray(item)
    ))
    .filter(keep);
  const filteredSlideItems = content
    .flatMap((group) => group.slides)
    .flat()
    .filter(keep);
  const filteredSubmissions = quizzes
    .flatMap((quiz) => quiz.pennants)
    .filter(keep);

  // Group slideItems by pennant ID (slideItems.bannerId === pennant.id)
  const slideItemsByPennantId = filteredSlideItems.reduce((acc, slide) => {
    if (!acc[slide.bannerId]) {
      acc[slide.bannerId] = [];
    }
    acc[slide.bannerId].push(slide.id);
    return acc;
  }, {} as Record<number, number[]>);

  // Group slideGroupItems by banner ID (slideGroupItem.bannerId === banner.id)
  const slideGroupItemsByBannerId = filteredSlidegroupItems.reduce((acc, item) => {
    if (!acc[item.bannerId]) {
      acc[item.bannerId] = [];
    }
    acc[item.bannerId].push(item.id);
    return acc;
  }, {} as Record<number, number[]>);

  // Group pennants by banner ID (pennant.bannerId === banner.id)
  // Each pennant contains its slides (slideItems.bannerId === pennant.id)
  const pennantsByBannerId = filteredPennants.reduce((acc, pennant) => {
    if (!acc[pennant.bannerId]) {
      acc[pennant.bannerId] = {};
    }
    const parent = acc[pennant.bannerId];
    if (slideItemsByPennantId[pennant.id] && slideItemsByPennantId[pennant.id].length > 0) {
      parent[pennant.id] = slideItemsByPennantId[pennant.id];
    } else {
      if (!parent._orphans) {
        parent._orphans = [];
      }
      parent._orphans.push(pennant.id);
    }
    return acc;
  }, {} as Record<number, Record<number, number[]> & { _orphans?: number[] }>);

  // Group banners by quiz ID (banner.bannerId === quiz.id)
  // Banners contain both pennants (with their slides) and slideGroupItems
  const bannersByQuizId = filteredBanners.reduce((acc, banner) => {
    if (!banner.bannerId) return acc;
    if (!acc[banner.bannerId]) {
      acc[banner.bannerId] = {};
    }
    const parent = acc[banner.bannerId];
    const hasPennants = pennantsByBannerId[banner.id] && Object.keys(pennantsByBannerId[banner.id]).length > 0;
    const hasSlideGroupItems = slideGroupItemsByBannerId[banner.id] && slideGroupItemsByBannerId[banner.id].length > 0;

    if (hasPennants || hasSlideGroupItems) {
      if (hasPennants) {
        parent[banner.id] = { ...pennantsByBannerId[banner.id] };
        if (hasSlideGroupItems) {
          parent[banner.id].slideGroupItems = slideGroupItemsByBannerId[banner.id];
        }
      } else {
        // Only slideGroupItems, no pennants
        parent[banner.id] = { slideGroupItems: slideGroupItemsByBannerId[banner.id] };
      }
    } else {
      if (!parent._orphans) {
        parent._orphans = [];
      }
      parent._orphans.push(banner.id);
    }
    return acc;
  }, {} as Record<number, Record<number, (Record<number, number[]> & { slideGroupItems?: number[] }) | { slideGroupItems: number[] }> & { _orphans?: number[] }>);

  // Group submissions by quiz bannerId (submissions are quiz.pennants)
  const submissionsByQuizId = filteredSubmissions.reduce((acc, submission) => {
    if (!acc[submission.bannerId]) {
      acc[submission.bannerId] = [];
    }
    acc[submission.bannerId].push(submission.id);
    return acc;
  }, {} as Record<number, number[]>);

  // Build final structure: quizzes with children as objects, without children as array
  const quizzesWithChildren: Record<number, Record<number, Record<number, Record<number, number[]> & { _orphans?: number[] }> & { _orphans?: number[] }> & { _orphans?: number[] } | number[]> = {};
  const quizzesWithoutChildren: number[] = [];

  filteredQuizzes.forEach((quiz) => {
    const hasBanners = bannersByQuizId[quiz.id] && Object.keys(bannersByQuizId[quiz.id]).length > 0;
    const hasSubmissions = submissionsByQuizId[quiz.id] && submissionsByQuizId[quiz.id].length > 0;

    if (hasBanners || hasSubmissions) {
      const children: any = {};
      if (hasBanners) {
        children.banners = bannersByQuizId[quiz.id];
      }
      if (hasSubmissions) {
        children.submissions = submissionsByQuizId[quiz.id];
      }
      quizzesWithChildren[quiz.id] = children;
    } else {
      quizzesWithoutChildren.push(quiz.id);
    }
  });

  const quizIds = {
    ...quizzesWithChildren,
    ...(quizzesWithoutChildren.length > 0 ? { _orphans: quizzesWithoutChildren } : {}),
  };
  return quizIds;
};

