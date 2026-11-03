import * as LocalAuthentication from 'expo-local-authentication';

export type RawAuthResult = { success: true } | { success: false; error: string; warning?: string };

export interface AuthenticateOptions {
  promptMessage: string;
  cancelLabel?: string;
  fallbackLabel?: string;
}

export interface BiometricAdapter {
  hasHardwareAsync(): Promise<boolean>;
  isEnrolledAsync(): Promise<boolean>;
  authenticateAsync(options: AuthenticateOptions): Promise<RawAuthResult>;
}

export const expoBiometrics: BiometricAdapter = {
  hasHardwareAsync: () => LocalAuthentication.hasHardwareAsync(),
  isEnrolledAsync: () => LocalAuthentication.isEnrolledAsync(),
  authenticateAsync: async (options) => {
    const result = await LocalAuthentication.authenticateAsync(options);
    return result.success
      ? { success: true }
      : { success: false, error: result.error, warning: result.warning };
  },
};
