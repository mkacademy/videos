import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import { willLoadingEnforceMinDelay } from './loadingRouteUtils';

export const MIN_LAZY_LOAD_DELAY_MS = 2_000;

export function lazyWithMinDelay<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  minDelayMs = MIN_LAZY_LOAD_DELAY_MS,
): LazyExoticComponent<T> {
  return lazy(() => {
    const startedAt = Date.now();
    const effectiveMinDelay = willLoadingEnforceMinDelay() ? 0 : minDelayMs;
    return factory().then((module) => {
      const remaining = Math.max(0, effectiveMinDelay - (Date.now() - startedAt));
      if (remaining === 0) return module;
      return new Promise<{ default: T }>((resolve) => {
        setTimeout(() => resolve(module), remaining);
      });
    });
  });
}
