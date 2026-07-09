import { Middleware } from '@reduxjs/toolkit';
import {
  rootMocks,
  ownerMolds,
  stepsMocks,
  filterPred,
  bannersMocks,
  pennantsMocks,
  instructionPred,
  FilterMetadata,
  InstructionMetadata,
  RootInput,
} from "../../library/RowMockingUtils";
import { Tree as entities, getAlias } from "../../utils";
import { declare } from "../slices/contentSlice";
import { extractRows } from "../../library/actions";
import { appendRoute as stashRows, getStashCellRows, StashPayload } from "../slices/stashSlice";
import { prependError as insertError } from "../slices/errorSlice";
import {
  FF as filterType,
  FI as instructionType,
  FS as sifterType,
  filterTypes,
  instructionTypes,
  sifterTypes
} from "../../library/commsUtils";
import type { RootState } from "../types";
import { Submition } from '../slices/quizSlice';
import { BaseEntityData, DataRow, MockedDataReturn, MockedDataReturnTypes } from '../../components/Core/types';
import { BannerInput, PennantInput, StepInput } from '../../library/RowMockingUtils';
import { Status } from '../slices/actionSlice';
import { Banner as CourseBanner, SlideGroup } from '../slices/courseSlice';



const errorMsg0 = "Invalid timestmap provided";
const errorMsg1 = "no matches found, Stash aborted";
const errorMsg3 = "unknown source webapp, or invalid approute";

