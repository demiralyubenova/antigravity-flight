/**
 * App entry point - mirrors web's App.tsx structure
 * AuthProvider wraps the entire app, navigation handles routing
 */
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/hooks/useAuth';
import AppNavigation from './src/navigation/AppNavigation';

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="auto" />
        <AppNavigation />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
