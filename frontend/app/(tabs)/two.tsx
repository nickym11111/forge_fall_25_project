import {
  StyleSheet,
  Button,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
<<<<<<< Updated upstream
  RefreshControl,
=======
  Alert,
  Keyboard,
  TouchableWithoutFeedback,
        RefreshControl,
>>>>>>> Stashed changes
} from "react-native";
import { type SetStateAction, type Dispatch } from "react";
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';

import EditScreenInfo from "@/components/EditScreenInfo";
import { Text, View } from "@/components/Themed";
import React, { useState, useRef, useEffect, useCallback } from "react";
import type { PropsWithChildren } from "react";
import { supabase } from "../utils/client";
import { useAuth } from "../context/authContext";
import CustomHeader from "@/components/CustomHeader";
import ProfileIcon from "@/components/ProfileIcon";
import { useFocusEffect } from "@react-navigation/native";

const API_URL = `${process.env.EXPO_PUBLIC_API_URL}`; // Backend API endpoint

// just to note, we should prob figure out what to do when the food goes past the expiration date

// --- Type Definitions ---

interface FridgeMate {
  first_name?: string;
  last_name?: string;
  name?: string;
  email?: string;
}

// Updated to match backend response
interface FoodItem {
  id: number;
  title: string;
  added_by?: FridgeMate | null;
  shared_by?: FridgeMate[] | null;
  quantity?: number;
  days_till_expiration?: number;
  created_at?: string;
}

// Defines props type for the Item component
interface ItemProps {
<<<<<<< Updated upstream
  title: string;
  added_by?: FridgeMate | null;
  shared_by?: FridgeMate[] | null;
  quantity?: number;
  days_until_expiration?: number;
}

// Individual item component
const Item = ({
  title,
  added_by,
  shared_by,
  quantity,
  days_until_expiration,
}: ItemProps) => {
  // Handle different name formats from backend
=======
  item: FoodItem;
  onDelete: (item: FoodItem) => void;
  onQuantityChange: (item: FoodItem, delta: number) => void;
}

// Individual item component
const Item = ({ item, onDelete, onQuantityChange }: ItemProps) => {
>>>>>>> Stashed changes
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

  const sharedByString: string =
    shared_by && shared_by.length > 0
      ? shared_by.map((mate) => getDisplayName(mate)).join(", ")
      : "No one";

  // Determine if item is expiring soon
  const isExpiringSoon = (days_until_expiration || 0) <= 7;

  return (
    <View style={styles.item}>
<<<<<<< Updated upstream
      <Text style={[styles.itemText]}>
        <Text style={{ fontWeight: "bold" }}>{title}</Text>
      </Text>
      <Text style={[styles.itemText, { fontSize: 10 }]}>
        <Text style={{ fontWeight: "bold" }}>Quantity:</Text> {quantity || 0} |
        <Text
          style={[{ fontWeight: "bold" }, isExpiringSoon && styles.redText]}
        >
          {" "}
          Expires in
        </Text>
        <Text style={isExpiringSoon && styles.redText}>
          {" "}
          {days_until_expiration || 0} days
        </Text>{" "}
        |<Text style={{ fontWeight: "bold" }}> Added by</Text> {addedByName}
      </Text>
      <Text style={[styles.itemText, { fontSize: 10 }]}>
        <Text style={{ fontWeight: "bold" }}>Shared by:</Text> {sharedByString}
      </Text>
=======
      <View style={styles.itemContent}>
        {/* Item info */}
        <View style={styles.itemLeft}>
          <View style={styles.itemTitleRow}>
            <Text style={styles.itemTitle} numberOfLines={2}>
              {item.name}
            </Text>
            <TouchableOpacity onPress={handleDelete} style={styles.deleteIcon}>
              <Ionicons name="trash-outline" size={15} color="#666" />
            </TouchableOpacity>
          </View>

          <Text style={styles.infoText}>
            <Text style={styles.infoLabel}>Quantity: </Text>
            {qty}
          </Text>

          <Text style={[styles.infoText, isExpiringSoon && styles.redText]}>
            <Text style={styles.infoLabel}>Expires in: </Text>
            {item.days_till_expiration || 0} days
          </Text>

          <Text style={styles.infoText}>
            <Text style={styles.infoLabel}>Added by: </Text>
            {addedByName}
          </Text>

          <Text style={styles.infoText}>
            <Text style={styles.infoLabel}>Shared by: </Text>
            {sharedByString}
          </Text>
        </View>

        {/* Quantity Controls - HORIZONTAL at bottom */}
        <View style={styles.itemRight}>
          {qty === 1 ? (
            <TouchableOpacity onPress={handleDelete} style={styles.controlBtn}>
              <Ionicons name="trash-outline" size={18} color="#14b8a6" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => onQuantityChange(item, -1)}
              style={styles.controlBtn}
            >
              <Ionicons name="remove-circle-outline" size={20} color="#14b8a6" />
            </TouchableOpacity>
          )}

          <View style={styles.qtyBadge}>
            <Text style={styles.qtyText}>{qty}</Text>
          </View>

          <TouchableOpacity
            onPress={() => onQuantityChange(item, 1)}
            style={styles.controlBtn}
          >
            <Ionicons name="add-circle-outline" size={20} color="#14b8a6" />
          </TouchableOpacity>
        </View>
      </View>
>>>>>>> Stashed changes
    </View>
  );
};

