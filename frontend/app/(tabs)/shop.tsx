import React, { useEffect, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";

import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import CustomHeader from "@/components/CustomHeader";
import CustomCheckbox from "@/components/CustomCheckbox";

import { useAuth } from "../context/authContext";
import { supabase } from "../utils/client";
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

//Helper Functions
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
  const { user } = useAuth();
  const user_id = user?.id;
  const isFocused = useIsFocused();

  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [searchValue, setSearchValue] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [formName, setFormName] = useState("");
  const [formQuantity, setFormQuantity] = useState(1);
  const [formNeedBy, setFormNeedBy] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Filter items based on search
  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(searchValue.toLowerCase())
  );

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

  const openModal = () => {
    resetForm();
    setModalOpen(true);
  };
  const closeModal = () => setModalOpen(false);

  //Add Items
  const addItem = async () => {
    if (!formName.trim()) return;

    const fridge_id = user?.fridge_id;
    if (!fridge_id) {
      console.error("Cannot add item: user does not have a fridge_id!");
      return;
    }

    const newItem: ShoppingItem = {
      name: formName.trim(),
      quantity: Math.max(1, Math.floor(formQuantity)),
      need_by: formNeedBy ? formNeedBy.toISOString().split("T")[0] : undefined,
      requested_by: user?.id || "",
      bought_by: null,
      checked: false,
      fridge_id,
    };

    try {
      const { data, error } = await supabase
        .from("shopping_list")
        .insert([newItem])
        .select();

      if (error) throw error;

      if (data && data.length > 0) {
        setItems((prev) => [...prev, data[0]]);
      }

      resetForm();
      closeModal();
    } catch (err) {
      console.error("addItem error:", err);
    }
  };

  //Delete Items
  const deleteItem = async (item: ShoppingItem) => {
    setItems((prev) => prev.filter((i) => i.id !== item.id));

    if (!item.id) return;
    try {
      const { error } = await supabase
        .from("shopping_list")
        .delete()
        .eq("id", item.id);

      if (error) throw error;
    } catch (err) {
      console.error("deleteItem error:", err);
    }
  };

  //Change Item Quantity
  const changeItemQuantity = async (item: ShoppingItem, delta: number) => {
    const newQty = Math.max(1, (item.quantity || 1) + delta);
    const updated = { ...item, quantity: newQty };
    setItems((prev) => prev.map((it) => (it.id === item.id ? updated : it)));

    if (!item.id) return;
    try {
      const { error } = await supabase
        .from("shopping_list")
        .update({ quantity: newQty })
        .eq("id", item.id);

      if (error) throw error;
    } catch (err) {
      console.error("changeItemQuantity error:", err);
    }
  };

  //Check if bought
  const toggleChecked = async (item: ShoppingItem) => {
    if (!user_id) return;

    const updated = {
      checked: !item.checked,
      bought_by: !item.checked ? user_id : null,
    };

    setItems((prev) =>
      prev.map((it) => (it.id === item.id ? { ...it, ...updated } : it))
    );

    if (!item.id) return;
    try {
      const { error } = await supabase
        .from("shopping_list")
        .update(updated)
        .eq("id", item.id);

      if (error) throw error;
    } catch (err) {
      console.error("toggleChecked error:", err);
    }
  };

  //Date Picker
  const onChangeNeedBy = (event: any, selected?: Date) => {
    if (selected) setFormNeedBy(selected);
    if (Platform.OS !== "ios") setShowDatePicker(false);
  };

  //Render Each Item
  const renderItemCard = ({ item }: { item: ShoppingItem }) => {
    const qty = item.quantity ?? 1;

    return (
      <View style={styles.itemCard}>
        <View style={styles.itemLeft}>
          <CustomCheckbox
            value={!!item.checked}
            onToggle={() => toggleChecked(item)}
            size={28}
            borderRadius={8}
          />
        </View>

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
                <Ionicons name="remove-circle-outline" size={22} color="#222" />
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

  //Main Render
  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <CustomHeader title="Shared Shopping List" />

      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View>
          {/* Search */}
          <TextInput
            style={styles.search_bar}
            onChangeText={setSearchValue}
            value={searchValue}
            placeholder="Search items..."
            placeholderTextColor="#999"
          />

          {/* Top Card (Add Item quick input) */}
          <View style={styles.topCard}>
            <Text style={styles.cardTitle}>Add Item</Text>

            <View style={styles.topRow}>
              <View style={styles.inputContainer}>
                <Ionicons
                  name="cube-outline"
                  size={20}
                  color="#94a3b8"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.topInput}
                  placeholder="Item name..."
                  placeholderTextColor="#94a3b8"
                  value={formName}
                  onChangeText={setFormName}
                />
              </View>
              <TouchableOpacity style={styles.plusBtn} onPress={openModal}>
                <Ionicons name="add" size={28} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Items List */}
          <FlatList
            data={filteredItems}
            keyExtractor={(it, i) =>
              it.id ? String(it.id) : `${it.name}-${i}`
            }
            renderItem={renderItemCard}
            contentContainerStyle={styles.itemsList}
            keyboardShouldPersistTaps="handled"
          />
        </View>
      </TouchableWithoutFeedback>

      {/* Modal for adding item with details */}
      {modalOpen && (
        <Modal
          transparent={true}
          animationType="none"
          visible={modalOpen}
          onRequestClose={closeModal}
        >
          <Pressable style={styles.modalOverlay} onPress={closeModal} />
          <View style={styles.modalCard}>
            <ScrollView
              contentContainerStyle={styles.modalScrollContent}
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.modalTitle}>Add Item</Text>

              {/* Item Name */}
              <Text style={styles.inputLabel}>Item Name *</Text>
              <View style={styles.inputContainer}>
                <Ionicons
                  name="cube-outline"
                  size={20}
                  color="#94a3b8"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="eg. Milk, Eggs, Bread"
                  placeholderTextColor="#94a3b8"
                  value={formName}
                  onChangeText={setFormName}
                />
              </View>

              {/* Quantity */}
              <Text style={styles.inputLabel}>Quantity</Text>
              <View style={styles.qtyRow}>
                <TouchableOpacity
                  onPress={() => setFormQuantity(Math.max(1, formQuantity - 1))}
                >
                  <Ionicons
                    name="remove-circle-outline"
                    size={25}
                    color="#222"
                  />
                </TouchableOpacity>
                <Text style={styles.qtyNumber}>{formQuantity}</Text>
                <TouchableOpacity
                  onPress={() => setFormQuantity(formQuantity + 1)}
                >
                  <Ionicons name="add-circle-outline" size={25} color="#222" />
                </TouchableOpacity>
              </View>

              {/* Need By Date */}
              <Text style={styles.inputLabel}>Need By</Text>
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

              {showDatePicker && (
                <View style={styles.datePickerContainer}>
                  <DateTimePicker
                    value={formNeedBy || new Date()}
                    mode="date"
                    display={Platform.OS === "ios" ? "inline" : "default"}
                    onChange={onChangeNeedBy}
                    minimumDate={new Date()}
                  />
                </View>
              )}

              {/* Add Button */}
              <TouchableOpacity style={styles.addItemButton} onPress={addItem}>
                <Text style={styles.addItemButtonText}>Add Item</Text>
              </TouchableOpacity>

              {/* Cancel Button */}
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={closeModal}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </Modal>
      )}
    </KeyboardAvoidingView>
  );
}

