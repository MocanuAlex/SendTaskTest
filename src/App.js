import React, { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { onAuthStateChanged } from "firebase/auth";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemeProvider } from "./context/ThemeContext";
import { auth } from "./firebase-config";

import Login         from "./pages/Login";
import Register      from "./pages/Register";
import TodoPage      from "./pages/TodoPage";
import SentTasksPage from "./pages/SentTasksPage";
import StatisticsPage from "./pages/StatisticsPage";
import FocusPage     from "./pages/FocusPage";

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

const TabIcon = ({ emoji, focused }) => (
  <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>
);

function MainTabs() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = 60 + insets.bottom;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#1a202c",
          borderTopColor: "#2d3748",
          height: tabBarHeight,
          paddingBottom: insets.bottom + 4,
          paddingTop: 6,
        },
        tabBarActiveTintColor:   "#90cdf4",
        tabBarInactiveTintColor: "#718096",
        tabBarLabelStyle: { fontSize: 11, fontWeight: "700", marginTop: 2 },
      }}
    >
      <Tab.Screen
        name="Taskuri"
        component={TodoPage}
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="📋" focused={focused} /> }}
      />
      <Tab.Screen
        name="SentTasks"
        component={SentTasksPage}
        options={{
          tabBarLabel: "Trimise",
          tabBarIcon: ({ focused }) => <TabIcon emoji="📤" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Statistici"
        component={StatisticsPage}
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="📊" focused={focused} /> }}
      />
      <Tab.Screen
        name="Focus"
        component={FocusPage}
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="🍅" focused={focused} /> }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#2b6cb0" />
        <Text style={styles.loadingText}>Se încarcă SendTask...</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
    <ThemeProvider>
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <>
            <Stack.Screen name="MainTabs" component={MainTabs} />
            <Stack.Screen name="Login"    component={Login} />
            <Stack.Screen name="Register" component={Register} />
          </>
        ) : (
          <>
            <Stack.Screen name="Login"    component={Login} />
            <Stack.Screen name="Register" component={Register} />
            <Stack.Screen name="MainTabs" component={MainTabs} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
    </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#dbe2ea" },
  loadingText: { marginTop: 12, fontSize: 16, color: "#1a202c", fontWeight: "600" },
});
