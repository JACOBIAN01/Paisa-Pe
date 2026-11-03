import { createLogger } from '@pp/core-logging';
import { expoBiometrics, type BiometricAdapter } from './adapter';
import { mapAuthResult, type BiometricOutcome } from './outcome';

const log = createLogger('biometrics');

export interface BiometricPrompt {
  message: string;
  cancelLabel?: string;
  fallbackLabel?: string;
}

export async function isBiometricAvailable(
  adapter: BiometricAdapter = expoBiometrics,
): Promise<boolean> {
  try {
    return (await adapter.hasHardwareAsync()) && (await adapter.isEnrolledAsync());
  } catch {
    return false;
  }
}

export async function authenticateBiometric(
  prompt: string | BiometricPrompt,
  adapter: BiometricAdapter = expoBiometrics,
): Promise<BiometricOutcome> {
  const options = typeof prompt === 'string' ? { message: prompt } : prompt;
  try {
    if (!(await adapter.hasHardwareAsync())) return 'unavailable';
    if (!(await adapter.isEnrolledAsync())) return 'not_enrolled';
    const raw = await adapter.authenticateAsync({
      promptMessage: options.message,
      cancelLabel: options.cancelLabel,
      fallbackLabel: options.fallbackLabel,
    });
    return mapAuthResult(raw);
  } catch (error) {
    log.warn('biometric prompt threw', { error: String(error) });
    return 'failed';
  }
}