export default function TabOneScreen() {
  const{ user } = useAuth();
  const [data, setData] = useState<FoodItem[]>([]);
  const [searchValue, setSearchValue] = useState<string>("");
<<<<<<< Updated upstream
=======
  // NEW: Handler functions for delete and quantity change
  const handleDelete = (item: FoodItem) => {
    setData((prev) => prev.filter((i) => i.id !== item.id));
    originalHolder.current = originalHolder.current.filter((i) => i.id !== item.id);
  };

  const handleQuantityChange = (item: FoodItem, delta: number) => {
    const newQty = Math.max(1, (item.quantity || 1) + delta);
    const updated = { ...item, quantity: newQty };
    
    setData((prev) => prev.map((it) => (it.id === item.id ? updated : it)));
    originalHolder.current = originalHolder.current.map((it) =>
      it.id === item.id ? updated : it
    );
  };
  

  // Fetch data from backend when component mounts
  useEffect(() => {
    fetchFridgeItems();
  }, []);
>>>>>>> Stashed changes
  const originalHolder = useRef<FoodItem[]>([]);
  const [selectedFilters, setSelectedFilters] = useState<string[]>([
    "All Items",
  ]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  // Auto-refresh when tab is focused
  useFocusEffect(
    useCallback(() => {
      fetchFridgeItems();
<<<<<<< Updated upstream
    }, [])
  );

=======
    }, [user?.active_fridge_id])
  );


