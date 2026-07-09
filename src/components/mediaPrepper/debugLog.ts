const PREFIX = '[MediaPrepper]';

export function logStage(stage: string, message: string, data?: unknown): void {
  if (data !== undefined) {
    console.log(`${PREFIX} [${stage}] ${message}`, data);
    return;
  }
  console.log(`${PREFIX} [${stage}] ${message}`);
}

export function logError(stage: string, error: unknown, context?: Record<string, unknown>): void {
  // Use warn so dev error overlay doesn't treat diagnostic logs as uncaught runtime errors.
  console.warn(`${PREFIX} [${stage}] failed`, {
    error,
    context,
    message: error instanceof Error ? error.message : String(error),
    name: error instanceof Error ? error.name : typeof error,
    stack: error instanceof Error ? error.stack : undefined,
  });
}
