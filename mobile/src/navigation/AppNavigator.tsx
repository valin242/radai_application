import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import SignupScreen from '../screens/SignupScreen.simple';
import LoginScreen from '../screens/LoginScreen.simple';
import OnboardingScreen from '../screens/OnboardingScreen';
import FeedManagementScreen from '../screens/FeedManagementScreen';
import PreferencesScreen from '../screens/PreferencesScreen';
import EpisodeListScreen from '../screens/EpisodeListScreen';
import AudioPlayerScreen from '../screens/AudioPlayerScreen';
import { onboardingApi } from '../utils/apiClient';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Bottom tab navigator for authenticated users
function MainTabs() {
  const insets = useSafeAreaInsets();
  
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: {
          backgroundColor: '#1E293B',
          borderTopColor: '#334155',
          borderTopWidth: 1,
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 8,
        },
        tabBarActiveTintColor: '#3B82F6',
        tabBarInactiveTintColor: '#94A3B8',
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        headerStyle: {
          backgroundColor: '#0F172A',
          borderBottomColor: '#334155',
          borderBottomWidth: 1,
        },
        headerTintColor: '#F1F5F9',
        headerTitleStyle: {
          fontSize: 20,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="Episodes"
        component={EpisodeListScreen}
        options={{
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="radio-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Feeds"
        component={FeedManagementScreen}
        options={{
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="newspaper-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Account"
        component={AccountScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Preferences"
        component={PreferencesScreen}
        options={{
          headerShown: false,
          tabBarIcon: ({ color, size}) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// Simple account screen with logout
function AccountScreen() {
  const { signOut, user } = useAuth();
  
  console.log('Current user in AccountScreen:', user);
  
  return (
    <View style={styles.accountContainer}>
      <Text style={styles.accountEmail}>{user?.email}</Text>
      <Text style={styles.accountInfo}>User ID: {user?.id}</Text>
      <TouchableOpacity style={styles.logoutButton} onPress={signOut}>
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function AppNavigator() {
  const { user, loading } = useAuth();
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);

  useEffect(() => {
    if (user) {
      checkOnboardingStatus();
    } else {
      setCheckingOnboarding(false);
      setOnboardingCompleted(false);
    }
  }, [user]);

  const checkOnboardingStatus = async () => {
    try {
      console.log('Checking onboarding status...');
      const status = await onboardingApi.getStatus();
      console.log('Onboarding status:', status);
      setOnboardingCompleted(status.onboardingCompleted);
    } catch (error) {
      console.error('Failed to check onboarding status:', error);
      // If check fails, assume onboarding is needed
      setOnboardingCompleted(false);
    } finally {
      setCheckingOnboarding(false);
    }
  };

  if (loading || (user && checkingOnboarding)) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          onboardingCompleted ? (
            <>
              <Stack.Screen name="Main" component={MainTabs} />
              <Stack.Screen name="AudioPlayer" component={AudioPlayerScreen} />
            </>
          ) : (
            <Stack.Screen 
              name="Onboarding" 
              component={OnboardingScreen}
              listeners={({ navigation }) => ({
                focus: () => {
                  // Re-check status when screen gains focus
                  // This will catch when onboarding is completed
                  setTimeout(() => checkOnboardingStatus(), 1000);
                },
              })}
            />
          )
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Signup" component={SignupScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F172A',
  },
  loadingText: {
    fontSize: 16,
    color: '#F1F5F9',
  },
  accountContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    padding: 32,
  },
  accountEmail: {
    fontSize: 18,
    color: '#F1F5F9',
    marginBottom: 16,
  },
  accountInfo: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 32,
  },
  logoutButton: {
    backgroundColor: '#EF4444',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  logoutText: {
    color: '#F1F5F9',
    fontSize: 16,
    fontWeight: '600',
  },
});