>>>>>>> Stashed changes
  const fetchFridgeItems = async () => {
    try {
      setLoading(true);
      console.log("Fetching data from:", `${API_URL}/fridge_items/`);

      const { data: { session }, error } = await supabase.auth.getSession();

      if (error || !session) {
        setData([]);
        originalHolder.current = [];
        setError("");
        throw new Error("You must be logged in to view fridge items");
      }

      console.log("User ID:", user?.id);

      const response = await fetch(`${API_URL}/fridge_items/`, {
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

      // Transform backend data to match frontend format
      const transformedData = result.data
        .map((item: any) => ({
          ...item,
          days_until_expiration: item.days_till_expiration, // Map backend field name
        }))
        .sort((a: FoodItem, b: FoodItem) => {
          // Sort by days_till_expiration ascending (soonest first)
          const aDays = a.days_till_expiration || 999;
          const bDays = b.days_till_expiration || 999;
          return aDays - bDays;
        });

      setData(transformedData);
      originalHolder.current = transformedData;
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
    fetchFridgeItems();
<<<<<<< Updated upstream
  };
=======
  }; 
>>>>>>> Stashed changes

  const filterData = (data: FoodItem[], selectedFilters: string[]) => {
    // Current user

    const username = "John Doe";
    let temp_data = data;

    // If user presses 'expiring soon'
    if (selectedFilters.includes("Expiring Soon")) {
      temp_data = temp_data.filter(
        (item) => (item.days_till_expiration || 0) <= 7
      );
    }

    // If user presses 'my items'
    if (selectedFilters.includes("My Items")) {
      temp_data = temp_data.filter((item) => {
        if (!item.shared_by || item.shared_by.length !== 1) return false;
        const mate = item.shared_by[0];
        const fullName =
          mate.first_name && mate.last_name
            ? `${mate.first_name} ${mate.last_name}`
            : mate.name || "";
        return fullName === username;
      });
    }

    // If user presses 'shared'
    if (selectedFilters.includes("Shared")) {
      temp_data = temp_data.filter((item) => {
        if (!item.shared_by || item.shared_by.length <= 1) return false;
        return item.shared_by.some((mate) => {
          const fullName =
            mate.first_name && mate.last_name
              ? `${mate.first_name} ${mate.last_name}`
              : mate.name || "";
          return fullName === username;
        });
      });
    }

    return temp_data;
  };

  // Get the data array based on the selected filter
  const filtered_data = filterData(originalHolder.current, selectedFilters);

  // Apply the search filter
  const finalListData = filtered_data.filter((item) => {
    if (!searchValue) return true;
    const itemData = item.title.toUpperCase();
    const textData = searchValue.toUpperCase();
    return itemData.includes(textData);
  });

  const searchFunction = (text: string) => {
    setSearchValue(text);
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
        <CustomHeader title="What's In Our Fridge?" />
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
          onPress={fetchFridgeItems}
        >
          <Text style={styles.buttonLabel}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (data.length === 0) {
    return (
      <View style={{width: '100%', height: '100%'}}>
        <CustomHeader title="What's In Our Fridge?" />
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
      <CustomHeader title="What's In Our Fridge?" />
      <ProfileIcon className="profileIcon" />
    <View style={styles.container}>
      
<<<<<<< Updated upstream
      <View
        style={styles.separator}
        lightColor="#eee"
        darkColor="rgba(255,255,255,0.1)"
      />
      <View>
        <TextInput
          style={styles.search_bar}
          onChangeText={searchFunction}
          value={searchValue}
          placeholder="Food item..."
        />
      </View>
=======
      <TextInput
        style={styles.search_bar}
        onChangeText={searchFunction}
        value={searchValue}
        placeholder="Search food items..."
        placeholderTextColor="#999"
      />
      
>>>>>>> Stashed changes
      <PreviewLayout
        values={["All Items", "Expiring Soon", "My Items", "Shared"]}
        selectedValue={selectedFilters}
        setSelectedValue={setSelectedFilters}
      ></PreviewLayout>
      <FlatList
        data={finalListData}
        renderItem={({ item }) => (
          <Item
<<<<<<< Updated upstream
            title={item.title}
            added_by={item.added_by}
            shared_by={item.shared_by}
            quantity={item.quantity}
            days_until_expiration={item.days_till_expiration}
=======
            item={item}
            onDelete={handleDelete}
            onQuantityChange={handleQuantityChange}
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
    </View>
  );
=======
  </View>
);
>>>>>>> Stashed changes
}

type PreviewLayoutProps = PropsWithChildren<{
  values: string[];
  selectedValue: string[];
  setSelectedValue: Dispatch<SetStateAction<string[]>>;
}>;

const PreviewLayout = ({
  values,
  selectedValue,
  setSelectedValue,
}: PreviewLayoutProps) => (
  <View style={{ padding: 10 }}>
    <View style={styles.row}>
      {values.map((value) => (
        <TouchableOpacity
          key={value}
          onPress={() => {
            setSelectedValue((prevFilters: any[]) => {
              if (value === "All Items") {
                return ["All Items"];
              }
              let cleanedFilters = prevFilters.filter(
                (f: string) => f !== "All Items"
              );
              if (cleanedFilters.includes(value)) {
                const newFilters = cleanedFilters.filter(
                  (f: string) => f !== value
                );
                return newFilters.length === 0 ? ["All Items"] : newFilters;
              } else {
                if (cleanedFilters.includes("My Items") && value === "Shared") {
                  cleanedFilters = cleanedFilters.filter(
                    (f: string) => f !== "My Items"
                  );
                } else if (
                  cleanedFilters.includes("Shared") &&
                  value === "My Items"
                ) {
                  cleanedFilters = cleanedFilters.filter(
                    (f: string) => f !== "Shared"
                  );
                }
                return [...cleanedFilters, value];
              }
            });
          }}
          style={[
            styles.filter_button,
            selectedValue.includes(value) && styles.selected_filter_button,
          ]}
        >
          <Text
            style={[
              styles.buttonLabel,
              selectedValue.includes(value) &&
                styles.selected_filter_button &&
                styles.selectedLabel,
            ]}
          >
            {value}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  </View>
);

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
    width: "100%",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    padding: 20,
  },
<<<<<<< Updated upstream
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
=======
  
  searchContainer: {
    width: "100%",
    alignItems: "center",
  },
  search_bar: {
    height: 55,
    marginTop: -15,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: "#14b8a6",
    padding: 12,
    width: "90%",
    borderRadius: 10,
    backgroundColor: "#ffffff",
    fontSize: 16,
  },
  flatList: {
    width: "100%",
  },
  listContent: {
    paddingBottom: 20,
    alignItems: "center",
  },
  
  // Item Card Styles
  item: {
    backgroundColor: "#ffffff",
    padding: 18,
    marginVertical: 8,
    borderRadius: 16,
    width: "90%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  itemContent: {
    flexDirection: "row",
  },
  itemLeft: {
    width: "100%",
  },
  itemTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  itemTitle: {
    fontSize: 25,
    fontWeight: "bold",
>>>>>>> Stashed changes
    color: "#333",
  },
<<<<<<< Updated upstream
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
=======
  deleteIcon: {
    padding: 4,
    marginTop: -11,
    marginRight: -8,

  },
  infoText: {
    fontSize: 15,
    color: "#333",
    marginBottom: 6,
  },
  infoLabel: {
    fontWeight: "600",
  },
  redText: {
    color: "#dc2626",
  },
  
  itemRight: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f0fdfa",
    marginLeft: -125,
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 6,
    alignSelf: "center",
  },
  controlBtn: {
    padding: 4,
  },
  qtyBadge: {
    backgroundColor: "#ffffff",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginHorizontal: 10,
    borderWidth: 2,
    borderColor: "#14b8a6",
  },
  qtyText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
>>>>>>> Stashed changes
  },
});

