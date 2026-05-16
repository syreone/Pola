import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ConnectWalletScreen from '../screens/ConnectWalletScreen';
import MainTabs from './MainTabs';
import RequestMoneyScreen from '../screens/RequestMoneyScreen';
import SendMoneyScreen from '../screens/SendMoneyScreen';
import SplitBillScreen from '../screens/SplitBillScreen';
import SplitDashboardScreen from '../screens/SplitDashboardScreen';
import SuccessScreen from '../screens/SuccessScreen';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ConnectWallet" component={ConnectWalletScreen} />
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen name="RequestMoney" component={RequestMoneyScreen} />
      <Stack.Screen name="SendMoney" component={SendMoneyScreen} />
      <Stack.Screen name="SplitBill" component={SplitBillScreen} />
      <Stack.Screen name="SplitDashboard" component={SplitDashboardScreen} />
      <Stack.Screen name="Success" component={SuccessScreen} />
    </Stack.Navigator>
  );
}
