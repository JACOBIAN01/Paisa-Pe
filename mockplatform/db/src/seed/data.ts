import type { KycTier, Language } from '@pp/contracts-domain';

export const PRIMARY_USER_ID = 'usr_001';
export const DEMO_OTP = '123456';

export interface DemoUser {
  id: string;
  name: string;
  phone: string;
  tier: KycTier;
  language: Language;
}

export const DEMO_USERS: readonly DemoUser[] = [
  { id: 'usr_001', name: 'Aarav Sharma', phone: '+919800000001', tier: 'basic', language: 'en' },
  { id: 'usr_002', name: 'Diya Patel', phone: '+919800000002', tier: 'full', language: 'en' },
  { id: 'usr_003', name: 'Rohan Mehta', phone: '+919800000003', tier: 'basic', language: 'hi' },
  { id: 'usr_004', name: 'Ananya Iyer', phone: '+919800000004', tier: 'min', language: 'en' },
  { id: 'usr_005', name: 'Vikram Singh', phone: '+919800000005', tier: 'full', language: 'hi' },
  { id: 'usr_006', name: 'Meera Nair', phone: '+919800000006', tier: 'basic', language: 'en' },
  { id: 'usr_007', name: 'Kabir Khan', phone: '+919800000007', tier: 'min', language: 'hi' },
  { id: 'usr_008', name: 'Ishita Bose', phone: '+919800000008', tier: 'basic', language: 'bn' },
];

export const EXTERNAL_NAMES: readonly string[] = [
  'Neha Kapoor',
  'Arjun Reddy',
  'Sana Qureshi',
  'Tanvi Joshi',
  'Manish Gupta',
  'Pooja Verma',
  'Rahul Desai',
  'Kavya Menon',
  'Sourav Das',
  'Nikhil Rao',
  'Aditi Chatterjee',
  'Imran Sheikh',
  'Lakshmi Pillai',
  'Harsh Vora',
  'Priya Bhatt',
  'Siddharth Jain',
  'Ritu Agarwal',
  'Farhan Ali',
  'Deepa Krishnan',
  'Gaurav Malhotra',
  'Shreya Ghosh',
  'Yash Thakur',
  'Bhavna Shah',
  'Karan Oberoi',
  'Mitali Sen',
  'Omkar Patil',
  'Zoya Ansari',
  'Dev Kulkarni',
  'Rina Sethi',
  'Tarun Bansal',
];

export const AVATAR_COLORS: readonly string[] = [
  '#E57373',
  '#F06292',
  '#BA68C8',
  '#7986CB',
  '#4FC3F7',
  '#4DB6AC',
  '#81C784',
  '#FFB74D',
];

export const LOCK_TIMEOUT_DEFAULT = 60;
export const phoneOf = (index: number, base: string): string =>
  `+91${base}${String(index).padStart(8, '0')}`;
