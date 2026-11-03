import * as ExpoLinking from 'expo-linking';

export interface LinkSubscription {
  remove(): void;
}

export interface LinkingAdapter {
  getInitialURL(): Promise<string | null>;
  addEventListener(type: 'url', handler: (event: { url: string }) => void): LinkSubscription;
}

export const expoLinking: LinkingAdapter = {
  getInitialURL: () => ExpoLinking.getInitialURL(),
  addEventListener: (type, handler) => ExpoLinking.addEventListener(type, handler),
};
