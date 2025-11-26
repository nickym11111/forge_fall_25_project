/*import React, { useEffect } from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Link, Tabs, router, useSegments} from 'expo-router';
import { Pressable, ActivityIndicator, View} from 'react-native';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useClientOnlyValue } from '@/components/useClientOnlyValue';
import { useAuth } from '../context/authContext';
// You can explore the built-in icon families and icons on the web at https://icons.expo.fyi/
function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>["name"];
  color: string;
}) {
  return <FontAwesome size={28} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const segments = useSegments();
  const { user, loading } = useAuth();

  useEffect(() => {
    // Wait for auth to finish loading before redirecting
    if (loading) return;

    const inTabs = segments[0] === '(tabs)';
    const onLoginPage = segments[1] === undefined;

    if (user && inTabs && onLoginPage) {
      const hasFridge = user.fridge_id !== null;
      if (hasFridge) {
        router.replace("/(tabs)/two");
      } else {
        router.replace("/(tabs)/create_fridge");
      }
    } else if (!user && inTabs && !onLoginPage) {
      router.replace("/(tabs)");
    }
  }, [user, loading, segments]);

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#F8F9FF",
        }}
      >
        <ActivityIndicator size="large" color="purple" />
      </View>
    );
  }

  // new
  const hasFridge = user?.fridge_id !== null;

  /*console.log("Layout:");
  console.log("  - user exists?", !!user);
  console.log("  - user.fridge_id:", user?.fridge_id);
  console.log("  - hasFridge:", hasFridge);
  console.log("  - Should show tabs?", user && hasFridge); */

  /*return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        // Disable the static render of the header on web
        // to prevent a hydration error in React Navigation v6.
        headerShown: false,
        //tabBarStyle: user ? undefined : { display: 'none' },
        tabBarStyle: (user && hasFridge) ? undefined : { display: 'none' }, //new
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Login Page',
          tabBarIcon: ({ color }) => <TabBarIcon name="code" color={color} />,
          tabBarButton: () => null,
          headerRight: () => (
            <Link href="/modal" asChild>
              <Pressable>
                {({ pressed }) => (
                  <FontAwesome
                    name="info-circle"
                    size={25}
                    color={Colors[colorScheme ?? 'light'].text}
                    style={{ marginRight: 15, opacity: pressed ? 0.5 : 1 }}
                  />
                )}
              </Pressable>
            </Link>
          ),
        }}
      />
      <Tabs.Screen
        name="two"
        options={{
          title: 'Fridge Page',
          tabBarIcon: ({ color }) => <TabBarIcon name="list" color={color} />,
        }}
      />
      <Tabs.Screen
        name="shop"
        options={{
          title: "Shared List",
          tabBarIcon: ({ color }) => <TabBarIcon name="list" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settle-up"
        options={{
          title: "Settle Up",
          tabBarIcon: ({ color }) => <TabBarIcon name="dollar" color={color} />,
        }}
      />
      <Tabs.Screen
        name="requests"
        options={{
          title: "Requests",
          tabBarIcon: ({ color }) => <TabBarIcon name="plus" color={color} />,
        }}
      />
    </Tabs>
  );
} */








import React, { useEffect } from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Link, Tabs, router, useSegments} from 'expo-router';
import { Pressable, ActivityIndicator, View} from 'react-native';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useClientOnlyValue } from '@/components/useClientOnlyValue';
import { useAuth } from '../context/authContext';

// You can explore the built-in icon families and icons on the web at https://icons.expo.fyi/
function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>["name"];
  color: string;
}) {
  return <FontAwesome size={28} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const segments = useSegments();
  const { user, loading } = useAuth();

  useEffect(() => {
    // Wait for auth to finish loading before redirecting
    if (loading) return;

    const inTabs = segments[0] === '(tabs)';
    const onLoginPage = segments[1] === undefined;

    if (user && inTabs && onLoginPage) {
      const hasFridge = user.fridge_id !== null && user.fridge_id !== undefined;
      const hasMultipleFridges = (user.fridge_count || 0) > 1;
      const hasSingleFridge = (user.fridge_count || 0) === 1;
      const needsSelection = (user.fridge_count || 0) > 0 && !user.active_fridge_id;

      console.log("  - hasFridge:", hasFridge);
      console.log("  - hasMultipleFridges:", hasMultipleFridges);
      console.log("  - hasSingleFridge:", hasSingleFridge); 
      console.log("  - needsSelection:", needsSelection);
      
      if (needsSelection) {
        console.log("  → Redirecting to select-fridge");
        router.replace("/(tabs)/select_fridge");
      } else if (hasFridge) {
        console.log("  → Redirecting to fridge items");
        router.replace("/(tabs)/two");
      } else {
        console.log("  → Redirecting to create fridge");
        router.replace("/(tabs)/create_fridge");
      }
    } else if (!user && inTabs && !onLoginPage) {
      router.replace("/(tabs)");
    }
  }, [user, loading, segments]);

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#F8F9FF",
        }}
      >
        <ActivityIndicator size="large" color="purple" />
      </View>
    );
  }

  const hasFridge = user?.fridge_id !== null && user?.fridge_id !== undefined;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarStyle: (user && hasFridge) ? undefined : { display: 'none' },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Login Page',
          tabBarIcon: ({ color }) => <TabBarIcon name="code" color={color} />,
          tabBarButton: () => null,
          headerRight: () => (
            <Link href="/modal" asChild>
              <Pressable>
                {({ pressed }) => (
                  <FontAwesome
                    name="info-circle"
                    size={25}
                    color={Colors[colorScheme ?? 'light'].text}
                    style={{ marginRight: 15, opacity: pressed ? 0.5 : 1 }}
                  />
                )}
              </Pressable>
            </Link>
          ),
        }}
      />
      <Tabs.Screen
        name="two"
        options={{
          title: 'Fridge Page',
          tabBarIcon: ({ color }) => <TabBarIcon name="list" color={color} />,
        }}
      />
      <Tabs.Screen
        name="shop"
        options={{
          title: "Shared List",
          tabBarIcon: ({ color }) => <TabBarIcon name="list" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settle-up"
        options={{
          title: "Settle Up",
          tabBarIcon: ({ color }) => <TabBarIcon name="dollar" color={color} />,
        }}
      />
      <Tabs.Screen
        name="requests"
        options={{
          title: "Requests",
          tabBarIcon: ({ color }) => <TabBarIcon name="plus" color={color} />,
        }}
      />
      <Tabs.Screen
        name="select_fridge"
        options={{
          title: "Select Fridge",
          tabBarButton: () => null,
        }}
      />
    </Tabs>
  );
}