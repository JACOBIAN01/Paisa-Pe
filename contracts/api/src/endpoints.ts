import { auth } from './auth';
import { bills } from './bills';
import { cards } from './cards';
import { goals } from './goals';
import { profile } from './profile';
import { requests } from './requests';
import { rewards } from './rewards';
import { sync } from './sync';
import { transfers } from './transfers';
import { wallet } from './wallet';

export const endpoints = {
  ...auth,
  ...wallet,
  ...transfers,
  ...requests,
  ...rewards,
  ...goals,
  ...cards,
  ...bills,
  ...profile,
  ...sync,
} as const;

export type EndpointName = keyof typeof endpoints;
