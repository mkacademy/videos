import { Middleware } from '@reduxjs/toolkit';
import {
  userPred,
  rootMocks,
  userMocks,
  filterPred,
  ownerMolds,
  stepsMocks,
  bannersMocks,
  instructionPred,
  pennantsMocks,
  FilterMetadata,
  InstructionMetadata,
} from "../../library/RowMockingUtils";
import { Tree as entities } from "../../utils";
import {
  dashboardTypes,
  filterTypes,
  instructionTypes,
  sifterTypes,
} from "../../library/commsUtils";
import {
  BD,
  BF,
  BI,
  BS,
  MD,
  MF,
  MI,
  MS,
  UD,
  UF,
  UI,
  US,
} from "../../library/commsUtils";
import { B, M, U } from "../../library/commsUtils";
import { declare } from "../slices/contentSlice";
import { FF as filterType, FI as instructionType, FS as sifterType, FD as dashboardType } from "../../library/commsUtils";
import { getCurAppName } from "../../utils";
import { viewParentData, viewPayload } from "../slices/viewSlice";
import { escrowConvolution, viewConvolutionPayload } from "../../library/actions";
import { RootState, AppDispatch } from "../index";
import { SlideGroup, Banner as CourseBanner } from '../slices/courseSlice';
import { BaseEntityData, DataRow, MockedDataReturn, MockedDataReturnTypes } from '../../components/Core/types';
import { InteractionState } from '../slices/interactionSlice';
import { StepInput, UserMockInput, BannerInput, PennantInput, RootInput, UserMetadata } from '../../library/RowMockingUtils';
import { Quiz as QuizBanner } from '../slices/quizSlice';
import { Status } from '../slices/actionSlice';

interface DataItem {
  id: number;
  type?: string;
  bannerId?: number;
  bannerIds?: number[];
}

const dedupeByIdMergingParents = <T extends DataItem>(items: T[]): T[] => {
  const byId = new Map<number, T>();
  for (const item of items) {
    const existing = byId.get(item.id);
    if (!existing) {
      byId.set(item.id, {
        ...item,
        ...(item.bannerId != null ? { bannerIds: [item.bannerId] } : {}),
      });
      continue;
    }
    if (item.bannerId == null) continue;
    const bannerIds = existing.bannerIds ?? (existing.bannerId != null ? [existing.bannerId] : []);
    if (!bannerIds.includes(item.bannerId)) {
      byId.set(item.id, { ...existing, bannerIds: [...bannerIds, item.bannerId] });
    }
  }
  return Array.from(byId.values());
};

const dedupeRootByIdMergingTargets = (items: RootInput[]): RootInput[] => {
  const byId = new Map<string | number, RootInput>();
  for (const item of items) {
    const existing = byId.get(item.id);
    if (!existing) {
      byId.set(item.id, { ...item });
      continue;
    }
    const mergedTargets = [...(existing.targets ?? []), ...(item.targets ?? [])]
      .filter((target, index, self) => self.findIndex((t) => t === target) === index);
    byId.set(item.id, { ...existing, targets: mergedTargets });
  }
  return Array.from(byId.values());
};

const collectBannerIds = (items: Array<{ bannerId?: number; bannerIds?: number[] }>) =>
  items.flatMap(({ bannerIds, bannerId }) =>
    bannerIds ?? (bannerId != null ? [bannerId] : [])
  ).filter(Boolean) as number[];

export const bossTypes = [BI, BS, BF, BD];
export const minionTypes = [MF, MS, MI, MD];
export const underbossTypes = [UF, US, UI, UD];

