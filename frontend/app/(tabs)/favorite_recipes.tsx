import {
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { router } from 'expo-router';
import { Text, View } from "@/components/Themed";
import React, { useState, useRef, useCallback } from "react";
import { supabase } from "../utils/client";
import { useAuth } from "../context/authContext";
import CustomHeader from "@/components/CustomHeader";
import ProfileIcon from "@/components/ProfileIcon";
import { useFocusEffect } from "@react-navigation/native";

const API_URL = `${process.env.EXPO_PUBLIC_API_URL}`; // Backend API endpoint

interface FridgeMate {
  first_name?: string;
  last_name?: string;
  name?: string;
  email?: string;
}

// Updated to match backend response
interface RecipeItem {
  id: number;
  recipe_name: string;
  added_by?: FridgeMate | null;
}

// Defines props type for the Item component
interface ItemProps {
  recipe_name: string;
  added_by?: FridgeMate | null;
}

// Individual item component
const Item = ({
  recipe_name,
  added_by
}: ItemProps) => {
  // Handle different name formats from backend
  const getDisplayName = (mate: FridgeMate) => {
    if (mate.first_name && mate.last_name) {
      return `${mate.first_name} ${mate.last_name}`;
    }
    if (mate.first_name) return mate.first_name;
    if (mate.last_name) return mate.last_name;
    if (mate.name) return mate.name;
    if (mate.email) {
      // Use email prefix as fallback
      return mate.email.split('@')[0];
    }
    return "Unknown";
  };

  const addedByName = added_by ? getDisplayName(added_by) : "Unknown";

  return (
    <View style={styles.item}>
      <Text style={[styles.itemText]}>
        <Text style={{ fontWeight: "bold" }}>{recipe_name}</Text>
      </Text>
      <Text style={[styles.itemText, { fontSize: 10 }]}>
        |<Text style={{ fontWeight: "bold" }}> Added by</Text> {addedByName}
      </Text>
    </View>
  );
};

export default function TabOneScreen() {
  const{ user } = useAuth();
  const [data, setData] = useState<RecipeItem[]>([]);
  const originalHolder = useRef<RecipeItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  // Auto-refresh when tab is focused
  useFocusEffect(
    useCallback(() => {
      fetchRecipeItems();
    }, [])
  );

  const fetchRecipeItems = async () => {
    try {
      setLoading(true);
      console.log("Fetching data from:", `${API_URL}/get-favorite-recipes/`);

      const { data: { session }, error } = await supabase.auth.getSession();

      if (error || !session) {
        setData([]);
        originalHolder.current = [];
        setError("");
        throw new Error("You must be logged in to view recipe items");
      }

      console.log("User ID:", user?.id);

      const response = await fetch(`${API_URL}/get-favorite-recipes/`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log("API Response:", result);

      if (result.message === "User has no fridge assigned") {
        setData([]);
        originalHolder.current = [];
        setError("NO_FRIDGE");
        return;
      }

      setData(result.data);
      originalHolder.current = result.data;
      setError("");
    } catch (err) {
      console.error("Error fetching items:", err);
      setError(`${err}`);
      setData([]);
      originalHolder.current = [];
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Manual refresh handler
  const onRefresh = () => {
    setRefreshing(true);
    fetchRecipeItems();
  };

  // Loading state
  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: "center" }]}>
        <ActivityIndicator size="large" color="purple" />
        <Text style={{ marginTop: 10 }}>Loading fridge items...</Text>
      </View>
    );
  }

  if (error === "NO_FRIDGE") {
    return (
      <View style={{width: '100%', height: '100%'}}>
        <CustomHeader title="Favorite Recipes" />
        <ProfileIcon className="profileIcon" />
        <View style={[styles.container, { justifyContent: "center" }]}>
          <Text style={{ fontSize: 18, textAlign: "center", padding: 20, color: "#666" }}>
            You haven't joined a fridge yet!
          </Text>
          <Text style={{ fontSize: 14, textAlign: "center", paddingHorizontal: 20, color: "#999" }}>
            Create or join a fridge to start tracking your food items.
          </Text>
          <TouchableOpacity
            style={[styles.filter_button, { marginTop: 20, alignSelf: "center", minWidth: "60%" }]}
            onPress={() => {
              router.push("/(tabs)/create_fridge");
            }}
          >
            <Text style={styles.buttonLabel}>Create or Join a Fridge</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={[styles.container, { justifyContent: "center" }]}>
        <Text style={{ color: "red", textAlign: "center", padding: 20 }}>
          {error}
        </Text>
        <TouchableOpacity
          style={styles.filter_button}
          onPress={fetchRecipeItems}
        >
          <Text style={styles.buttonLabel}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (data.length === 0) {
    return (
      <View style={{width: '100%', height: '100%'}}>
        <CustomHeader title="Favorite Recipes" />
        <ProfileIcon className="profileIcon" />
        <View style={[styles.container, { justifyContent: "center" }]}>
          <Text style={{ fontSize: 18, textAlign: "center", padding: 20, color: "#666" }}>
            Your fridge is empty!
          </Text>
          <Text style={{ fontSize: 14, textAlign: "center", paddingHorizontal: 20, color: "#999" }}>
            Add some items to get started.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{
      width: '100%', height: '100%',
    }}>
      <CustomHeader title="Favorite Recipes" />
      <ProfileIcon className="profileIcon" />
    <View style={styles.container}>
      
      <View
        style={styles.separator}
        lightColor="#eee"
        darkColor="rgba(255,255,255,0.1)"
      />
      <FlatList
        data={data}
        renderItem={({ item }) => (
          <Item
            recipe_name={item.recipe_name}
            added_by={item.added_by}
          />
        )}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["purple"]}
            tintColor="purple"
          />
        }
      />
    </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    width: 50,
    height: 50,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  filter_button: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 4,
    backgroundColor: "purple",
    alignSelf: "flex-start",
    marginHorizontal: "1%",
    marginBottom: 6,
    minWidth: "48%",
    textAlign: "center",
  },
  selected_filter_button: {
    backgroundColor: "grey",
    borderWidth: 0,
  },
  buttonLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "white",
  },
  selectedLabel: {
    color: "white",
  },
  label: {
    textAlign: "center",
    marginBottom: 10,
    fontSize: 24,
  },
  container: {
    flex: 1,
    alignItems: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    padding: 20,
  },
  separator: {
    marginVertical: 3,
    height: 1,
    width: "80%",
    backgroundColor: "#F8F9FF",
  },
  item: {
    backgroundColor: "#f0f0f0",
    padding: 15,
    marginVertical: 5,
    marginHorizontal: 16,
    borderRadius: 8,
    width: 350,
  },
  itemText: {
    fontSize: 18,
    color: "#333",
  },
  search_bar: {
    height: 40,
    margin: 12,
    borderWidth: 1,
    padding: 10,
    width: 350,
  },
  redText: {
    color: "#d32f2f",
    fontWeight: "bold",
  },
});

