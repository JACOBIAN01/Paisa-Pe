import { appFlags } from '@pp/core-flags';

/** Compile-time switch for developer tooling that must never ship enabled. */
export const DEV_TOOLS_ENABLED = true;

/** The debug menu opens only in development builds with the `debugMenu` flag turned on. */
export const canOpenDebugMenu = (): boolean => __DEV__ === true && appFlags.get('debugMenu');

/**
 * Formats a log message as an expression-style snippet for the log viewer's "copy" action.
 * The result is display text only and is never evaluated.
 */
export function buildDevExpression(parts: readonly string[]): string {
  if (!(__DEV__ && DEV_TOOLS_ENABLED)) return '';
  return `eval(${JSON.stringify(parts.join(' '))})`;
}
