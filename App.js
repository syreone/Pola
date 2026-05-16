import 'react-native-get-random-values';
import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import RootNavigator from './src/navigation/RootNavigator';
import { SplitPayProvider } from './src/data/SplitPayContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import GlobalPaymentOverlay from './src/components/GlobalPaymentOverlay';
import LoadingScreen from './src/screens/LoadingScreen';

function AppInner() {
  const { isDark } = useTheme();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 1800);
    return () => clearTimeout(t);
  }, []);

  if (!ready) return <LoadingScreen />;

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
      <GlobalPaymentOverlay />
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <SplitPayProvider>
        <AppInner />
      </SplitPayProvider>
    </ThemeProvider>
  );
}
