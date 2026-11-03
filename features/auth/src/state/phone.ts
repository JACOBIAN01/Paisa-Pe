const INDIAN_MOBILE = /^[6-9]\d{9}$/;

export const toDigits = (input: string): string => input.replace(/\D/g, '').slice(0, 10);
export const isValidMobile = (digits: string): boolean => INDIAN_MOBILE.test(digits);
export const toE164 = (digits: string): string => `+91${digits}`;
export const maskPhone = (phone: string): string =>
  phone.length > 6
    ? `${phone.slice(0, 3)}${'•'.repeat(phone.length - 6)}${phone.slice(-3)}`
    : phone;
