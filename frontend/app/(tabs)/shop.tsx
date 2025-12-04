import React, { useEffect, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Keyboard,
  TouchableWithoutFeedback,
  ScrollView,
  Modal,
  Pressable,
} from "react-native";

import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import CustomHeader from "@/components/CustomHeader";
import CustomCheckbox from "@/components/CustomCheckbox";
import ProfileIcon from "@/components/ProfileIcon";

import { supabase } from "../utils/client";
import { useUser } from "../hooks/useUser";
import { useIsFocused } from "@react-navigation/native";


interface ShoppingItem {
  id?: number;
  name: string;
  quantity?: number;
  requested_by: string;
  bought_by?: string | null;
  checked?: boolean;
  need_by?: string;
  fridge_id?: string;
}

const API_URL = `${process.env.EXPO_PUBLIC_API_URL}/shopping`;

// Helper Functions
const formatShortDate = (d: Date) => {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  return `${mm}/${dd}/${yy}`;
};

const isoToShort = (iso?: string) => {
  if (!iso) return "";
  const date = new Date(iso);
  return isNaN(date.getTime()) ? iso : formatShortDate(date);
};



// Component
export default function SharedListScreen() {
  const { user } = useUser();
  const isFocused = useIsFocused();

  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [searchValue, setSearchValue] = useState("");

  
  const [modalOpen, setModalOpen] = useState(false);
  const [formName, setFormName] = useState("");
  const [formQuantity, setFormQuantity] = useState(1);
  const [formNeedBy, setFormNeedBy] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const filteredItems = items.filter((item) =>
  item.name.toLowerCase().includes(searchValue.toLowerCase())
  );

  //Date Picker
  const onChangeNeedBy = (event: any, selected?: Date) => {
    if (selected) setFormNeedBy(selected);
    if (Platform.OS !== "ios") setShowDatePicker(false);
  };

  // Load Items
  const loadItems = async () => {
    if (!user?.fridge_id) return;

    try {
      const { data, error } = await supabase
        .from("shopping_list")
        .select("*")
        .eq("fridge_id", user.fridge_id)
        .order("id", { ascending: true });

      if (!error) setItems(data || []);
      else throw error;
    } catch (err) {
      console.error("loadItems:", err);
    }
  };

  useEffect(() => {
    loadItems();
  }, [user?.fridge_id]);

  useEffect(() => {
    if (isFocused) loadItems();
  }, [isFocused]);

  const resetForm = () => {
    setFormName("");
    setFormQuantity(1);
    setFormNeedBy(null);
    setShowDatePicker(false);
  };

  // Add Item
  const addItem = async () => {
    if (!formName.trim()) return;
    if (!user?.fridge_id) return;

    const newItem: ShoppingItem = {
      name: formName.trim(),
      quantity: Math.max(1, formQuantity),
      requested_by: `${user.first_name} ${user.last_name}`.trim(),
      bought_by: null,
      checked: false,
      need_by: formNeedBy
        ? formNeedBy.toISOString().split("T")[0]
        : undefined,
      fridge_id: user.fridge_id,
    };

    try {
      const resp = await fetch(`${API_URL}/items/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newItem),
      });

      const data = await resp.json();
      if (resp.ok) {
        resetForm();
        loadItems();
      }
    } catch (err) {
      console.error("addItem:", err);
    }
  };

  //Delete
  const deleteItem = async (item: ShoppingItem) => {
    if (!item.id) return;

    setItems((prev) => prev.filter((i) => i.id !== item.id));

    try {
      await supabase.from("shopping_list").delete().eq("id", item.id);
    } catch (err) {
      console.error("deleteItem:", err);
    }
  };

  // Update
  const changeItemQuantity = async (item: ShoppingItem, delta: number) => {
    const newQty = Math.max(1, (item.quantity || 1) + delta);

    setItems((prev) =>
      prev.map((it) => (it.id === item.id ? { ...it, quantity: newQty } : it))
    );

    if (!item.id) return;

    try {
      await supabase
        .from("shopping_list")
        .update({ quantity: newQty })
        .eq("id", item.id);

      loadItems();
    } catch (err) {
      console.error("changeItemQuantity:", err);
    }
  };

  const toggleChecked = async (item: ShoppingItem) => {
    if (!user || !item.id) return;

    const updated = {
      checked: !item.checked,
      bought_by: !item.checked
        ? `${user.first_name} ${user.last_name}`.trim()
        : null,
    };

    setItems((prev) =>
      prev.map((it) => (it.id === item.id ? { ...it, ...updated } : it))
    );

    try {
      await supabase
        .from("shopping_list")
        .update(updated)
        .eq("id", item.id);

      loadItems();
    } catch (err) {
      console.error("toggleChecked:", err);
    }
  };

  // Render Item
  const renderItemCard = ({ item }: { item: ShoppingItem }) => {
    const qty = item.quantity ?? 1;

    return (
      <View style={styles.itemCard}>
        {/* Checkbox */}
        <View style={styles.itemLeft}>
          <CustomCheckbox
            value={!!item.checked}
            onToggle={() => toggleChecked(item)}
            size={28}
            borderRadius={8}
          />
        </View>

        {/* Middle */}
        <View style={styles.itemCenter}>
          <Text
            style={[styles.itemTitle, item.checked && styles.itemChecked]}
            numberOfLines={1}
          >
            {item.name}
          </Text>

          {item.checked ? (
            <Text style={styles.itemMeta}>Bought by You</Text>
          ) : (
            <>
              {item.need_by && (
                <Text style={styles.itemMeta}>
                  Need by: {isoToShort(item.need_by)}
                </Text>
              )}
              <Text style={styles.itemMeta}>
                Requested by {item.requested_by}
              </Text>
            </>
          )}
        </View>

        {/* Right */}
        <View style={styles.itemRight}>
          <View style={styles.controlBox}>
            {qty === 1 ? (
              <TouchableOpacity
                onPress={() => deleteItem(item)}
                style={styles.controlIcon}
              >
                <Ionicons name="trash-outline" size={20} color="#222" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={() => changeItemQuantity(item, -1)}
                style={styles.controlIcon}
              >
                <Ionicons
                  name="remove-circle-outline"
                  size={22}
                  color="#222"
                />
              </TouchableOpacity>
            )}

            <View style={styles.qtyBadge}>
              <Text style={styles.qtyText}>{qty}</Text>
            </View>

            <TouchableOpacity
              onPress={() => changeItemQuantity(item, 1)}
              style={styles.controlIcon}
            >
              <Ionicons name="add-circle-outline" size={22} color="#222" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };


  // Main Render
  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <CustomHeader title="Shared Shopping List" />
  

      {/* Add Item Quick Box */}
      <View style={styles.topCard}>
        {/* <Text style={styles.cardTitle}>Add Item</Text> */}

        <View style={styles.topRow}>
        {/* Search */}
        <TextInput
          style={styles.search_bar}
          onChangeText={setSearchValue}
          value={searchValue}
          placeholder="Search items..."
        />
          <TouchableOpacity style={styles.plusBtn} onPress={() => setModalOpen(true)}>
            <Ionicons name="add" size={28} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Items List */}
      <FlatList
        data={filteredItems}
        keyExtractor={(it, i) => (it.id ? String(it.id) : `${it.name}-${i}`)}
        renderItem={renderItemCard}
        contentContainerStyle={styles.itemsList}
      />

      {/* Modal */}
      <Modal visible={modalOpen} transparent animationType="none">
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setModalOpen(false)}
        />

        <View style={styles.modalCard}>
          <ScrollView nestedScrollEnabled>
            <Text style={styles.modalTitle}>Add Item</Text>

            <Text style={styles.inputLabel}>Item Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Milk, Eggs, Bread"
              value={formName}
              onChangeText={setFormName}
            />

            {/* Quantity + Need by */}
            <View style={styles.row}>
              {/* Qty */}
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Quantity</Text>
                <View style={styles.qtyRow}>
                  <TouchableOpacity
                    onPress={() => setFormQuantity(Math.max(1, formQuantity - 1))}
                  >
                    <Ionicons name="remove-circle-outline" size={25} color="#222" />
                  </TouchableOpacity>

                  <Text style={styles.qtyNumber}>{formQuantity}</Text>

                  <TouchableOpacity
                    onPress={() => setFormQuantity(formQuantity + 1)}
                  >
                    <Ionicons name="add-circle-outline" size={25} color="#222" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Need by */}
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Need by</Text>
                <TouchableOpacity
                  style={styles.dateInput}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text style={styles.dateText}>
                    {formNeedBy
                      ? formatShortDate(formNeedBy)
                      : "Tap to select date"}
                  </Text>
                  <Ionicons name="calendar-outline" size={20} color="#222" />
                </TouchableOpacity>
              </View>
            </View>

            {showDatePicker && (
              <DateTimePicker
                value={formNeedBy || new Date()}
                mode="date"
                display={Platform.OS === "ios" ? "inline" : "default"}
                onChange={(e, d) => {
                  if (d) setFormNeedBy(d);
                  if (Platform.OS !== "ios") setShowDatePicker(false);
                }}
              />
            )}

            {/* Button */}
            <TouchableOpacity style={styles.addItemButton} onPress={addItem}>
              <Text style={styles.addItemButtonText}>Add Item</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setModalOpen(false)}
              style={{ marginTop: 8, alignSelf: "center" }}
            >
              <Text style={{ color: "#666" }}>Cancel</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

// Styles
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F7F8FC"},
  search_bar: {
    height: 45,
    marginTop: 10,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: "#14b8a6",
    padding: 12,
    width: "90%",
    borderRadius: 10,
    backgroundColor: "#ffffff",
    fontSize: 16,
  },

  topCard: {
    margin: 18,
    marginTop: 5,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitle: { fontSize: 18, fontWeight: "600", marginBottom: 35},
  topRow: { flexDirection: "row", alignItems: "center" },
  topInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E6E6E6",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#FAFAFB",
    fontSize: 14,
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  modalCard: {
    position: "absolute",
    top: "20%",
    left: "5%",
    right: "5%",
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 16,
    maxHeight: "72%",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 12,
  },
  modalTitle: { fontSize: 20, fontWeight: "700", marginBottom: 12 },

  plusBtn: {
    marginLeft: 16,
    width: 45,
    height: 45,
    borderRadius: 23,
    backgroundColor: "#14b8a6",
    alignItems: "center",
    justifyContent: "center",
  },

  section: { marginHorizontal: 22, marginTop: 6 },
  sectionTitle: { fontSize: 20, fontWeight: "700", color: "#2C2C54" },

  itemsList: { paddingHorizontal: 10, paddingBottom: 140 },
  itemCard: {
    marginHorizontal: 18,
    marginTop: 12,
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  itemLeft: { width: 40, alignItems: "center" },
  itemCenter: { flex: 1, paddingRight: 12 },
  itemTitle: { fontSize: 17, fontWeight: "700", color: "#111" },
  itemChecked: { textDecorationLine: "line-through", color: "#8c8c8c" },
  itemMeta: { marginTop: 6, color: "#666", fontSize: 13 },

  itemRight: { width: 120, alignItems: "center", justifyContent: "center" },
  controlBox: {
    width: 110,
    backgroundColor: "#F6F6F8",
    borderRadius: 26,
    paddingVertical: 8,
    paddingHorizontal: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  controlIcon: { paddingHorizontal: 6 },
  qtyBadge: {
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#eee",
  },
  qtyText: { fontSize: 16, fontWeight: "700", color: "#111" },

  inputLabel: { fontSize: 14, fontWeight: "500", marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: "#E8E8E8",
    borderRadius: 12,
    padding: 10,
    backgroundColor: "#FAFBFF",
    fontSize: 16,
  },

  row: { flexDirection: "row", marginTop: 10 },

  qtyRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FAFAFB",
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
    justifyContent: "space-between",
    width: 140,
  },
  qtyNumber: { fontSize: 16, fontWeight: "500", marginHorizontal: 8 },

  dateInput: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#FAFBFF",
    borderWidth: 1,
    borderColor: "#E8E8E8",
  },
  dateText: { 
    color: "#333" 
  },
  datePickerContainer: {
    marginTop: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  addItemButton: {
    marginTop: 10,
    backgroundColor: "#14b8a6",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  addItemButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 18,
  },
});