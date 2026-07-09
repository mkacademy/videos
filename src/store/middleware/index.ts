import { Middleware } from '@reduxjs/toolkit';
import UiuxManager from './UiuxManager';
import CrudsManager from './CrudsManager123';
import OrphansManager from './OrphansManager456';
import RowsStasher from './RowsStasherABC';
import RowsExtractor from './RowsExtractorDEF';
import EncodingManager from './EncodingManagerGHI';
import ContentExtractor from './ContentExtractorJKL';
import cascadingUnstasher from './cascadingUnstasher.ts';
import updateStepsImageurlGuard from './updateStepsImageurlGuard';
import VisibilityManager from './VisibilityManagerMNO';
import BlobsManager from './BlobsManagerPQR';
import ViewManager from './ViewManagerSTU';
import FilesManager from './FilesManagerVWX';
import UrlDataMatcher, { InsertGUID } from './UrlDataMatcherYZA';
import MoldsExtractor, { MetaDatasQuery, InteractionsInitilizer } from './MoldsExtractorBCD';
import NavigationTracker from './NavigationTrackerEFG';
import RequestsTracker from './RequestsTrackerHIJ';
import IncommingSender from './IncommingSenderKLM';
import HierachyMonitor from './HierachyMonitorNOP';
import MessageReader from './MessageReaderQRS';
import MessageSender from './MessageSenderTUV';
import HierachyManager from './HierachyManagerWXY';
import AbilityManager from './AbilityManagerZAB';
import QuotaManager from './QuotaManagerCDE';
import FilterTagsManager from './FilterTagsManagerFGH';
import settingsInitializer from './settingsInitializerIJK';
import FilterTagsExtractor from './FilterTagsExtractorLMN';
import DismissalsManager from './DismissalsManagerOPQ';
import StatusManager from './StatusManagerRST';
import RowsCacher from './RowsCacherUVW';
import controlPanel from './controlPanelXYZ';
import SaveQueuesManager from './saveQueuesManager';
import DeletionManager from './DeletionManager1234';
import AdditionManager from './AdditionManager9012';
import InsertionManager from './InsertionManager5678';
import OrdinalsManager from './OrdinalsManager';
import UpdateManager from './UpdateManager9ABC';
import AccountMimicor from './AccountMimicorDEFG';
import { statsMiddleware } from './statsMiddleware';
import { cacheTotalsMiddleware } from './cacheTotalsMiddleware';
import { commentsMiddleware } from './commentsMiddleware';
import HarvestManager from './HarvestManager';
import HydrationManager from './HydrationManager';
import TreesManager from './TreesManager';
import PublishManager from './publishManager';
import OwnershipManager from './ownershipManager';
import DismissAllExceptOne from './DismissAllExceptOne';
import RangeSelectionOrReorderManger from './RangeSelectionOrReorderManger';
import TabulatorOrdering from './TabulatorOrdering';

// Define the middleware chain before Redux Thunk
export const preThunkMiddleware: Middleware[] = [
  statsMiddleware,
  cacheTotalsMiddleware,
  commentsMiddleware,
  UiuxManager,
  CrudsManager,
  OrphansManager,
  RowsStasher,
  RowsExtractor,
  EncodingManager,
  updateStepsImageurlGuard,
  cascadingUnstasher,
  ContentExtractor,
  VisibilityManager,
  BlobsManager,
  ViewManager,
];

// Define the middleware chain after Redux Thunk
export const postThunkMiddleware: Middleware[] = [
  InsertGUID,
  FilesManager,
  UrlDataMatcher,
  MetaDatasQuery,
  InteractionsInitilizer,
  MoldsExtractor,
  NavigationTracker,
  RequestsTracker,
  IncommingSender,
  HierachyMonitor,
  MessageReader,
  MessageSender,
  HierachyManager,
  AbilityManager,
  QuotaManager,
  FilterTagsManager,
  settingsInitializer,
  FilterTagsExtractor,
  DismissalsManager,
  StatusManager,
  RowsCacher,
  controlPanel,
  SaveQueuesManager,
  DeletionManager,
  AdditionManager,
  InsertionManager,
  HarvestManager,
  OwnershipManager,
  OrdinalsManager,
  UpdateManager,
  AccountMimicor,
  HydrationManager,
  PublishManager,
  TreesManager,
  RangeSelectionOrReorderManger,
  TabulatorOrdering,
  DismissAllExceptOne,
];