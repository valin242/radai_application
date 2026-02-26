import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const Tab = createBottomTabNavigator();

// Simple test screens
function Screen1() {
  return (
    <View style={styles.screen}>
      <Text style={styles.text}>Screen 1</Text>
    </View>
  );
}

function Screen2() {
  return (
    <View style={styles.screen}>
      <Text style={styles.text}>Screen 2</Text>
    </View>
  );
}

function Screen3() {
  return (
    <View style={styles.screen}>
      <Text style={styles.text}>Screen 3</Text>
    </View>
  );
}

export default function DebugNavigator() {
  console.log('DebugNavigator rendering...');
  
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          tabBarStyle: {
            backgroundColor: '#1E293B',
            height: 70,
          },
          tabBarActiveTintColor: '#3B82F6',
          tabBarInactiveTintColor: '#94A3B8',
        }}
      >
        <Tab.Screen
          name="Tab1"
          component={Screen1}
          options={{
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="home" size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Tab2"
          component={Screen2}
          options={{
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="search" size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Tab3"
          component={Screen3}
          options={{
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="person" size={size} color={color} />
            ),
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F172A',
  },
  text: {
    fontSize: 24,
    color: '#F1F5F9',
  },
});
