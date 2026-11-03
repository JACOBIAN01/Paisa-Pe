export const groupPan = (pan: string): string => pan.replace(/(\d{4})(?=\d)/g, '$1 ');

export const maskedPan = (last4: string): string => `•••• •••• •••• ${last4}`;

export const NETWORK_LABEL = { rupay: 'RuPay', visa: 'VISA' } as const;
