export { createLimitsService } from './limits-service';
export type { LimitsService, LimitsServiceDeps } from './limits-service';
export { applySpend, checkAgainst } from './check';
export type { CheckInput } from './check';
export { canUpgrade, nextTier, tierAtLeast, tierRank } from './kyc';
export type { CheckKind, LimitCheck, LimitReason, LimitsBus } from './types';
