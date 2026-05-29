import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialIcons';

import { useAuthStore } from '../store';

import LoginScreen      from '../screens/auth/LoginScreen';
import DashboardScreen  from '../screens/DashboardScreen';
import AttendanceScreen from '../screens/AttendanceScreen';
import StudentsScreen   from '../screens/StudentsScreen';
import FeesScreen       from '../screens/FeesScreen';
import ProfileScreen    from '../screens/ProfileScreen';

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#4F46E5',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: { paddingBottom: 6, height: 60 },
        tabBarIcon: ({ color, size }) => {
          const icons = {
            Dashboard:  'dashboard',
            Attendance: 'how-to-reg',
            Students:   'group',
            Fees:       'payments',
            Profile:    'person',
          };
          return <Icon name={icons[route.name] || 'circle'} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard"  component={DashboardScreen} />
      <Tab.Screen name="Attendance" component={AttendanceScreen} />
      <Tab.Screen name="Students"   component={StudentsScreen} />
      <Tab.Screen name="Fees"       component={FeesScreen} />
      <Tab.Screen name="Profile"    component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const { token } = useAuthStore();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {token ? (
        <Stack.Screen name="Main" component={MainTabs} />
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} />
      )}
    </Stack.Navigator>
  );
}
