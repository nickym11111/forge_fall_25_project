import {
  StyleSheet,
  Button,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { type SetStateAction, type Dispatch } from "react";

import EditScreenInfo from "@/components/EditScreenInfo";
import { Text, View } from "@/components/Themed";
import React, { useState, useRef, useEffect } from "react";
import type { PropsWithChildren } from "react";
import { supabase } from "../utils/client";

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
  const getDisplayName = (mate: FridgeMate) => {
    if (mate.first_name && mate.last_name) {
      return `${mate.first_name} ${mate.last_name}`;
    }
    return mate.name || "Unknown";
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
    </View>
  );
};

export default function TabOneScreen() {
  const [data, setData] = useState<FoodItem[]>([]);
  const [searchValue, setSearchValue] = useState<string>("");
  const originalHolder = useRef<FoodItem[]>([]);
  const [selectedFilters, setSelectedFilters] = useState<string[]>([
    "All Items",
  ]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  // Fetch data from backend when component mounts
  useEffect(() => {
    fetchFridgeItems();
  }, []);

  const fetchFridgeItems = async () => {
    try {
      setLoading(true);
      console.log("Fetching data from:", `${API_URL}/fridge_items/`);

      const { data: { session }, error } = await supabase.auth.getSession();

      if (error || !session) {
        throw new Error("You must be logged in to view fridge items");
      }

      console.log("User ID:", session.user.id);

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
      setError(`Failed to load items from ${API_URL}`);
    } finally {
      setLoading(false);
    }
  };

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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>What's In Our Fridge?</Text>
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
      <PreviewLayout
        values={["All Items", "Expiring Soon", "My Items", "Shared"]}
        selectedValue={selectedFilters}
        setSelectedValue={setSelectedFilters}
      ></PreviewLayout>
      <FlatList
        data={finalListData}
        renderItem={({ item }) => (
          <Item
            title={item.title}
            added_by={item.added_by}
            shared_by={item.shared_by}
            quantity={item.quantity}
            days_until_expiration={item.days_till_expiration}
          />
        )}
        keyExtractor={(item) => item.id.toString()}
      />
    </View>
  );
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
