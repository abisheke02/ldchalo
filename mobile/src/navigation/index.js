import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, ActivityIndicator } from 'react-native';

import useAuthStore from '../store/authStore';
import OfflineBanner from '../components/OfflineBanner';

// Auth
import LoginScreen from '../screens/auth/LoginScreen';

// School staff screens
import SchoolDashboard  from '../screens/school/DashboardScreen';
import AttendanceScreen from '../screens/school/AttendanceScreen';
import FeesScreen       from '../screens/school/FeesScreen';

// LD student screens
import StudentDashboard from '../screens/ld/StudentDashboard';
import PracticeScreen   from '../screens/ld/PracticeScreen';
import TestsScreen      from '../screens/ld/TestsScreen';
import MessagesScreen   from '../screens/ld/MessagesScreen';

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

const TAB_ICON = {
  Home:       '🏠',
  Attendance: '✅',
  Fees:       '💰',
  Practice:   '📚',
  Tests:      '📝',
  Messages:   '💬',
};

const tabOptions = (activeTint) => ({
  route, // eslint-disable-line
}) => ({
  headerShown:         false,
  tabBarIcon:          () => <Text style={{ fontSize: 20 }}>{TAB_ICON[route.name] || '📄'}</Text>,
  tabBarActiveTintColor:   activeTint,
  tabBarInactiveTintColor: '#9CA3AF',
  tabBarStyle:         { height: 58, paddingBottom: 6 },
  tabBarLabelStyle:    { fontSize: 11, fontWeight: '600' },
});

const SchoolTabs = () => (
  <Tab.Navigator screenOptions={tabOptions('#0891B2')}>
    <Tab.Screen name="Home"       component={SchoolDashboard}  options={{ tabBarLabel: 'Home' }} />
    <Tab.Screen name="Attendance" component={AttendanceScreen} options={{ tabBarLabel: 'Attendance' }} />
    <Tab.Screen name="Fees"       component={FeesScreen}       options={{ tabBarLabel: 'Fees' }} />
    <Tab.Screen name="Messages"   component={MessagesScreen}   options={{ tabBarLabel: 'Messages' }} />
  </Tab.Navigator>
);

const StudentTabs = () => (
  <Tab.Navigator screenOptions={tabOptions('#4F46E5')}>
    <Tab.Screen name="Home"     component={StudentDashboard} options={{ tabBarLabel: 'Home' }} />
    <Tab.Screen name="Practice" component={PracticeScreen}   options={{ tabBarLabel: 'Practice' }} />
    <Tab.Screen name="Tests"    component={TestsScreen}      options={{ tabBarLabel: 'Tests' }} />
    <Tab.Screen name="Messages" component={MessagesScreen}   options={{ tabBarLabel: 'Messages' }} />
  </Tab.Navigator>
);

export default function AppNavigator() {
  const { token, user, isLoading, init } = useAuthStore();

  useEffect(() => { init(); }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  const isSchool  = ['teacher', 'school_admin'].includes(user?.role);
  const isStudent = user?.role === 'student';
  const isParent  = user?.role === 'parent';

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!token ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : isSchool ? (
          <Stack.Screen name="SchoolApp" component={SchoolTabs} />
        ) : (isStudent || isParent) ? (
          <Stack.Screen name="StudentApp" component={StudentTabs} />
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
      <OfflineBanner />
    </NavigationContainer>
  );
}
