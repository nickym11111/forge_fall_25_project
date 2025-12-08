import {
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Image,
} from "react-native";
import { router } from "expo-router";
import { Text, View } from "@/components/Themed";
import React, { useState, useRef, useCallback } from "react";
import { supabase } from "../utils/client";
import { useAuth } from "../context/authContext";
import CustomHeader from "@/components/CustomHeader";
import { useFocusEffect } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Alert } from "react-native";

const API_URL = `${process.env.EXPO_PUBLIC_API_URL}`; // Backend API endpoint

interface FridgeMate {
  first_name?: string;
  last_name?: string;
  name?: string;
  email?: string;
  profile_photo_url?: string;
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
  onRemove: (recipeName: string) => void;
}

// Individual item component
const Item = ({ recipe_name, added_by, onRemove }: ItemProps) => {
  const [isFavorite, setIsFavorite] = useState(true);
  const handleHeartPress = () => {
    Alert.alert(
      "Remove Recipe",
      `Are you sure you want to remove "${recipe_name}" from favorites?`,
      [
        {
          text: "No",
          onPress: () => console.log("Cancelled"),
          style: "cancel",
        },
        {
          text: "Yes",
          onPress: async () => {
            try {
              setIsFavorite(false); // optimistically update UI
              const {
                data: { session },
              } = await supabase.auth.getSession();
              const response = await fetch(`${API_URL}/delete-recipe/`, {
                method: "DELETE",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${session?.access_token}`,
                },
                body: JSON.stringify({ recipe_name }),
              });
              if (!response.ok) throw new Error("Failed to remove recipe");
              onRemove(recipe_name);
            } catch (err) {
              console.error(err);
              setIsFavorite(true);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };
  const getDisplayName = (mate: FridgeMate) => {
    if (!mate) return "Unknown";
    if (mate.first_name && mate.last_name)
      return `${mate.first_name} ${mate.last_name}`;
    if (mate.first_name) return mate.first_name;
    if (mate.last_name) return mate.last_name;
    if (mate.name) return mate.name;
    if (mate.email) return mate.email.split("@")[0];
    return "Unknown";
  };
  const addedByName = added_by ? getDisplayName(added_by) : "Unknown";

  // Get initials for default profile icon
  const getInitials = (mate: FridgeMate) => {
    if (!mate) return "?";
    if (mate.first_name && mate.last_name) {
      return `${mate.first_name[0]}${mate.last_name[0]}`.toUpperCase();
    }
    if (mate.first_name) return mate.first_name[0].toUpperCase();
    if (mate.last_name) return mate.last_name[0].toUpperCase();
    if (mate.email) return mate.email[0].toUpperCase();
    return "?";
  };

  return (
    <View style={styles.item}>
      <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
        <Text style={[styles.itemText, { flex: 1, flexWrap: "wrap", paddingRight: 8, maxWidth: "80%" }]}>
          <Text style={{ fontWeight: "bold" }}>{recipe_name}</Text>
        </Text>
        <TouchableOpacity onPress={handleHeartPress} style={styles.heartButton}>
          <Ionicons
            name={isFavorite ? "heart" : "heart-outline"}
            size={28}
            color={isFavorite ? "#E91E63" : "#888"}
          />
        </TouchableOpacity>
      </View>
      <View
        style={{ flexDirection: "row", alignItems: "center", marginTop: 8 }}
      >
        {added_by?.profile_photo_url ? (
          <Image
            source={{ uri: added_by.profile_photo_url }}
            style={styles.profilePhoto}
          />
        ) : added_by ? (
          <View style={[styles.profilePhoto, styles.defaultProfileIcon]}>
            <Text style={styles.profileInitials}>{getInitials(added_by)}</Text>
          </View>
        ) : null}
        <Text
          style={[
            styles.itemText,
            { fontSize: 10, marginLeft: added_by ? 8 : 0 },
          ]}
        >
          |<Text style={{ fontWeight: "bold" }}> Added by</Text> {addedByName}
        </Text>
      </View>
    </View>
  );
};

export default function TabOneScreen() {
  const { user } = useAuth();
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
      console.log(
        "Fetching data from:",
        `${API_URL}/favorite-recipes/get-favorite-recipes/`
      );

      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error || !session) {
        setData([]);
        originalHolder.current = [];
        setError("");
        throw new Error("You must be logged in to view recipe items");
      }

      console.log("User ID:", user?.id);

      const response = await fetch(
        `${API_URL}/favorite-recipes/get-favorite-recipes/`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log("API Response:", result);
      console.log(
        "Added by data:",
        result.data.map((item: RecipeItem) => item.added_by)
      );

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

  // Remove full screen loading - show header and load in background

  if (error === "NO_FRIDGE") {
    return (
      <View style={{ width: "100%", height: "100%" }}>
        <CustomHeader title="Favorite Recipes" />
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.push("/(tabs)/recipes")}
        >
          <Ionicons name="arrow-back" size={28} color="#64748b" />
        </TouchableOpacity>
        <View style={[styles.container, { justifyContent: "center" }]}>
          <Text
            style={{
              fontSize: 18,
              textAlign: "center",
              padding: 20,
              color: "#666",
            }}
          >
            You haven't joined a kitchen yet!
          </Text>
          <Text
            style={{
              fontSize: 14,
              textAlign: "center",
              paddingHorizontal: 20,
              color: "#999",
            }}
          >
            Create or join a kitchen to start tracking your food items.
          </Text>
          <TouchableOpacity
            style={[
              styles.filter_button,
              { marginTop: 20, alignSelf: "center", minWidth: "60%" },
            ]}
            onPress={() => {
              router.push("/(tabs)/create_fridge");
            }}
          >
            <Text style={styles.buttonLabel}>Create or Join a Kitchen</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={{ width: "100%", height: "100%" }}>
        <CustomHeader title="Favorite Recipes" />
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.push("/(tabs)/recipes")}
        >
          <Ionicons name="arrow-back" size={28} color="#64748b" />
        </TouchableOpacity>
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
      </View>
    );
  }

  if (data.length === 0) {
    return (
      <View style={{ width: "100%", height: "100%" }}>
        <CustomHeader title="Favorite Recipes" />
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.push("/(tabs)/recipes")}
        >
          <Ionicons name="arrow-back" size={28} color="#64748b" />
        </TouchableOpacity>
        <View style={[styles.container, { justifyContent: "center" }]}>
          <Text
            style={{
              fontSize: 18,
              textAlign: "center",
              padding: 20,
              color: "#666",
            }}
          >
            Your kitchen is empty!
          </Text>
          <Text
            style={{
              fontSize: 14,
              textAlign: "center",
              paddingHorizontal: 20,
              color: "#999",
            }}
          >
            Add some items to get started.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View
      style={{
        width: "100%",
        height: "100%",
      }}
    >
      <CustomHeader title="Favorite Recipes" />
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.push("/(tabs)/recipes")}
      >
        <Ionicons name="arrow-back" size={28} color="#64748b" />
      </TouchableOpacity>
      {loading && !refreshing && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color="#14b8a6" />
        </View>
      )}
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
              onRemove={(name) => {
                setData((prev) => prev.filter((r) => r.recipe_name !== name));
              }}
            />
          )}
          keyExtractor={(item) => item.id.toString()}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#14b8a6"]}
              tintColor="#14b8a6"
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
  itemContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    padding: 15,
    marginVertical: 5,
    marginHorizontal: 0,
    borderRadius: 8,
    width: "100%",
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
  heartButton: {
    paddingLeft: 10,
    width: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  redText: {
    color: "#d32f2f",
    fontWeight: "bold",
  },
  profilePhoto: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#ddd",
  },
  defaultProfileIcon: {
    backgroundColor: "purple",
    justifyContent: "center",
    alignItems: "center",
  },
  profileInitials: {
    color: "white",
    fontSize: 10,
    fontWeight: "bold",
  },
  loadingOverlay: {
    position: "absolute",
    top: 100,
    right: 20,
    zIndex: 1000,
  },
  backButton: {
    position: "absolute",
    left: 10,
    top: 100,
    zIndex: 1000,
    alignItems: "center",
    justifyContent: "center",
  },
});
