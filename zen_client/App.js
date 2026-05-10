import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider } from './src/contexts/AuthContext';
import { SocketProvider } from './src/contexts/SocketContext';
import { ChatProvider } from './src/contexts/ChatContext';

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <SocketProvider>
          <ChatProvider>
            <AppNavigator />
          </ChatProvider>
        </SocketProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
