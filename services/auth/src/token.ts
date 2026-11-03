import { createToken } from '@pp/core-di';
import type { AuthService } from './auth-service';
import type { PinService } from './pin-service';

export const AUTH_SERVICE = createToken<AuthService>('auth-service');
export const PIN_SERVICE = createToken<PinService>('pin-service');
