import React, { useEffect } from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Link, Tabs, router, useSegments} from 'expo-router';
import { Pressable } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useClientOnlyValue } from '@/components/useClientOnlyValue';
import { useAuth } from '../context/authContext'; 


/*// You can explore the built-in icon families and icons on the web at https://icons.expo.fyi/
function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={28} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const segments = useSegments();
  const { user, loading } = useAuth();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        // Disable the static render of the header on web
        // to prevent a hydration error in React Navigation v6.
        headerShown: false,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Login Page',
          tabBarIcon: ({ color }) => <TabBarIcon name="code" color={color} />,
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
    </Tabs>
  );
} */


// You can explore the built-in icon families and icons on the web at https://icons.expo.fyi/
function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
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
        router.replace('/(tabs)/two');
      } else {
        router.replace('/(tabs)/create_fridge');
      }
    }
    else if (!user && inTabs && !onLoginPage) {
      router.replace('/(tabs)');
    }
  }, [user, loading, segments]);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        // Disable the static render of the header on web
        // to prevent a hydration error in React Navigation v6.
        headerShown: false,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Login Page',
          tabBarIcon: ({ color }) => <TabBarIcon name="code" color={color} />,
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

<<<<<<< Updated upstream
      <Tabs.Screen
        name="shop"
        options={{
          title: "Shared List",
          tabBarIcon: ({ color }) => <TabBarIcon name="list" color={color} />,
        }}
      />
      
      <Tabs.Screen
        name="create_fridge"
        options={{
          title: "Create Fridge",
          tabBarIcon: ({ color }) => <TabBarIcon name="plus" color={color} />,
        }}
      />
    </Tabs>
  );
=======
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
>>>>>>> Stashed changes
}
