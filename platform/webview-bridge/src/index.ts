export { createBridgeHandler } from './handler';
export type { BridgeDeps, BridgeEvent, BridgeHandler, BridgeResult } from './handler';
export { buildInitScript } from './init-script';
export {
  HELP_ORIGINS,
  SAFE_HELP_ROUTES,
  isAllowedOrigin,
  originOf,
  shouldStartLoad,
} from './origins';
