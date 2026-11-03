import type {
  Autopay,
  AppNotification,
  BillDue,
  Biller,
  Card,
  Cashback,
  Contact,
  Coupon,
  Device,
  Goal,
  KycStatus,
  MoneyRequest,
  Paise,
  Preferences,
  Referral,
  ScratchCard,
  Session,
  SplitBill,
  Txn,
  User,
  UserId,
} from '@pp/contracts-domain';

export interface UserRecord {
  user: User;
  referral: Referral;
  kycState: KycStatus['state'];
}

export interface WalletRecord {
  balance: Paise;
  /** Increments on every balance change. */
  version: number;
}

export interface ContactRecord {
  ownerId: UserId;
  contact: Contact;
}

export interface TxnRecord extends Txn {
  ownerId: UserId;
}

export interface CouponRecord {
  ownerId: UserId;
  coupon: Coupon;
}

export interface ScratchRecord {
  ownerId: UserId;
  card: ScratchCard;
  prize: Paise;
}

export interface CashbackRecord {
  ownerId: UserId;
  cashback: Cashback;
}

export interface GoalRecord {
  ownerId: UserId;
  goal: Goal;
}

export interface CardRecord {
  ownerId: UserId;
  card: Card;
  pan: string;
  cvv: string;
}

export interface DueRecord {
  ownerId: UserId;
  due: BillDue;
}

export interface AutopayRecord {
  ownerId: UserId;
  autopay: Autopay;
}

export interface NotificationRecord {
  ownerId: UserId;
  notification: AppNotification;
}

export interface DeviceRecord {
  ownerId: UserId;
  device: Omit<Device, 'current'>;
}

export interface SessionRecord {
  session: Session;
  revoked: boolean;
  refreshExpiresAt: number;
}

export interface OtpRecord {
  otpId: string;
  phone: string;
  code: string;
  createdAt: number;
  expiresAt: number;
  attempts: number;
  consumed: boolean;
}

export interface IdempotencyRecord {
  bodyHash: string;
  status: number;
  body: unknown;
  expiresAt: number;
}

export interface DbTables {
  users: Map<UserId, UserRecord>;
  wallets: Map<UserId, WalletRecord>;
  contacts: ContactRecord[];
  txns: TxnRecord[];
  requests: MoneyRequest[];
  splits: SplitBill[];
  coupons: CouponRecord[];
  scratchCards: ScratchRecord[];
  cashbacks: CashbackRecord[];
  goals: GoalRecord[];
  cards: CardRecord[];
  billers: Biller[];
  dues: DueRecord[];
  autopay: AutopayRecord[];
  notifications: NotificationRecord[];
  preferences: Map<UserId, Preferences>;
  devices: Map<string, DeviceRecord>;
  sessions: Map<string, SessionRecord>;
  accessIndex: Map<string, string>;
  refreshIndex: Map<string, string>;
  usedRefresh: Map<string, string>;
  otps: Map<string, OtpRecord>;
  idempotency: Map<string, IdempotencyRecord>;
}

export type TableName = keyof DbTables;

export interface DbMeta {
  seed: number;
  rngState: number;
  lastStamp: number;
  counters: Record<string, number>;
}