const RowsExtractor: Middleware<{}, RootState> = ({ dispatch, getState }) => {
  return (next) => (action) => {
    if (escrowConvolution.match(action)) {
      const { payload } = action;
      const keywords: string[] = [];
      const state = getState();
      const { from, to, contentIds, curApp }: viewConvolutionPayload = payload;
      const webapp = getCurAppName(curApp);
      const appRoute = from + to;
      const predicate = ({ id }: DataItem) => contentIds.includes(id);
      const mockedData = entities.getProperty(to, "mockedData");
      const connections = entities.getProperty(to, "connections");

      switch (webapp) {
        case "tutors": {
          const predicate0 = ({ id, type }: DataItem) =>
            contentIds.includes(id) && type === M;
          const predicate1 = ({ id, type }: DataItem) =>
            contentIds.includes(id) && type === U;
          const predicate2 = ({ id, type }: DataItem) =>
            contentIds.includes(id) && type === B;

          if (appRoute === "foundationminions") {
            const { tutors } = state.comms;
            const metadatas: UserMockInput[] = tutors
              .filter(predicate0)
              .map(userMocks(from, to));
            const mocks: MockedDataReturn = mockedData?.(metadatas, connections ?? []) ?? [];
            const data = mocks.map((mock: MockedDataReturnTypes) => mock as BaseEntityData & { email: string; minion: string; })
              .map((mock) => {
                const metadata = mock.metadata as UserMockInput;
                const statusValue = typeof metadata.status === 'number'
                  ? metadata.status
                  : (metadata.status as Status)?.current ?? 0;
                return userPred({
                  ...mock,
                  metadata: {
                    ...mock.metadata,
                    status: statusValue,
                    sizeInBytes: metadata.sizeInBytes ?? 0
                  } as UserMetadata
                });
              })
              .map((item: DataRow) => declare(keywords)(item));
            const freight = {
              interactions: { options: [], clicked: [] } as InteractionState,
              fetchedData: data,
              entity: to,
              curApp,
            };
            return next(viewPayload(freight));
          } else if (appRoute === "foundationbosses") {
            const { tutors } = state.comms;
            const metadatas: UserMockInput[] = tutors
              .filter(predicate2)
              .map(userMocks(from, to));
            const mocks = mockedData?.(metadatas, connections ?? []) ?? [];
            const data = mocks.map((mock: MockedDataReturnTypes) => mock as BaseEntityData & { email: string; boss: string; })
              .map((mock) => {
                const metadata = mock.metadata as UserMockInput;
                const statusValue = typeof metadata.status === 'number'
                  ? metadata.status
                  : (metadata.status as Status)?.current ?? 0;
                return userPred({
                  ...mock,
                  metadata: {
                    ...mock.metadata,
                    status: statusValue,
                    sizeInBytes: metadata.sizeInBytes ?? 0,
                  } as UserMetadata
                });
              })
              .map((item: DataRow) => declare(keywords)(item));
            const freight = {
              interactions: { options: [], clicked: [] } as InteractionState,
              fetchedData: data,
              entity: to,
              curApp,
            };
            return next(viewPayload(freight));
          } else if (appRoute === "foundationunderbosses") {
            const { tutors } = state.comms;
            const metadatas: UserMockInput[] = tutors
              .filter(predicate1)
              .map(userMocks(from, to));
            const mocks = mockedData?.(metadatas, connections ?? []) ?? [];
            const data = mocks.map((mock: MockedDataReturnTypes) => mock as BaseEntityData & { email: string; underboss: string; })
              .map((mock) => {
                const metadata = mock.metadata as UserMockInput;
                const statusValue = typeof metadata.status === 'number'
                  ? metadata.status
                  : (metadata.status as Status)?.current ?? 0;
                return userPred({
                  ...mock,
                  metadata: {
                    ...mock.metadata,
                    status: statusValue,
                    sizeInBytes: metadata.sizeInBytes ?? 0,
                  } as UserMetadata
                });
              })
              .map((item: DataRow) => declare(keywords)(item));
            const freight = {
              interactions: { options: [], clicked: [] } as InteractionState,
              fetchedData: data,
              entity: to,
            };
            return next(viewPayload(freight));
          }
          break;
        }
        case "tutorial": {
          if (appRoute === "foundationfilters") {
            const { banners } = state.tutorial;
            const metadatas: BannerInput[] = banners
              .filter(predicate)
              .map(bannersMocks(from, to));
            const mocks = mockedData?.(metadatas, connections ?? []) ?? [];
            const data = mocks.map((mock: MockedDataReturnTypes) => mock as BaseEntityData & { purpose: string; filter: string; })
              .map((mock) => {
                const metadata = mock.metadata as BannerInput;
                const statusValue = typeof metadata.status === 'number'
                  ? metadata.status
                  : (metadata.status as Status)?.current ?? 0;
                return filterPred({
                  ...mock,
                  metadata: {
                    ...mock.metadata,
                    status: statusValue,
                    sizeInBytes: metadata.sizeInBytes ?? 0,
                  } as FilterMetadata
                });
              })
              .map((item: DataRow) => declare(keywords)(item));
            const freight = {
              interactions: { options: [], clicked: [] } as InteractionState,
              fetchedData: data,
              entity: to,
              curApp,
            };
            return next(viewPayload(freight));
          } else if (appRoute === "filtersinstructions") {
            const { content } = state.tutorial;
            const selected = dedupeByIdMergingParents(
              content.flat().filter(predicate)
            );
            const metadatas: StepInput[] = selected.map(stepsMocks(from, to));
            const mocks = mockedData?.(metadatas, connections ?? []) ?? [];
            const data = mocks.map((mock: MockedDataReturnTypes) => mock as BaseEntityData & { instruction: string; details: string; imageurl: string; })
              .map((mock) => {
                const metadata = mock.metadata as StepInput;
                const statusValue = typeof metadata.status === 'number'
                  ? metadata.status
                  : (metadata.status as Status)?.current ?? 0;
                return instructionPred({
                  ...mock,
                  metadata: {
                    ...mock.metadata,
                    status: statusValue,
                    sizeInBytes: metadata.sizeInBytes ?? 0,
                  } as InstructionMetadata
                });
              })
              .map((item: DataRow) => declare(keywords)(item));
            const IDs = collectBannerIds(selected);
            setTimeout(() => (dispatch as AppDispatch)(viewParentData(IDs.map(String))), 100);
            const freight = {
              interactions: { options: [], clicked: [] } as InteractionState,
              fetchedData: data,
              entity: to,
              curApp,
            };
            return next(viewPayload(freight));
          }
          break;
        }
        case "quiz": {
          if (appRoute === "foundationdashboards") {
            const { quizzes } = state.quiz;
            const metadatas: BannerInput[] = quizzes
              .filter(predicate)
              .map(bannersMocks(from, to));
            const mocks = mockedData?.(metadatas, connections ?? []) ?? [];
            const data = mocks.map((mock: MockedDataReturnTypes) => mock as BaseEntityData & { purpose: string; dashboard: string; })
              .map((mock) => {
                const metadata = mock.metadata as BannerInput;
                const statusValue = typeof metadata.status === 'number'
                  ? metadata.status
                  : (metadata.status as Status)?.current ?? 0;
                return filterPred({
                  ...mock,
                  metadata: {
                    ...mock.metadata,
                    status: statusValue,
                    sizeInBytes: metadata.sizeInBytes ?? 0,
                  } as FilterMetadata
                });
              })
              .map((item: DataRow) => declare(keywords)(item));
            const freight = {
              fetchedData: data,
              interactions: { options: [], clicked: [] } as InteractionState,
              entity: to,
              curApp,
            };
            return next(viewPayload(freight));
          } else if (appRoute === "dashboardsfilters") {
            const { quizzes } = state.quiz;
            const selected = dedupeByIdMergingParents(
              quizzes
                .map(({ pennants }: QuizBanner) => pennants)
                .flat()
                .filter(predicate)
            );
            const metadatas: PennantInput[] = selected.map(pennantsMocks(from, to));
            const mocks = mockedData?.(metadatas, connections ?? []) ?? [];
            const data = mocks.map((mock: MockedDataReturnTypes) => mock as BaseEntityData & { purpose: string; filter: string; })
              .map((mock) => {
                const metadata = mock.metadata as PennantInput;
                const statusValue = typeof metadata.status === 'number'
                  ? metadata.status
                  : (metadata.status as Status)?.current ?? 0;
                return filterPred({
                  ...mock,
                  metadata: {
                    ...mock.metadata,
                    status: statusValue,
                    sizeInBytes: metadata.sizeInBytes ?? 0,
                  } as FilterMetadata
                });
              })
              .map((item: DataRow) => declare(keywords)(item));
            const IDs = collectBannerIds(selected);
            setTimeout(() => (dispatch as AppDispatch)(viewParentData(IDs.map(String))), 100);
            const freight = {
              interactions: { options: [], clicked: [] } as InteractionState,
              fetchedData: data,
              entity: to,
              curApp,
            };
            return next(viewPayload(freight));
          } else if (appRoute === "dashboardssifters") {
            const { banners } = state.quiz;
            const selected = dedupeByIdMergingParents(banners.filter(predicate));
            const metadatas: BannerInput[] = selected.map(pennantsMocks(from, to));
            const mocks = mockedData?.(metadatas, connections ?? []) ?? [];
            const data = mocks.map((mock: MockedDataReturnTypes) => mock as BaseEntityData & { purpose: string; filter: string; })
              .map((mock) => {
                const metadata = mock.metadata as BannerInput;
                const statusValue = typeof metadata.status === 'number'
                  ? metadata.status
                  : (metadata.status as Status)?.current ?? 0;
                return filterPred({
                  ...mock,
                  metadata: {
                    ...mock.metadata,
                    status: statusValue,
                    sizeInBytes: metadata.sizeInBytes ?? 0,
                  } as FilterMetadata
                });
              })
              .map((item: DataRow) => declare(keywords)(item));
            const IDs = collectBannerIds(selected);
            setTimeout(() => (dispatch as AppDispatch)(viewParentData(IDs.map(String))), 100);
            const freight = {
              interactions: { options: [], clicked: [] } as InteractionState,
              fetchedData: data,
              entity: to,
              curApp,
            };
            return next(viewPayload(freight));
          }
          // @ts-ignore: intentional fall-through
          // eslint-disable-next-line no-fallthrough
        }
        case "course": {
          const curReducer =
            webapp === "quiz" ? state.quiz : state.course;
          const slidesPred = ({ slides, ...objSlides }: SlideGroup) =>
            Object.values(objSlides);

          if (appRoute === "foundationsifters") {
            const { banners } = curReducer;
            const metadatas: BannerInput[] = banners
              .filter(predicate)
              .map(bannersMocks(from, to));
            const mocks = mockedData?.(metadatas, connections ?? []) ?? [];
            const data = mocks.map((mock: MockedDataReturnTypes) => mock as BaseEntityData & { purpose: string; filter: string; })
              .map((mock) => {
                const metadata = mock.metadata as BannerInput;
                const statusValue = typeof metadata.status === 'number'
                  ? metadata.status
                  : (metadata.status as Status)?.current ?? 0;
                return filterPred({
                  ...mock,
                  metadata: {
                    ...mock.metadata,
                    status: statusValue,
                    sizeInBytes: metadata.sizeInBytes ?? 0,
                  } as FilterMetadata
                });
              })
              .map((item: DataRow) => declare(keywords)(item));
            const freight = {
              interactions: { options: [], clicked: [] } as InteractionState,
              fetchedData: data,
              entity: to,
              curApp,
            };
            return next(viewPayload(freight));
          } else if (appRoute === "siftersinstructions") {
            const { content } = curReducer;
            const selected = dedupeByIdMergingParents(
              content
                .map(slidesPred)
                .flat()
                .filter(predicate)
            );
            const metadatas: StepInput[] = selected.map(stepsMocks(from, to));
            const mocks = mockedData?.(metadatas, connections ?? []) ?? [];
            const data = mocks.map((mock: MockedDataReturnTypes) => mock as BaseEntityData & { instruction: string; details: string; imageurl: string; })
              .map((mock) => {
                const metadata = mock.metadata as StepInput;
                const statusValue = typeof metadata.status === 'number'
                  ? metadata.status
                  : (metadata.status as Status)?.current ?? 0;
                return instructionPred({
                  ...mock,
                  metadata: {
                    ...mock.metadata,
                    status: statusValue,
                    sizeInBytes: metadata.sizeInBytes ?? 0,
                  } as InstructionMetadata
                });
              })
              .map((item: DataRow) => declare(keywords)(item));
            const IDs = collectBannerIds(selected);
            setTimeout(() => (dispatch as AppDispatch)(viewParentData(IDs.map(String))), 100);
            const freight = {
              interactions: { options: [], clicked: [] } as InteractionState,
              fetchedData: data,
              entity: to,
              curApp,
            };
            return next(viewPayload(freight));
          } else if (appRoute === "siftersfilters") {
            const { banners } = curReducer;
            const selected = dedupeByIdMergingParents(
              banners
                .map(({ pennants }: CourseBanner) => pennants)
                .flat()
                .filter(predicate)
            );
            const metadatas: PennantInput[] = selected.map(pennantsMocks(from, to));
            const mocks = mockedData?.(metadatas, connections ?? []) ?? [];
            const data = mocks.map((mock: MockedDataReturnTypes) => mock as BaseEntityData & { purpose: string; filter: string; })
              .map((mock) => {
                const metadata = mock.metadata as PennantInput;
                const statusValue = typeof metadata.status === 'number'
                  ? metadata.status
                  : (metadata.status as Status)?.current ?? 0;
                return filterPred({
                  ...mock,
                  metadata: {
                    ...mock.metadata,
                    status: statusValue,
                    sizeInBytes: metadata.sizeInBytes ?? 0,
                  } as FilterMetadata
                });
              })
              .map((item: DataRow) => declare(keywords)(item));
            const IDs = collectBannerIds(selected);
            setTimeout(() => (dispatch as AppDispatch)(viewParentData(IDs.map(String))), 100);
            const freight = {
              interactions: { options: [], clicked: [] } as InteractionState,
              fetchedData: data,
              entity: to,
              curApp,
            };
            return next(viewPayload(freight));
          } else if (appRoute === "filtersinstructions") {
            const { content } = curReducer;
            const selected = dedupeByIdMergingParents(
              content
                .map(({ slides }: SlideGroup) => slides)
                .flat(2)
                .filter(predicate)
            );
            const metadatas: StepInput[] = selected.map(stepsMocks(from, to));
            const mocks = mockedData?.(metadatas, connections ?? []) ?? [];
            const data = mocks.map((mock: MockedDataReturnTypes) => mock as BaseEntityData & { instruction: string; details: string; imageurl: string; })
              .map((mock) => {
                const metadata = mock.metadata as StepInput;
                const statusValue = typeof metadata.status === 'number'
                  ? metadata.status
                  : (metadata.status as Status)?.current ?? 0;
                return instructionPred({
                  ...mock,
                  metadata: {
                    ...mock.metadata,
                    status: statusValue,
                    sizeInBytes: metadata.sizeInBytes ?? 0,
                  } as InstructionMetadata
                });
              })
              .map((item: DataRow) => declare(keywords)(item));
            const IDs = collectBannerIds(selected);
            setTimeout(() => (dispatch as AppDispatch)(viewParentData(IDs.map(String))), 100);
            const freight = {
              interactions: { options: [], clicked: [] } as InteractionState,
              fetchedData: data,
              entity: to,
              curApp,
            };
            return next(viewPayload(freight));
          }
          break;
        }
        case "outgoing": {
          const predicate0 = ({ id, type }: DataItem) =>
            contentIds.includes(id) && instructionTypes.includes(type as string);
          const predicate4 = ({ id, type }: DataItem) =>
            contentIds.includes(id) && dashboardTypes.includes(type as string);
          const predicate1 = ({ id, type }: DataItem) =>
            contentIds.includes(id) && filterTypes.includes(type as string);
          const predicate2 = ({ id, type }: DataItem) =>
            contentIds.includes(id) && sifterTypes.includes(type as string);
          const predicate3 = (parent: string) => {
            switch (parent) {
              case "bosses":
                return ({ id, type }: DataItem) =>
                  contentIds.includes(id) && bossTypes.includes(type as string);
              case "minions":
                return ({ id, type }: DataItem) =>
                  contentIds.includes(id) && minionTypes.includes(type as string);
              case "underbosses":
                return ({ id, type }: DataItem) =>
                  contentIds.includes(id) && underbossTypes.includes(type as string);
              default:
                return () => false;
            }
          };

          if (to === "filters") {
            const { outgoing } = state.comms;
            const selected = dedupeRootByIdMergingTargets(
              outgoing
                .filter(predicate1)
                .filter(predicate3(from))
                .map(ownerMolds)
            );
            const metadatas: RootInput[] = selected.map(rootMocks(from, to));
            const mocks = mockedData?.(metadatas, connections ?? []) ?? [];
            const data = mocks.map((mock: MockedDataReturnTypes) => mock as BaseEntityData & { purpose: string; filter: string; })
              .map((mock) => {
                const metadata = mock.metadata as RootInput;
                return filterPred({
                  ...mock,
                  metadata: {
                    ...mock.metadata,
                    status: metadata.status,
                    sizeInBytes: metadata.sizeInBytes ?? 0,
                  } as FilterMetadata
                });
              })
              .map((item: DataRow) => declare(keywords)(item));
            const IDs = selected.map(({ targets }: RootInput) => targets).flat();
            setTimeout(() => (dispatch as AppDispatch)(viewParentData(IDs.map(String))), 100);
            const freight = {
              interactions: { options: [], clicked: [] } as InteractionState,
              fetchedData: data.map((item: DataRow) => ({
                ...item,
                id: item.id.toString(),
                metadata: {
                  ...item.metadata,
                  owner: Boolean(item.metadata?.owner),
                },
              })),
              entity: to,
            };
            return next(viewPayload(freight));
          } else if (to === "instructions") {
            const { outgoing } = state.comms;
            const selected = dedupeRootByIdMergingTargets(
              outgoing
                .filter(predicate0)
                .filter(predicate3(from))
                .map(ownerMolds)
            );
            const metadatas: RootInput[] = selected.map(rootMocks(from, to));
            const mocks = mockedData?.(metadatas, connections ?? []) ?? [];
            const data = mocks.map((mock: MockedDataReturnTypes) => mock as BaseEntityData & { instruction: string; details: string; imageurl: string; })
              .map((mock) => {
                const metadata = mock.metadata as RootInput;
                return instructionPred({
                  ...mock,
                  metadata: {
                    ...mock.metadata,
                    status: metadata.status,
                    sizeInBytes: metadata.sizeInBytes ?? 0,
                  } as InstructionMetadata
                });
              })
              .map((item: DataRow) => declare(keywords)(item));
            const IDs = selected.map(({ targets }: RootInput) => targets).flat();
            setTimeout(() => (dispatch as AppDispatch)(viewParentData(IDs.map(String))), 100);
            const freight = {
              interactions: { options: [], clicked: [] } as InteractionState,
              fetchedData: data.map((item: DataRow) => ({
                ...item,
                id: item.id.toString(),
                metadata: {
                  ...item.metadata,
                  owner: Boolean(item.metadata?.owner),
                },
              })),
              entity: to,
            };
            return next(viewPayload(freight));
          } else if (to === "sifters") {
            const { outgoing } = state.comms;
            const selected = dedupeRootByIdMergingTargets(
              outgoing
                .filter(predicate2)
                .filter(predicate3(from))
                .map(ownerMolds)
            );
            const metadatas: RootInput[] = selected.map(rootMocks(from, to));
            const mocks = mockedData?.(metadatas, connections ?? []) ?? [];
            const data = mocks.map((mock: MockedDataReturnTypes) => mock as BaseEntityData & { purpose: string; filter: string; })
              .map((mock) => {
                const metadata = mock.metadata as RootInput;
                return filterPred({
                  ...mock,
                  metadata: {
                    ...mock.metadata,
                    status: metadata.status,
                    sizeInBytes: metadata.sizeInBytes ?? 0,
                  } as FilterMetadata
                });
              })
              .map((item: DataRow) => declare(keywords)(item));
            const IDs = selected.map(({ targets }: RootInput) => targets).flat();
            setTimeout(() => (dispatch as AppDispatch)(viewParentData(IDs.map(String))), 100);
            const freight = {
              interactions: { options: [], clicked: [] } as InteractionState,
              fetchedData: data.map((item: DataRow) => ({
                ...item,
                id: item.id.toString(),
                metadata: {
                  ...item.metadata,
                  owner: Boolean(item.metadata?.owner),
                },
              })),
              entity: to,
            };
            return next(viewPayload(freight));
          } else if (to === "dashboards") {
            const { outgoing } = state.comms;
            const selected = dedupeRootByIdMergingTargets(
              outgoing
                .filter(predicate4)
                .filter(predicate3(from))
                .map(ownerMolds)
            );
            const metadatas: RootInput[] = selected.map(rootMocks(from, to));
            const mocks = mockedData?.(metadatas, connections ?? []) ?? [];
            const data = mocks.map((mock: MockedDataReturnTypes) => mock as BaseEntityData & { purpose: string; filter: string; })
              .map((mock) => {
                const metadata = mock.metadata as RootInput;
                return filterPred({
                  ...mock,
                  metadata: {
                    ...mock.metadata,
                    status: metadata.status,
                    sizeInBytes: metadata.sizeInBytes ?? 0,
                  } as FilterMetadata
                });
              })
              .map((item: DataRow) => declare(keywords)(item));
            const IDs = selected.map(({ targets }: RootInput) => targets).flat();
            setTimeout(() => (dispatch as AppDispatch)(viewParentData(IDs.map(String))), 100);
            const freight = {
              interactions: { options: [], clicked: [] } as InteractionState,
              fetchedData: data.map((item: DataRow) => ({
                ...item,
                id: item.id.toString(),
                metadata: {
                  ...item.metadata,
                  owner: Boolean(item.metadata?.owner),
                },
              })),
              entity: to,
            };
            return next(viewPayload(freight));
          }
          break;
        }
        case "incoming": {
          const predicate0 = ({ id, type }: DataItem) =>
            contentIds.includes(id) && instructionType === type;
          const predicate3 = ({ id, type }: DataItem) =>
            contentIds.includes(id) && dashboardType === type;
          const predicate1 = ({ id, type }: DataItem) =>
            contentIds.includes(id) && filterType === type;
          const predicate2 = ({ id, type }: DataItem) =>
            contentIds.includes(id) && sifterType === type;
          if (to === "dashboards") {
            const { incoming } = state.comms;
            const selected = incoming.filter(predicate3).map(ownerMolds);
            const metadatas: RootInput[] = selected.map(rootMocks(from, to));
            const mocks = mockedData?.(metadatas, connections ?? []) ?? [];
            const data = mocks.map((mock: MockedDataReturnTypes) => mock as BaseEntityData & { purpose: string; filter: string; })
              .map((mock) => {
                const metadata = mock.metadata as RootInput;
                return filterPred({
                  ...mock,
                  metadata: {
                    ...mock.metadata,
                    status: metadata.status,
                    sizeInBytes: metadata.sizeInBytes ?? 0,
                  } as FilterMetadata
                });
              })
              .map((item: DataRow) => declare(keywords)(item));
            const freight = {
              interactions: { options: [], clicked: [] } as InteractionState,
              fetchedData: data.map((item: DataRow) => ({
                ...item,
                id: item.id.toString(),
                metadata: {
                  ...item.metadata,
                  owner: Boolean(item.metadata?.owner),
                },
              })),
              entity: to,
            };
            return next(viewPayload(freight));
          } else if (to === "filters") {
            const { incoming } = state.comms;
            const selected = incoming.filter(predicate1).map(ownerMolds);
            const metadatas: RootInput[] = selected.map(rootMocks(from, to));
            const mocks = mockedData?.(metadatas, connections ?? []) ?? [];
            const data = mocks.map((mock: MockedDataReturnTypes) => mock as BaseEntityData & { purpose: string; dashboard: string; })
              .map((mock) => {
                const metadata = mock.metadata as RootInput;
                return filterPred({
                  ...mock,
                  metadata: {
                    ...mock.metadata,
                    status: metadata.status,
                    sizeInBytes: metadata.sizeInBytes ?? 0,
                  } as FilterMetadata
                });
              })
              .map((item: DataRow) => declare(keywords)(item));
            setTimeout(() => (dispatch as AppDispatch)(viewParentData([])), 100);
            const freight = {
              interactions: { options: [], clicked: [] } as InteractionState,
              fetchedData: data.map((item: DataRow) => ({
                ...item,
                id: item.id.toString(),
                metadata: {
                  ...item.metadata,
                  owner: Boolean(item.metadata?.owner),
                },
              })),
              entity: to,
            };
            return next(viewPayload(freight));
          } else if (to === "instructions") {
            const { incoming } = state.comms;
            const selected = incoming.filter(predicate0).map(ownerMolds);
            const metadatas: RootInput[] = selected.map(rootMocks(from, to));
            const mocks = mockedData?.(metadatas, connections ?? []) ?? [];
            const data = mocks.map((mock: MockedDataReturnTypes) => mock as BaseEntityData & { instruction: string; details: string; imageurl: string; })
              .map((mock) => {
                const metadata = mock.metadata as RootInput;
                return instructionPred({
                  ...mock,
                  metadata: {
                    ...mock.metadata,
                    status: metadata.status,
                    sizeInBytes: metadata.sizeInBytes ?? 0,
                  } as InstructionMetadata
                });
              })
              .map((item: DataRow) => declare(keywords)(item));
            setTimeout(() => (dispatch as AppDispatch)(viewParentData([])), 100);
            const freight = {
              interactions: { options: [], clicked: [] } as InteractionState,
              fetchedData: data.map((item: DataRow) => ({
                ...item,
                id: item.id.toString(),
                metadata: {
                  ...item.metadata,
                  owner: Boolean(item.metadata?.owner),
                },
              })),
              entity: to,
            };
            return next(viewPayload(freight));
          } else if (to === "sifters") {
            const { incoming } = state.comms;
            const selected = incoming.filter(predicate2).map(ownerMolds);
            const metadatas: RootInput[] = selected.map(rootMocks(from, to));
            const mocks = mockedData?.(metadatas, connections ?? []) ?? [];
            const data = mocks.map((mock: MockedDataReturnTypes) => mock as BaseEntityData & { purpose: string; sifter: string; })
              .map((mock) => {
                const metadata = mock.metadata as RootInput;
                return filterPred({
                  ...mock,
                  metadata: {
                    ...mock.metadata,
                    status: metadata.status,
                    sizeInBytes: metadata.sizeInBytes ?? 0,
                  } as FilterMetadata
                });
              })
              .map((item: DataRow) => declare(keywords)(item));
            setTimeout(() => (dispatch as AppDispatch)(viewParentData([])), 100);
            const freight = {
              interactions: { options: [], clicked: [] } as InteractionState,
              fetchedData: data.map((item: DataRow) => ({
                ...item,
                id: item.id.toString(),
                metadata: {
                  ...item.metadata,
                  owner: Boolean(item.metadata?.owner),
                },
              })),
              entity: to,
            };
            return next(viewPayload(freight));
          }
          break;
        }
        default:
          break;
      }
      return next(action);
    }

    return next(action);
  };
};

export default RowsExtractor;