//Styles
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F7F8FC" },
  search_bar: {
    margin: 18,
    paddingHorizontal: 20,
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
  cardTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  inputContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    borderRadius: 16,
    backgroundColor: "#f8fafc",
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  inputIcon: {
    marginRight: 12,
  },
  topInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: "#1e293b",
  },
  plusBtn: {
    marginLeft: 12,
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#14b8a6",
    alignItems: "center",
    justifyContent: "center",
  },
  itemsList: {
    paddingHorizontal: 10,
    paddingBottom: 140,
  },
  itemCard: {
    marginHorizontal: 18,
    marginTop: 12,
    backgroundColor: "#FAFAFB",
    borderRadius: 10,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  itemLeft: {
    width: 40,
    alignItems: "center",
  },
  itemCenter: {
    flex: 1,
    paddingRight: 12,
  },
  itemTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111",
  },
  itemChecked: {
    textDecorationLine: "line-through",
    color: "#8c8c8c",
  },
  itemMeta: {
    marginTop: 6,
    color: "#666",
    fontSize: 13,
  },
  itemRight: {
    width: 120,
    alignItems: "center",
    justifyContent: "center",
  },
  controlBox: {
    width: 110,
    backgroundColor: "#F6F6F8",
    borderRadius: 26,
    paddingVertical: 8,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "space-between",
    flexDirection: "row",
  },
  controlIcon: {
    paddingHorizontal: 6,
  },
  qtyBadge: {
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#eee",
  },
  qtyText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
  },
  // Modal
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
    elevation: 8,
  },
  modalScrollContent: {
    paddingBottom: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 12,
    color: "#111",
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#555",
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#222",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },
  qtyRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FAFAFB",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    justifyContent: "space-between",
    width: 140,
  },
  qtyNumber: {
    fontSize: 18,
    fontWeight: "700",
    marginHorizontal: 8,
  },
  dateInput: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#FAFBFF",
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
  },
  dateText: {
    color: "#333",
    fontSize: 16,
  },
  datePickerContainer: {
    marginTop: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  addItemButton: {
    marginTop: 20,
    backgroundColor: "#14b8a6",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  addItemButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  cancelButton: {
    marginTop: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#666",
    fontWeight: "600",
    fontSize: 16,
  },
});
