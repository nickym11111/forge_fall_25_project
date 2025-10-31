import React, { useEffect, useRef, useState } from "react";
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
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import CustomHeader from "@/components/CustomHeader";
import CustomCheckbox from "@/components/CustomCheckbox";
import ProfileIcon from "@/components/ProfileIcon";

interface ShoppingItem {
  id?: string;
  name: string;
  quantity: number;
  need_by?: string;
  requested_by?: string;
  checked?: boolean;
}

const API_URL = `${process.env.EXPO_PUBLIC_API_URL}/shopping`;

//Helper Functions
const formatShortDate = (d: Date) => {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  return `${mm}/${dd}/${yy}`;
};

const isoToShort = (iso?: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return formatShortDate(d);
};

export default function SharedListScreen() {
  // ---------- State ----------
  const [items, setItems] = useState<ShoppingItem[]>([]);

  // Modal + fade animation
  const [modalOpen, setModalOpen] = useState(false);
  //const fadeAnim = useRef(new Animated.Value(0)).current;

  // Add form
  const [formName, setFormName] = useState("");
  const [formQuantity, setFormQuantity] = useState<number>(1);
  const [formNeedBy, setFormNeedBy] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  /*
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: modalOpen ? 1 : 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [modalOpen]);
*/

  const resetForm = () => {
    setFormQuantity(1);
    setFormNeedBy(null);
    setShowDatePicker(false);
  };

  const openModal = () => {
    resetForm();
    setModalOpen(true);
  };

  const closeModal = () => setModalOpen(false);

  //Actions
  const addItem = async () => {
    if (!formName.trim()) return;

    const newItem: ShoppingItem = {
      name: formName.trim(),
      quantity: Math.max(1, Math.floor(formQuantity)),
      need_by: formNeedBy ? formNeedBy.toISOString().split("T")[0] : undefined,
      requested_by: "You",
      checked: false,
    };

    setItems((prev) => [...prev, newItem]);
    setFormName("");
    closeModal();

    try {
      const resp = await fetch(`${API_URL}/items/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newItem),
      });
      const data = await resp.json();

      if (resp.ok && data?.data?.length) {
        const returned = data.data[0];
        setItems((prev) => {
          const idx = prev.findIndex(
            (it) => !it.id && it.name === returned.name
          );
          if (idx !== -1) {
            const copy = [...prev];
            copy[idx] = returned;
            return copy;
          }
          return [...prev, returned];
        });
      }
    } catch (err) {
      console.error("addItem error:", err);
    }
  };

  const deleteItem = async (item: ShoppingItem) => {
    setItems((prev) => prev.filter((i) => i !== item));
    if (!item.id) return;

    try {
      await fetch(`${API_URL}/items/${item.id}`, { method: "DELETE" });
    } catch (err) {
      console.error("deleteItem error:", err);
    }
  };

  const changeItemQuantity = async (item: ShoppingItem, delta: number) => {
    const newQty = Math.max(1, (item.quantity || 1) + delta);
    const updated = { ...item, quantity: newQty };
    setItems((prev) => prev.map((it) => (it === item ? updated : it)));

    if (!item.id) return;
    try {
      await fetch(`${API_URL}/items/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
    } catch (err) {
      console.error("changeItemQuantity error:", err);
    }
  };

  const toggleChecked = async (item: ShoppingItem) => {
    const updated = { ...item, checked: !item.checked };
    setItems((prev) => prev.map((it) => (it === item ? updated : it)));

    if (!item.id) return;
    try {
      await fetch(`${API_URL}/items/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
    } catch (err) {
      console.error("toggleChecked error:", err);
    }
  };

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
                Requested by {item.requested_by ?? "You"}
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
      <CustomHeader title="Shared Shopping List 🛒" />
      <ProfileIcon className="profileIcon" />
      {/* Top Card (Add Item quick input) */}
      <View style={styles.topCard}>
        <Text style={styles.cardTitle}>Add Item</Text>

        <View style={styles.topRow}>
          <TextInput
            style={styles.topInput}
            placeholder="Item name..."
            placeholderTextColor="#888"
            value={formName}
            onChangeText={setFormName}
          />
          <TouchableOpacity style={styles.plusBtn} onPress={openModal}>
            <Ionicons name="add" size={28} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Items</Text>
      </View>

      <FlatList
        data={items}
        keyExtractor={(it, i) => it.id ?? `${it.name}-${i}`}
        renderItem={renderItemCard}
        contentContainerStyle={styles.itemsList}
      />

      {/* Popup (Add Item) */}
      <Modal
        visible={modalOpen}
        transparent
        animationType="none"
        onRequestClose={closeModal}
      >
        <Pressable style={styles.modalOverlay} onPress={closeModal} />

        <View style={[styles.modalCard]}>
          <ScrollView
            contentContainerStyle={{ padding: 10 }}
            nestedScrollEnabled
          >
            <Text style={styles.modalTitle}>Add Item</Text>

            {/* Name */}
            <Text style={styles.inputLabel}>Item Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="eg. Milk, Eggs, Bread"
              placeholderTextColor="#888"
              value={formName}
              onChangeText={setFormName}
            />

            {/* Quantity + Need By */}
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Quantity</Text>
                <View style={styles.qtyRow}>
                  <TouchableOpacity
                    onPress={() =>
                      setFormQuantity(Math.max(1, formQuantity - 1))
                    }
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
                    <Ionicons
                      name="add-circle-outline"
                      size={25}
                      color="#222"
                    />
                  </TouchableOpacity>
                </View>
              </View>

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
                onChange={onChangeNeedBy}
              />
            )}

            {/* Add Button */}
            <TouchableOpacity style={styles.addItemButton} onPress={addItem}>
              <Text style={styles.addItemButtonText}>Add Item</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={closeModal}
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

//Styles
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F7F8FC" },

  //Header top card
  topCard: {
    margin: 18,
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
  topRow: { flexDirection: "row", alignItems: "center" },
  topInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E6E6E6",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#FAFAFB",
    fontSize: 16,
  },
  plusBtn: {
    marginLeft: 12,
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#14b8a6",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#6C63FF",
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },

  // Section headers
  section: {
    marginHorizontal: 22,
    marginTop: 6,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#2C2C54",
  },

  // Item cards
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
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 12,
  },

  // Inputs
  inputLabel: {
    fontSize: 13,
    color: "#555",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E8E8E8",
    borderRadius: 12,
    padding: 12,
    backgroundColor: "#FAFBFF",
    fontSize: 16,
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
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: "#FAFBFF",
    borderWidth: 1,
    borderColor: "#E8E8E8",
  },
  dateText: {
    color: "#333",
  },

  // Buttons
  addItemButton: {
    marginTop: 14,
    backgroundColor: "#14b8a6",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  addItemButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
});