const RowsStasher: Middleware<{}, RootState> = (store) =>
  (next) =>
    (action) => {
      if (extractRows.match(action)) {
        const { payload } = action;
        const keywords: string[] = [];
        const state = store.getState();
        const { dismisstype, source, approute: fromto, timestamp } = payload;
        const timestamps = state.stash[fromto];
        const predicate = state.settings.seltype
          ? ({ isHighlighted }: { isHighlighted: boolean }) => isHighlighted === dismisstype
          : ({ isDismissed }: { isDismissed: boolean }) => isDismissed === dismisstype;
        const fetchedData = timestamps ? getStashCellRows(timestamps[timestamp]) : undefined;

        if (fetchedData === undefined || fetchedData.length === 0) return next(insertError(errorMsg0));

        switch (source) {
          case "tutorial": {
            if (fromto === "foundationfilters") {
              const mockedData = entities.getProperty("filters", "mockedData");
              const connections = entities.getProperty("filters", "connections");
              const { banners } = state.tutorial;
              const metadatas: BannerInput[] = banners
                .filter(predicate)
                .map(bannersMocks("foundation", "filters"));
              if (metadatas.length === 0) return next(insertError(errorMsg1));
              const mocks: MockedDataReturn = mockedData?.(metadatas, connections ?? []) ?? [];
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
              const sucMsg = `tabulated ${data.length} Banners into rootfilters`;
              setTimeout(() => store.dispatch(insertError(sucMsg)));
              const freight: StashPayload = {
                timestamp,
                content: data,
                approute: fromto,
              };
              return next(stashRows(freight));
            } else if (fromto === "filtersinstructions") {
              const { content } = state.tutorial;
              const mockedData = entities.getProperty("instructions", "mockedData");
              const connections = entities.getProperty("instructions", "connections");
              const selected = content.flat().filter(predicate);
              const metadatas: StepInput[] = selected.map(stepsMocks("filters", "instructions"));
              if (metadatas.length === 0) return next(insertError(errorMsg1));
              const mocks: MockedDataReturn = mockedData?.(metadatas, connections ?? []) ?? [];
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
              const sucMsg = `tabulated ${data.length} Steps into filterssteps`;
              setTimeout(() => store.dispatch(insertError(sucMsg)));
              const freight: StashPayload = {
                timestamp,
                content: data,
                approute: fromto,
              };
              return next(stashRows(freight));
            }
            break;
          }
          case "quiz": {
            if (fromto === "foundationdashboards") {
              const mockedData = entities.getProperty("dashboards", "mockedData");
              const connections = entities.getProperty("dashboards", "connections");
              const { banners } = state.quiz;
              const metadatas: BannerInput[] = banners
                .filter(predicate)
                .map(bannersMocks("foundation", "filters"));
              if (metadatas.length === 0) return next(insertError(errorMsg1));
              const mocks: MockedDataReturn = mockedData?.(metadatas, connections ?? []) ?? [];
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
              const sucMsg = `tabulated ${data.length} Quizzers into rootDashboards`;
              setTimeout(() => store.dispatch(insertError(sucMsg)));
              const freight: StashPayload = {
                timestamp,
                content: data,
                approute: fromto,
              };
              return next(stashRows(freight));
            } else if (fromto === "dashboardsfilters") {
              const mockedData = entities.getProperty("filters", "mockedData");
              const connections = entities.getProperty("filters", "connections");
              const { quizzes } = state.quiz;
              const metadatas: PennantInput[] = quizzes
                .map(({ pennants: submittions }: { pennants: Submition[] }) => submittions)
                .flat()
                .filter(predicate)
                .map(pennantsMocks("dashboards", "filters"));
              if (metadatas.length === 0) return next(insertError(errorMsg1));
              const mocks: MockedDataReturn = mockedData?.(metadatas, connections ?? []) ?? [];
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
              const sucMsg = `tabulated ${data.length} submittions into dashboardsfilters`;
              setTimeout(() => store.dispatch(insertError(sucMsg)));
              const freight: StashPayload = {
                timestamp,
                content: data,
                approute: fromto,
              };
              return next(stashRows(freight));
            }
            // @ts-ignore: intentional fall-through
            // eslint-disable-next-line no-fallthrough
          }
          case "course": {
            const curReducer =
              source === "quiz" ? state.quiz : state.course;
            if (fromto === "siftersfilters") {
              const mockedData = entities.getProperty("filters", "mockedData");
              const connections = entities.getProperty("filters", "connections");
              const { banners } = curReducer;
              const metadatas: PennantInput[] = banners
                .map(({ pennants }: CourseBanner) => pennants)
                .flat()
                .filter(predicate)
                .map(pennantsMocks("sifters", "filters"));
              if (metadatas.length === 0) return next(insertError(errorMsg1));
              const mocks: MockedDataReturn = mockedData?.(metadatas, connections ?? []) ?? [];
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
              const sucMsg = `tabulated ${data.length} Pennants into siftersfilters`;
              setTimeout(() => store.dispatch(insertError(sucMsg)));
              const freight: StashPayload = {
                timestamp,
                content: data,
                approute: fromto,
              };
              return next(stashRows(freight));
            }
            if (fromto === "foundationsifters") {
              const mockedData = entities.getProperty("sifters", "mockedData");
              const connections = entities.getProperty("sifters", "connections");
              const { banners } = curReducer;
              const metadatas: BannerInput[] = banners
                .filter(predicate)
                .map(bannersMocks("foundation", "sifters"));
              if (metadatas.length === 0) return next(insertError(errorMsg1));
              const mocks: MockedDataReturn = mockedData?.(metadatas, connections ?? []) ?? [];
              const data = mocks.map((mock: MockedDataReturnTypes) => mock as BaseEntityData & { purpose: string; sifter: string; })
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
              const sucMsg = `tabulated ${data.length} Banners into rootsifters`;
              setTimeout(() => store.dispatch(insertError(sucMsg)));
              const freight: StashPayload = {
                timestamp,
                content: data,
                approute: fromto,
              };
              return next(stashRows(freight));
            } else if (fromto === "siftersinstructions") {
              const slidesPred = ({ slides, ...objSlides }: SlideGroup) =>
                Object.values(objSlides);
              const { content } = curReducer;
              const mockedData = entities.getProperty("instructions", "mockedData");
              const connections = entities.getProperty("instructions", "connections");
              const selected = content.map(slidesPred).flat().filter(predicate);
              if (selected.length === 0) return next(insertError(errorMsg1));
              const metadatas: StepInput[] = selected.map(stepsMocks("sifters", "instructions"));
              const mocks: MockedDataReturn = mockedData?.(metadatas, connections ?? []) ?? [];
              const data = mocks.map((mock: MockedDataReturnTypes) => mock as BaseEntityData & { purpose: string; instruction: string; details: string; imageurl: string; })
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
              const sucMsg = `tabulated ${data.length} Covers into sifterssteps`;
              setTimeout(() => store.dispatch(insertError(sucMsg)));
              const freight: StashPayload = {
                timestamp,
                content: data,
                approute: fromto,
              };
              return next(stashRows(freight));
            } else if (fromto === "filtersinstructions") {
              const slidesPred = ({ slides }: SlideGroup) => slides;
              const { banners, content } = curReducer;
              const mockedData = entities.getProperty("instructions", "mockedData");
              const connections = entities.getProperty("instructions", "connections");
              const selected = content
                .map(slidesPred)
                .flat(2)
                .filter(predicate);
              if (selected.length === 0) return next(insertError(errorMsg1));
              const pennantIds = banners
                .map(({ pennants }: CourseBanner) => pennants)
                .flat()
                .map(({ id }: { id: number }) => id);
              const pred = ({ bannerId }: { bannerId: number }) => pennantIds.includes(bannerId);
              const fInstructs = selected.filter(pred);
              const metadatas: StepInput[] = fInstructs.map(stepsMocks("filters", "instructions"));
              const mocks: MockedDataReturn = mockedData?.(metadatas, connections ?? []) ?? [];
              const data = mocks.map((mock: MockedDataReturnTypes) => mock as BaseEntityData & { purpose: string; instruction: string; details: string; imageurl: string; })
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
              const sucMsg = `tabulated ${data.length} Slides into filterssteps`;
              setTimeout(() => store.dispatch(insertError(sucMsg)));
              const freight: StashPayload = {
                timestamp,
                content: data,
                approute: fromto,
              };
              return next(stashRows(freight));
            }
            break;
          }
          case "outgoing": {
            const predicate3 = ({ isDismissed, type }: { isDismissed: boolean; type: string }) =>
              isDismissed === dismisstype && instructionTypes.includes(type);
            const predicate0 = ({ isDismissed, type }: { isDismissed: boolean; type: string }) =>
              isDismissed === dismisstype && instructionTypes.includes(type);
            const predicate1 = ({ isDismissed, type }: { isDismissed: boolean; type: string }) =>
              isDismissed === dismisstype && filterTypes.includes(type);
            const predicate2 = ({ isDismissed, type }: { isDismissed: boolean; type: string }) =>
              isDismissed === dismisstype && sifterTypes.includes(type);

            if (fromto.endsWith("filters")) {
              const from = fromto.replace("filters", "");
              const { outgoing } = state.comms;
              const mockedData = entities.getProperty("filters", "mockedData");
              const connections = entities.getProperty("filters", "connections");
              const selected = outgoing.filter(predicate1).map(ownerMolds);
              if (selected.length === 0) return next(insertError(errorMsg1));
              const metadatas: RootInput[] = selected.map(rootMocks(from, "filters"));
              const mocks: MockedDataReturn = mockedData?.(metadatas, connections ?? []) ?? [];
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
              const sucMsg = `tabulated ${data.length} Filters into ${getAlias(from)}filters`;
              setTimeout(() => store.dispatch(insertError(sucMsg)));
              const freight: StashPayload = {
                timestamp,
                content: data.map((item: DataRow) => ({
                  ...item,
                  id: item.id.toString(),
                  metadata: {
                    ...item.metadata,
                    owner: Boolean(item.metadata?.owner),
                  },
                })),
                approute: fromto,
              };
              return next(stashRows(freight));
            } else if (fromto.endsWith("instructions")) {
              const from = fromto.replace("instructions", "");
              const { outgoing } = state.comms;
              const mockedData = entities.getProperty("instructions", "mockedData");
              const connections = entities.getProperty("instructions", "connections");
              const selected = outgoing.filter(predicate0).map(ownerMolds);
              if (selected.length === 0) return next(insertError(errorMsg1));
              const metadatas: RootInput[] = selected.map(rootMocks(from, "instructions"));
              const mocks: MockedDataReturn = mockedData?.(metadatas, connections ?? []) ?? [];
              const data = mocks.map((mock: MockedDataReturnTypes) => mock as BaseEntityData & { purpose: string; instruction: string; details: string; imageurl: string; })
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
              const sucMsg = `tabulated ${data.length} Steps into ${getAlias(from)}steps`;
              setTimeout(() => store.dispatch(insertError(sucMsg)));
              const freight: StashPayload = {
                timestamp,
                content: data.map((item: DataRow) => ({
                  ...item,
                  id: item.id.toString(),
                  metadata: {
                    ...item.metadata,
                    owner: Boolean(item.metadata?.owner),
                  },
                })),
                approute: fromto,
              };
              return next(stashRows(freight));
            } else if (fromto.endsWith("sifters")) {
              const { outgoing } = state.comms;
              const from = fromto.replace("sifters", "");
              const mockedData = entities.getProperty("sifters", "mockedData");
              const connections = entities.getProperty("sifters", "connections");
              const selected = outgoing.filter(predicate2).map(ownerMolds);
              if (selected.length === 0) return next(insertError(errorMsg1));
              const metadatas: RootInput[] = selected.map(rootMocks(from, "sifters"));
              const mocks: MockedDataReturn = mockedData?.(metadatas, connections ?? []) ?? [];
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
              const sucMsg = `tabulated ${data.length} Sifters into ${getAlias(from)}sifters`;
              setTimeout(() => store.dispatch(insertError(sucMsg)));
              const freight: StashPayload = {
                timestamp,
                content: data.map((item: DataRow) => ({
                  ...item,
                  id: item.id.toString(),
                  metadata: {
                    ...item.metadata,
                    owner: Boolean(item.metadata?.owner),
                  },
                })),
                approute: fromto,
              };
              return next(stashRows(freight));
            } else if (fromto.endsWith("dashboards")) {
              const { outgoing } = state.comms;
              const from = fromto.replace("dashboards", "");
              const mockedData = entities.getProperty("dashboards", "mockedData");
              const connections = entities.getProperty("dashboards", "connections");
              const selected = outgoing.filter(predicate3).map(ownerMolds);
              if (selected.length === 0) return next(insertError(errorMsg1));
              const metadatas: RootInput[] = selected.map(rootMocks(from, "dashboards"));
              const mocks: MockedDataReturn = mockedData?.(metadatas, connections ?? []) ?? [];
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
              const sucMsg = `tabulated ${data.length} Dashboards into ${getAlias(from)}dashboards`;
              setTimeout(() => store.dispatch(insertError(sucMsg)));
              const freight: StashPayload = {
                timestamp,
                content: data.map((item: DataRow) => ({
                  ...item,
                  id: item.id.toString(),
                  metadata: {
                    ...item.metadata,
                    owner: Boolean(item.metadata?.owner),
                  },
                })),
                approute: fromto,
              };
              return next(stashRows(freight));
            }
            break;
          }
          case "incoming": {
            const predicate3 = ({ isDismissed, type }: { isDismissed: boolean; type: string }) =>
              isDismissed === dismisstype && instructionType === type;
            const predicate0 = ({ isDismissed, type }: { isDismissed: boolean; type: string }) =>
              isDismissed === dismisstype && instructionType === type;
            const predicate1 = ({ isDismissed, type }: { isDismissed: boolean; type: string }) =>
              isDismissed === dismisstype && filterType === type;
            const predicate2 = ({ isDismissed, type }: { isDismissed: boolean; type: string }) =>
              isDismissed === dismisstype && sifterType === type;

            if (fromto.endsWith("filters")) {
              const { incoming } = state.comms;
              const from = fromto.replace("filters", "");
              const mockedData = entities.getProperty("filters", "mockedData");
              const connections = entities.getProperty("filters", "connections");
              const selected = incoming.filter(predicate1).map(ownerMolds);
              if (selected.length === 0) return next(insertError(errorMsg1));
              const metadatas: RootInput[] = selected.map(rootMocks(from, "filters"));
              const mocks: MockedDataReturn = mockedData?.(metadatas, connections ?? []) ?? [];
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
              const sucMsg = `tabulated ${data.length} Filters into ${getAlias(from)}filters`;
              setTimeout(() => store.dispatch(insertError(sucMsg)));
              const freight: StashPayload = {
                timestamp,
                content: data.map((item: DataRow) => ({
                  ...item,
                  id: item.id.toString(),
                  metadata: {
                    ...item.metadata,
                    owner: Boolean(item.metadata?.owner),
                  },
                })),
                approute: fromto,
              };
              return next(stashRows(freight));
            } else if (fromto.endsWith("instructions")) {
              const from = fromto.replace("instructions", "");
              const { incoming } = state.comms;
              const mockedData = entities.getProperty("instructions", "mockedData");
              const connections = entities.getProperty("instructions", "connections");
              const selected = incoming.filter(predicate0).map(ownerMolds);
              if (selected.length === 0) return next(insertError(errorMsg1));
              const metadatas: RootInput[] = selected.map(rootMocks(from, "instructions"));
              const mocks: MockedDataReturn = mockedData?.(metadatas, connections ?? []) ?? [];
              const data = mocks.map((mock: MockedDataReturnTypes) => mock as BaseEntityData & { purpose: string; instruction: string; details: string; imageurl: string; })
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
              const sucMsg = `tabulated ${data.length} Steps into ${getAlias(from)}steps`;
              setTimeout(() => store.dispatch(insertError(sucMsg)));
              const freight: StashPayload = {
                timestamp,
                content: data.map((item: DataRow) => ({
                  ...item,
                  id: item.id.toString(),
                  metadata: {
                    ...item.metadata,
                    owner: Boolean(item.metadata?.owner),
                  },
                })),
                approute: fromto,
              };
              return next(stashRows(freight));
            } else if (fromto.endsWith("sifters")) {
              const { outgoing } = state.comms;
              const from = fromto.replace("sifters", "");
              const mockedData = entities.getProperty("sifters", "mockedData");
              const connections = entities.getProperty("sifters", "connections");
              const selected = outgoing.filter(predicate2).map(ownerMolds);
              if (selected.length === 0) return next(insertError(errorMsg1));
              const metadatas: RootInput[] = selected.map(rootMocks(from, "sifters"));
              const mocks: MockedDataReturn = mockedData?.(metadatas, connections ?? []) ?? [];
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
              const sucMsg = `tabulated ${data.length} Sifters into ${getAlias(from)}sifters`;
              setTimeout(() => store.dispatch(insertError(sucMsg)));
              const freight: StashPayload = {
                timestamp,
                content: data.map((item: DataRow) => ({
                  ...item,
                  id: item.id.toString(),
                  metadata: {
                    ...item.metadata,
                    owner: Boolean(item.metadata?.owner),
                  },
                })),
                approute: fromto,
              };
              return next(stashRows(freight));
            } else if (fromto.endsWith("dashboards")) {
              const { outgoing } = state.comms;
              const from = fromto.replace("dashboards", "");
              const mockedData = entities.getProperty("dashboards", "mockedData");
              const connections = entities.getProperty("dashboards", "connections");
              const selected = outgoing.filter(predicate3).map(ownerMolds);
              if (selected.length === 0) return next(insertError(errorMsg1));
              const metadatas: RootInput[] = selected.map(rootMocks(from, "dashboards"));
              const mocks: MockedDataReturn = mockedData?.(metadatas, connections ?? []) ?? [];
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
              const sucMsg = `tabulated ${data.length} Dashboards into ${getAlias(from)}dashboards`;
              setTimeout(() => store.dispatch(insertError(sucMsg)));
              const freight: StashPayload = {
                timestamp,
                content: data.map((item: DataRow) => ({
                  ...item,
                  id: item.id.toString(),
                  metadata: {
                    ...item.metadata,
                    owner: Boolean(item.metadata?.owner),
                  },
                })),
                approute: fromto,
              };
              return next(stashRows(freight));
            }
            break;
          }
          default:
            return next(insertError(errorMsg3));
        }
        return next(action);
      }

      return next(action);
    };

export default RowsStasher; 