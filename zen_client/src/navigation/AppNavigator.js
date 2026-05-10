import React, { useContext, useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, Sparkles, Shield } from 'lucide-react-native';
import { View, ActivityIndicator } from 'react-native';

import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import MomentsScreen from '../screens/MomentsScreen';
import ChatScreen from '../screens/ChatScreen';
import MomentViewer from '../screens/MomentViewer';
import AdminScreen from '../screens/AdminScreen';

import { COLORS } from '../theme';
import { AuthContext } from '../contexts/AuthContext';
import { addNotificationResponseListener } from '../services/notifications';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs({ navigation }) {
  const { user } = useContext(AuthContext);
  const isMaster = user?.role === 'master_admin' || user?.role === 'co_admin';

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopColor: COLORS.border,
          height: 58,
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          marginBottom: 4,
        },
      }}
    >
      <Tab.Screen
        name="Chats"
        component={HomeScreen}
        options={{ tabBarIcon: ({ color, size }) => <Home color={color} size={size - 2} /> }}
      />

      {isMaster && (
        <Tab.Screen
          name="Admin"
          component={AdminScreen}
          options={{ tabBarIcon: ({ color, size }) => <Shield color={color} size={size - 2} /> }}
        />
      )}
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { user, loading } = useContext(AuthContext);
  const navRef = useRef(null);

  useEffect(() => {
    let sub;
    try {
      sub = addNotificationResponseListener((data) => {
        if (data?.chatId && navRef.current) {
          navRef.current.navigate('ChatScreen', {
            chatId: data.chatId,
            chatName: 'Chat',
          });
        }
      });
    } catch (err) {
      console.warn('Failed to setup notification listener:', err);
    }
    return () => {
      try {
        sub?.remove?.();
      } catch (err) {}
    };
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navRef}>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'none' }}>
        {user ? (
          <>
            <Stack.Screen name="MainTabs" component={MainTabs} />
            <Stack.Screen name="ChatScreen" component={ChatScreen} />
            <Stack.Screen
              name="MomentViewer"
              component={MomentViewer}
              options={{ animation: 'none', presentation: 'fullScreenModal' }}
            />
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
