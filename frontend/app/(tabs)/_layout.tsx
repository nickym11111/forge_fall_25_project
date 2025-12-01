import React, { useEffect } from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Link, Tabs, router, useSegments} from 'expo-router';
import { Pressable, ActivityIndicator, View, Platform} from 'react-native';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useClientOnlyValue } from '@/components/useClientOnlyValue';
import { useAuth } from '../context/authContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';

function TabBarIcon(props: {
  //name: React.ComponentProps<typeof FontAwesome>["name"];
  name: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  color: string;
  focused: boolean;
}) {
  return  (
    <MaterialCommunityIcons
      size={26}
      style={{ marginBottom: -2 }}
      {...props}
    />
  );
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
      /*const hasFridge = user.fridge_id !== null && user.fridge_id !== undefined;
      const hasMultipleFridges = (user.fridge_count || 0) > 1;
      const hasSingleFridge = (user.fridge_count || 0) === 1;
      const needsSelection = (user.fridge_count || 0) > 0 && !user.active_fridge_id; */

      const hasActiveFridge = user.active_fridge_id !== null && user.active_fridge_id !== undefined;
      const hasFridges = (user.fridge_count || 0) > 0;
      const needsSelection = hasFridges && !hasActiveFridge;
      
      if (needsSelection) {
        router.replace("/(tabs)/select_fridge");
      } else if (hasActiveFridge) {
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

  const hasFridge = user?.active_fridge_id !== null && user?.active_fridge_id !== undefined;

  return (
    <Tabs
    screenOptions={{
      tabBarActiveTintColor: '#14b8a6',
      tabBarInactiveTintColor: '#94a3b8',
      tabBarShowLabel: false,
      headerShown: false,
      tabBarStyle: (user && hasFridge) ? {
        backgroundColor: '#ffffff',
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0',
        height: Platform.OS === 'ios' ? 88 : 70,
        paddingBottom: Platform.OS === 'ios' ? 28 : 10,
        paddingTop: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 8,
      } : { display: 'none' },
      }}>
    <Tabs.Screen
          name="index"
          options={{
            // start of ploy change being merged in on 11/26
            tabBarIcon: ({ color, focused }) => (
              <TabBarIcon name={focused ? 'home' : 'home-outline'} color={color} focused={focused} />
            ),
            tabBarButton: () => null,
          }}
          />
    <Tabs.Screen
      name="two"
      options={{
        tabBarIcon: ({ color, focused }) => (
          <TabBarIcon name={focused ? 'fridge' : 'fridge-outline'} color={color} focused={focused} />
        ),
      }}
    />
    <Tabs.Screen
      name="shop"
      options={{
        tabBarIcon: ({ color, focused }) => (
          <TabBarIcon name={focused ? 'cart' : 'cart-outline'} color={color} focused={focused} />
        ),
      }}
    />
    <Tabs.Screen
      name="parse_receipt"
      options={{
        tabBarIcon: ({ color, focused }) => (
          <TabBarIcon name={focused ? 'camera' : 'camera-outline'} color={color} focused={focused} />
        ),
      }}
    />
    <Tabs.Screen
      name="add-item"
      options={{
        tabBarIcon: ({ color, focused }) => (
          <TabBarIcon name={focused ? 'plus-circle' : 'plus-circle-outline'} color={color} focused={focused} />
        ),
      }}
    />

    <Tabs.Screen
            name="select_fridge"
            options={{
              title: "Select Fridge",
              href: null
            }}
          />
          
    <Tabs.Screen
      name="create_fridge"
      options={{
        href: null,
      }}
    />
    <Tabs.Screen
      name="Join-Fridge"
      options={{
        href: null,
      }}
    />
    <Tabs.Screen
    name="settle-up"
    options={{
      title: "Settle Up",
      tabBarIcon: ({ color, focused }) => (
        <TabBarIcon name="link" color={color} focused={focused} /> // reassign to dollar logo
      ),
    }}
    />
    <Tabs.Screen
    name="requests"
    options={{
      href: null,
      title: "Requests",
      tabBarIcon: ({ color, focused }) => (
        <TabBarIcon
          name={focused ? "plus" : "plus-outline"}
          color={color}
          focused={focused}
    />
  ),
}}
/>
    <Tabs.Screen
    name="recipes"
    options={{
      title: "Recipes",
      tabBarIcon: ({ color, focused }) => (
        <TabBarIcon
          name={"chef-hat"}
          color={color}
          focused={focused}
    />
  ),
}}
/>
    <Tabs.Screen
    name="favorite_recipes"
    options={{
      title: "Favorite Recipes",
      tabBarIcon: ({ color, focused }) => (
        <TabBarIcon
          name={focused ? "heart-circle" : "heart-circle-outline"}
          color={color}
          focused={focused}
    />
  ),
}}
    />
        </Tabs>
        
      );
}
