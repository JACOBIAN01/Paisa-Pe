import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { WalletProvider } from '../src/context/WalletContext';

export default function RootLayout() {
  return <WalletProvider><StatusBar style="dark"/><Stack screenOptions={{headerShown:false}}/></WalletProvider>;
}
