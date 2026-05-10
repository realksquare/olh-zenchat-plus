import React, { useContext, useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider, AuthContext } from './src/contexts/AuthContext';
import { SocketProvider } from './src/contexts/SocketContext';
import { ChatProvider } from './src/contexts/ChatContext';
import { registerForPushNotifications } from './src/services/notifications';

function AppWithFCM() {
  const { user } = useContext(AuthContext);

  useEffect(() => {
    if (user) {
      registerForPushNotifications();
    }
  }, [user]);

  return <AppNavigator />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <SocketProvider>
          <ChatProvider>
            <AppWithFCM />
          </ChatProvider>
        </SocketProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
