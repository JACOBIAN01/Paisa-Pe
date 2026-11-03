import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { WalletProvider } from '../src/context/WalletContext';
import { FeatureProvider } from '../src/context/FeatureContext';

export default function RootLayout() {
  return <WalletProvider><FeatureProvider><StatusBar style="dark"/><Stack screenOptions={{headerShown:false}}/></FeatureProvider></WalletProvider>;
}
