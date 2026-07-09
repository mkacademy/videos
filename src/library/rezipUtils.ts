import {
  dashboardTypes,
  filterTypes,
  instructionTypes,
  OutgoingMessage,
  sifterTypes,
  typesToRoutes,
} from './commsUtils';
import { Metadata } from '../components/Core/types';
import {
  updateCourses,
  updateQuizzes,
  updateSteps,
  updateTutorials,
  UpdatePayload,
} from './actions';

export const rezipErrorNoSelection = 'Re-zip requires exactly one outgoing message selected.';
export const rezipErrorNotOwned = "Selected message isn't yours.";
export const rezipErrorUnsupportedType = 'Unsupported outgoing message type for re-zip.';
export const rezipErrorNoRecipients = 'Selected outgoing message has no recipients.';
export const rezipErrorNoZipData = 'Re-zip failed: no zip data produced.';
export const rezipErrorMessageMissing = 'Re-zip failed: selected message not found.';

export const isOwnedOutgoingMessage = (metadata: Metadata[] | undefined): boolean =>
  Array.isArray(metadata) && metadata.some((entry) => entry.owner === true);

export const outgoingMessageKey = (message: Pick<OutgoingMessage, 'id' | 'type'>): string =>
  `${message.id}${message.type}`;

export const parseOutgoingFromTo = (type: string): { from: string; to: string } | null => {
  const route = typesToRoutes[type];
  if (!route) return null;
  const match = route.match(/^(bosses|minions|underbosses)(filters|sifters|dashboards|instructions)$/);
  if (!match) return null;
  return { from: match[1], to: match[2] };
};

export const getOutgoingUpdateAction = (type: string) => {
  if (filterTypes.includes(type)) return updateTutorials;
  if (sifterTypes.includes(type)) return updateCourses;
  if (dashboardTypes.includes(type)) return updateQuizzes;
  if (instructionTypes.includes(type)) return updateSteps;
  return null;
};

export const getRezipOutgoingMessage = (
  outgoing: OutgoingMessage[],
): { message: OutgoingMessage; from: string; to: string } | { error: string } => {
  const selected = outgoing.filter((message) => message.isHighlighted);
  if (selected.length !== 1) return { error: rezipErrorNoSelection };
  const message = selected[0];
  if (!isOwnedOutgoingMessage(message.metadata)) return { error: rezipErrorNotOwned };
  const route = parseOutgoingFromTo(message.type);
  if (!route) return { error: rezipErrorUnsupportedType };
  const targets = message.targets ?? [];
  if (targets.length === 0) return { error: rezipErrorNoRecipients };
  return { message, ...route };
};

type OutgoingZipUpdate = UpdatePayload & { purpose: string; isModified: true };

export const buildOutgoingZipUpdate = (id: number, purpose: string): OutgoingZipUpdate => ({
  id,
  purpose,
  isModified: true,
});
