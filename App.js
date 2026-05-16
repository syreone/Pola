import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import RootNavigator from './src/navigation/RootNavigator';
import { SplitPayProvider } from './src/data/SplitPayContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import GlobalPaymentOverlay from './src/components/GlobalPaymentOverlay';

function AppInner() {
  const { isDark } = useTheme();
  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <RootNavigator />
      <GlobalPaymentOverlay />
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <SplitPayProvider>
        <NavigationContainer>
          <AppInner />
        </NavigationContainer>
      </SplitPayProvider>
    </ThemeProvider>
  );
}
