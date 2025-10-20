// --- Imports ---
import React, { useState } from "react";
import {
  StyleSheet,
  TextInput,
  View,
  Text,
  TouchableOpacity,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import CustomHeader from "@/components/CustomHeader";
import CustomCheckbox from "@/components/CustomCheckbox";

// --- Types ---
interface ShoppingItem {
  id?: string;
  name: string;
  price: number;
  requested_by: string;
  bought_by?: string;
  checked: boolean;
}

// --- Backend API base URL ---
const API_URL = `${process.env.EXPO_PUBLIC_API_URL}/shopping`; // Update if running on another device


// --- Main Component ---
export default function SharedListScreen() {
  // --- State ---
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [newItem, setNewItem] = useState("");
  const [newPrice, setNewPrice] = useState("");

  // --- Add new item to backend and local list ---
  const addItem = async () => {
    if (!newItem.trim()) return;

    const newEntry = {
      name: newItem.trim(),
      price: parseFloat(newPrice) / 100 || 0, // store as dollars
      requested_by: "You",
      checked: false,
    };

    try {
      const response = await fetch(`${API_URL}/items/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newEntry),
      });

      const data = await response.json();

      if (response.ok && data.data?.length) {
        const addedItem = data.data[0];
        setItems((prev) => [...prev, addedItem]);
        setNewItem("");
        setNewPrice("");
      } else {
        alert("Failed to add item. Check backend logs.");
      }
    } catch (err) {
      console.error("Network error:", err);
      alert("Failed to connect to backend. Make sure FastAPI is running.");
    }
  };

  // --- Toggle item checked/unchecked ---
  const toggleItem = async (id?: string) => {
    if (!id) return;

    const item = items.find((i) => i.id === id);
    if (!item) return;

    const updatedChecked = !item.checked;

    // Update locally first (optimistic UI)
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, checked: updatedChecked } : i))
    );

    // Update backend
    try {
      const response = await fetch(`${API_URL}/items/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...item, checked: updatedChecked }),
      });

      await response.json();
    } catch (err) {
      console.error("Failed to update checked status:", err);
    }
  };

  // --- Render ---
  return (
    <View style={styles.container}>
      {/* Header */}
      <CustomHeader title="Shopping List" />

      {/* Add item input section */}
      <View style={styles.addContainer}>
        <TextInput
          style={styles.input}
          placeholder="Item name..."
          value={newItem}
          onChangeText={setNewItem}
        />

        {/* Currency-formatted price input */}
        <TextInput
          style={[styles.input, { width: 120, textAlign: "right" }]}
          keyboardType="numeric"
          value={
            newPrice
              ? `$${(Number(newPrice) / 100).toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`
              : "$0.00"
          }
          onChangeText={(text) => {
            const numeric = text.replace(/\D/g, ""); // only digits
            if (!numeric) {
              setNewPrice("");
              return;
            }
            const limited = numeric.slice(0, 9); // optional limit
            setNewPrice(limited);
          }}
          onBlur={() => {
            if (!newPrice) setNewPrice("");
          }}
        />

        <TouchableOpacity style={styles.addButton} onPress={addItem}>
          <Ionicons name="add-circle" size={36} color="#4caf50" />
        </TouchableOpacity>
      </View>

      {/* Items List */}
      <FlatList
        data={items}
        keyExtractor={(item, index) => item.id || index.toString()}
        contentContainerStyle={{ paddingBottom: 100 }}
        renderItem={({ item }) => (
          <View style={[styles.card, item.checked && styles.checkedCard]}>
            <View style={styles.cardTop}>
              <CustomCheckbox
                value={item.checked}
                onToggle={() => toggleItem(item.id)}
                size={28}
                borderRadius={8}
              />
              <Text
                style={[
                  styles.itemName,
                  item.checked && {
                    textDecorationLine: "line-through",
                    color: "white",
                  },
                ]}
              >
                {item.name}
              </Text>
              <Text style={styles.price}>${item.price.toFixed(2)}</Text>
            </View>

            <Text style={styles.requestedText}>
              {item.checked
                ? `Bought by ${item.bought_by || "You"} ✓`
                : `Requested by ${item.requested_by}`}
            </Text>
          </View>
        )}
      />
    </View>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FF",
  },
  addContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    marginTop: 15,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "black",
    borderRadius: 5,
    padding: 10,
    marginRight: 10,
    backgroundColor: "white",
  },
  addButton: {
    paddingHorizontal: 6,
  },
  card: {
    backgroundColor: "#ededed",
    marginHorizontal: 20,
    marginVertical: 8,
    padding: 16,
    borderRadius: 8,
    elevation: 2,
  },
  checkedCard: {
    backgroundColor: "#cfcfcf",
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  itemName: {
    flex: 1,
    marginLeft: 10,
    fontSize: 17,
    fontWeight: "600",
  },
  price: {
    fontSize: 16,
    fontWeight: "700",
    color: "black",
  },
  requestedText: {
    marginTop: 8,
    fontSize: 13,
    color: "black",
  },
});
