import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from './ThemeContext';
import { onAuthStateChanged } from 'firebase/auth';

import { auth } from './firebaseConfig';
import HomeScreen from './screens/HomeScreen';
import ProfileScreen from './screens/ProfileScreen';
import LoginScreen from './screens/LoginScreen';
import SignupScreen from './screens/SignupScreen';
import ReportScreen from './screens/ReportScreen';
import { ThemeProvider } from './ThemeContext';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function MainApp() {
  const { theme } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Günlük') iconName = focused ? 'restaurant' : 'restaurant-outline';
          else if (route.name === 'Raporlar') iconName = focused ? 'stats-chart' : 'stats-chart-outline';
          else if (route.name === 'Profil') iconName = focused ? 'person' : 'person-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#e74c3c',
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: {
          paddingBottom: 5,
          height: 60,
          backgroundColor: theme.cardBg,
          borderTopColor: theme.border
        }
      })}
    >
      <Tab.Screen name="Günlük" component={HomeScreen} />
      <Tab.Screen name="Raporlar" component={ReportScreen} />
      <Tab.Screen name="Profil" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
    </Stack.Navigator>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" color="#e74c3c" /></View>;

  return (
    <ThemeProvider>
      <NavigationContainer>
        {user ? <MainApp /> : <AuthStack />}
      </NavigationContainer>
    </ThemeProvider>
  );
}