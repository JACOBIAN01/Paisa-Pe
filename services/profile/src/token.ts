import { createToken } from '@pp/core-di';
import type { ProfileService } from './profile-service';

export const PROFILE_SERVICE = createToken<ProfileService>('profile-service');
