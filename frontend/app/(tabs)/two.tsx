import {
  StyleSheet,
  Button,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
  Alert,
  Keyboard,
  TouchableWithoutFeedback,
  RefreshControl,
  Modal,
  Platform,
  ScrollView,
  Pressable,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { type SetStateAction, type Dispatch } from "react";
import { Ionicons } from "@expo/vector-icons";
import { router } from 'expo-router';
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
  name: string;
  added_by?: FridgeMate | null;
  shared_by?: FridgeMate[] | null;
  quantity?: number;
  days_till_expiration?: number;
  created_at?: string;
}

// Defines props type for the Item component
interface ItemProps {
  item: FoodItem;
  onDelete: (item: FoodItem) => void;
  onQuantityChange: (item: FoodItem, delta: number) => void;
  onEdit: (item: FoodItem) => void;
}

// Individual item component
const Item = ({ item, onDelete, onQuantityChange, onEdit }: ItemProps) => {
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

  const addedByName = item.added_by ? getDisplayName(item.added_by) : "Unknown";
  const sharedByString: string =
    item.shared_by && item.shared_by.length > 0
      ? item.shared_by.map((mate) => getDisplayName(mate)).join(", ")
      : "No one";

  const isExpiringSoon = (item.days_till_expiration || 0) <= 7;
  const qty = item.quantity ?? 1;

  const handleDelete = () => {
    Alert.alert(
      "Delete Item",
      `Are you sure you want to delete ${item}?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Yes", style: "destructive", onPress: () => onDelete(item) },
      ]
    );
  };

  return (
    <View style={styles.item}>
      <View style={styles.itemContent}>
        {/* Item info */}
        <View style={styles.itemLeft}>
          <View style={styles.itemTitleRow}>
            <Text style={styles.itemTitle} numberOfLines={2}>
              {item.name}
            </Text>
            <TouchableOpacity onPress={handleDelete} style={styles.deleteIcon}>
              <Ionicons name="trash-outline" size={20} color="#666" />
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
      <TouchableOpacity 
        onPress={() => onEdit(item)}
        style={styles.editButton}
      >
        <Ionicons name="create-outline" size={18} color="#666" />
      </TouchableOpacity>
    </View>
  );
};

export default function TabOneScreen() {
  const{ user } = useAuth();
  const [data, setData] = useState<FoodItem[]>([]); 
  const [searchValue, setSearchValue] = useState<string>("");
  
  // Edit modal state
  const [editItem, setEditItem] = useState<FoodItem | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState("");
  const [editQuantity, setEditQuantity] = useState("");
  const [editExpiryDate, setEditExpiryDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [editSharedBy, setEditSharedBy] = useState<string[]>([]);
  const [showUserPicker, setShowUserPicker] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [isLoadingEdit, setIsLoadingEdit] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

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

  const handleEdit = (item: FoodItem) => {
    setEditItem(item);
    setEditName(item.name);
    setEditQuantity(item.quantity?.toString() || "1");
    
    // Calculate expiry date from days_till_expiration
    if (item.days_till_expiration !== undefined) {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + item.days_till_expiration);
      setEditExpiryDate(expiryDate);
    } else {
      setEditExpiryDate(new Date());
    }
    
    // Set shared by user IDs
    if (item.shared_by && item.shared_by.length > 0) {
      const userIds = item.shared_by.map((mate: any) => mate.id).filter(Boolean);
      setEditSharedBy(userIds);
    } else {
      setEditSharedBy([]);
    }
    
    setShowEditModal(true);
  };

  // Fetch users for the shared by picker
  useEffect(() => {
    if (showUserPicker && users.length === 0) {
      fetchUsers();
    }
  }, [showUserPicker]);

  const fetchUsers = async () => {
    if (isLoadingUsers) return;
    setIsLoadingUsers(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`${API_URL}/fridge-mates/`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.data && Array.isArray(result.data)) {
          setUsers(result.data);
        }
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const getUserDisplayName = (user: any) => {
    if (user.first_name && user.last_name) {
      return `${user.first_name} ${user.last_name}`;
    }
    if (user.first_name) return user.first_name;
    if (user.name) return user.name;
    return user.email || "Unknown";
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const toggleUserSelection = (userId: string) => {
    setEditSharedBy((prev) => {
      if (prev.includes(userId)) {
        return prev.filter((id) => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };

  const getSelectedUsersDisplayText = () => {
    if (editSharedBy.length === 0) return "Select who's sharing (optional)...";
    
    const selectedUsers = users.filter((u) => editSharedBy.includes(u.id));
    if (selectedUsers.length === 0) return "Select who's sharing (optional)...";
    
    if (selectedUsers.length === 1) {
      return getUserDisplayName(selectedUsers[0]);
    }
    if (selectedUsers.length === 2) {
      return `${getUserDisplayName(selectedUsers[0])} and ${getUserDisplayName(selectedUsers[1])}`;
    }
    return `${getUserDisplayName(selectedUsers[0])}, ${getUserDisplayName(selectedUsers[1])}, and ${selectedUsers.length - 2} more`;
  };

  const handleSaveEdit = async () => {
    if (!editItem || !editName.trim()) {
      Alert.alert("Error", "Please enter an item name.");
      return;
    }

    setIsLoadingEdit(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        Alert.alert("Error", "You must be logged in to edit items");
        setIsLoadingEdit(false);
        return;
      }

      // Calculate days till expiration
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const expiry = new Date(editExpiryDate);
      expiry.setHours(0, 0, 0, 0);
      const daysTillExpiration = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      // Note: You'll need to create a PUT endpoint at /fridge_items/{item_id} on the backend
      const response = await fetch(`${API_URL}/fridge_items/${editItem.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          name: editName.trim(),
          quantity: editQuantity ? Number(editQuantity) : 1,
          expiry_date: editExpiryDate.toISOString().split("T")[0],
          shared_by: editSharedBy.length > 0 ? editSharedBy : null,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update item");
      }

      // Refresh the items list
      await fetchFridgeItems(false);
      
      setShowEditModal(false);
      setEditItem(null);
      Alert.alert("Success", "Item updated successfully!");
    } catch (error) {
      console.error("Error updating item:", error);
      Alert.alert("Error", error instanceof Error ? error.message : "Failed to update item");
    } finally {
      setIsLoadingEdit(false);
    }
  };

  const originalHolder = useRef<FoodItem[]>([]);
  const [selectedFilters, setSelectedFilters] = useState<string[]>([
    "All Items",
  ]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [hasLoadedOnce, setHasLoadedOnce] = useState<boolean>(false);

  // Fetch data from backend when component mounts - only once
  useEffect(() => {
    fetchFridgeItems(true);
  }, []);

  // Refresh when tab is focused, but only show refreshing indicator (not full loading screen)
  useFocusEffect(
    useCallback(() => {
      // Only refresh if we've already loaded once
      if (hasLoadedOnce) {
        fetchFridgeItems(false); // false = don't show full loading screen
      }
    }, [hasLoadedOnce])
  );


  const fetchFridgeItems = async (showFullLoading: boolean = true) => {
    try {
      if (showFullLoading) {
        setLoading(true);
      } else {
        // For pull-to-refresh, only use refreshing state
        setRefreshing(true);
      }
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
      setHasLoadedOnce(true);
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

  // Manual refresh handler - only refresh items, don't show full screen loading
  const onRefresh = () => {
    fetchFridgeItems(false);
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

  // Apply the search filter and SORT BY EXPIRATION
  const finalListData = filtered_data
    .filter((item) => {
      if (!searchValue) return true;
      const itemData = item.name.toUpperCase();
      const textData = searchValue.toUpperCase();
      return itemData.includes(textData);
    })
    .sort((a, b) => {
      // NEW: Sort by days_till_expiration ascending (soonest expiration first)
      const aDays = a.days_till_expiration || 999;
      const bDays = b.days_till_expiration || 999;
      return aDays - bDays;
    });


  const searchFunction = (text: string) => {
    setSearchValue(text);
  };

  // Loading state
  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: "center" }]}>
        <ActivityIndicator size="large" color="#14b8a6" />
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
          onPress={() => fetchFridgeItems(true)}
        >
          <Text style={styles.buttonLabel}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (data.length === 0) {
    return (
      <View style={{width: '100%', height: '100%'}}>
        <CustomHeader title="What's In Our Fridge? PLOY" />
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
    <CustomHeader title="What's In Our Kitchen?" />
    <ProfileIcon className="profileIcon" />
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <View style={styles.inputContainer}>
          <Ionicons name="search-outline" size={20} color="#94a3b8" style={styles.inputIcon} />
          <TextInput
            style={styles.searchInput}
            onChangeText={searchFunction}
            value={searchValue}
            placeholder="Search food items..."
            placeholderTextColor="#94a3b8"
          />
        </View>
      </View>
      
      <PreviewLayout
        values={["All Items", "Expiring Soon", "My Items", "Shared"]}
        selectedValue={selectedFilters}
        setSelectedValue={setSelectedFilters}
      />
      
      <FlatList
        data={finalListData}
        renderItem={({ item }) => (
          <Item
            item={item}
            onDelete={handleDelete}
            onQuantityChange={handleQuantityChange}
            onEdit={handleEdit}
          />
        )}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
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

    {/* Edit Modal */}
    {showEditModal && editItem && (
      <Modal
        transparent={true}
        animationType="slide"
        visible={showEditModal}
        onRequestClose={() => setShowEditModal(false)}
      >
        <Pressable 
          style={styles.modalOverlay} 
          onPress={() => setShowEditModal(false)} 
        />
        <View style={styles.editModalCard}>
          <ScrollView
            contentContainerStyle={styles.modalScrollContent}
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Item</Text>
              <TouchableOpacity
                onPress={() => setShowEditModal(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Item Name */}
            <Text style={styles.modalInputLabel}>Item Name *</Text>
            <View style={styles.modalInputContainer}>
              <Ionicons name="cube-outline" size={20} color="#94a3b8" style={styles.modalInputIcon} />
              <TextInput
                style={styles.modalInput}
                placeholder="Item name"
                placeholderTextColor="#94a3b8"
                value={editName}
                onChangeText={setEditName}
                editable={!isLoadingEdit}
              />
            </View>

            {/* Quantity */}
            <Text style={styles.modalInputLabel}>Quantity</Text>
            <View style={styles.modalInputContainer}>
              <Ionicons name="calculator-outline" size={20} color="#94a3b8" style={styles.modalInputIcon} />
              <TextInput
                style={styles.modalInput}
                placeholder="Quantity"
                placeholderTextColor="#94a3b8"
                value={editQuantity}
                onChangeText={setEditQuantity}
                keyboardType="numeric"
                editable={!isLoadingEdit}
              />
            </View>

            {/* Expiry Date */}
            <Text style={styles.modalInputLabel}>Expiry Date</Text>
            <TouchableOpacity
              style={styles.modalInputContainer}
              onPress={() => setShowDatePicker(true)}
              disabled={isLoadingEdit}
            >
              <Ionicons name="calendar-outline" size={20} color="#94a3b8" style={styles.modalInputIcon} />
              <Text style={[styles.modalInput, { color: editExpiryDate ? "#1e293b" : "#94a3b8" }]}>
                {formatDate(editExpiryDate)}
              </Text>
            </TouchableOpacity>

            {/* Shared By */}
            <Text style={styles.modalInputLabel}>Shared By</Text>
            <TouchableOpacity
              style={styles.modalInputContainer}
              onPress={() => {
                if (users.length === 0) fetchUsers();
                setShowUserPicker(true);
              }}
              disabled={isLoadingEdit}
            >
              <Ionicons name="people-outline" size={20} color="#94a3b8" style={styles.modalInputIcon} />
              <Text style={[styles.modalInput, { color: editSharedBy.length > 0 ? "#1e293b" : "#94a3b8" }]}>
                {getSelectedUsersDisplayText()}
              </Text>
            </TouchableOpacity>

            {/* Save Button */}
            <TouchableOpacity
              style={[styles.modalSaveButton, isLoadingEdit && styles.modalSaveButtonDisabled]}
              onPress={handleSaveEdit}
              disabled={isLoadingEdit}
            >
              <Text style={styles.modalSaveButtonText}>
                {isLoadingEdit ? "Saving..." : "Save Changes"}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    )}

    {/* Date Picker Modal */}
    {showDatePicker && Platform.OS === "ios" && (
      <Modal
        transparent={true}
        animationType="fade"
        visible={showDatePicker}
        onRequestClose={() => setShowDatePicker(false)}
      >
        <View style={styles.datePickerModalOverlay}>
          <View style={styles.datePickerModalCard}>
            <View style={styles.datePickerModalHeader}>
              <TouchableOpacity
                onPress={() => setShowDatePicker(false)}
                style={styles.datePickerModalButton}
              >
                <Text style={styles.datePickerModalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.datePickerModalTitle}>Select Date</Text>
              <TouchableOpacity
                onPress={() => setShowDatePicker(false)}
                style={styles.datePickerModalButton}
              >
                <Text style={styles.datePickerModalButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
            <DateTimePicker
              value={editExpiryDate}
              mode="date"
              display="inline"
              onChange={(event, date) => {
                if (date) setEditExpiryDate(date);
              }}
              minimumDate={new Date()}
            />
          </View>
        </View>
      </Modal>
    )}

    {showDatePicker && Platform.OS === "android" && (
      <DateTimePicker
        value={editExpiryDate}
        mode="date"
        display="default"
        onChange={(event, date) => {
          if (date) setEditExpiryDate(date);
          setShowDatePicker(false);
        }}
        minimumDate={new Date()}
      />
    )}

    {/* User Picker Modal */}
    {showUserPicker && (
      <Modal
        transparent={true}
        animationType="slide"
        visible={showUserPicker}
        onRequestClose={() => setShowUserPicker(false)}
      >
        <View style={styles.userPickerModalOverlay}>
          <View style={styles.userPickerModalCard}>
            <View style={styles.userPickerModalHeader}>
              <TouchableOpacity
                onPress={() => {
                  setEditSharedBy([]);
                  setShowUserPicker(false);
                }}
                style={styles.userPickerModalButton}
              >
                <Text style={styles.userPickerModalButtonText}>Clear All</Text>
              </TouchableOpacity>
              <Text style={styles.userPickerModalTitle}>Select Users</Text>
              <TouchableOpacity
                onPress={() => setShowUserPicker(false)}
                style={styles.userPickerModalButton}
              >
                <Text style={styles.userPickerModalButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.userPickerModalList}>
              {isLoadingUsers ? (
                <ActivityIndicator size="large" color="#14b8a6" style={{ marginTop: 20 }} />
              ) : (
                users.map((user) => (
                  <TouchableOpacity
                    key={user.id}
                    style={styles.userPickerOption}
                    onPress={() => toggleUserSelection(user.id)}
                  >
                    <View
                      style={[
                        styles.userPickerCheckbox,
                        editSharedBy.includes(user.id) && styles.userPickerCheckboxSelected,
                      ]}
                    >
                      {editSharedBy.includes(user.id) && (
                        <Ionicons name="checkmark" size={16} color="#fff" />
                      )}
                    </View>
                    <Text style={styles.userPickerOptionText}>
                      {getUserDisplayName(user)}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    )}
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
    justifyContent: "center",
  },
  filter_button: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#14b8a6",
    marginHorizontal: 4,
    marginBottom: 8,
    minWidth: "45%",
    alignItems: "center",
  },
  selected_filter_button: {
    backgroundColor: "#0d9488",
    borderWidth: 0,
  },
  buttonLabel: {
    fontSize: 15,
    fontWeight: "600",
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
    color: "#333",
  },
  
  searchContainer: {
    width: "100%",
    alignItems: "center",
    marginTop: 16,
    marginBottom: 10,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    borderRadius: 16,
    backgroundColor: "#f8fafc",
    paddingHorizontal: 16,
    paddingVertical: 4,
    width: "90%",
  },
  inputIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: "#1e293b",
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
    padding: 22,
    marginVertical: 8,
    borderRadius: 16,
    width: "95%",
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
    color: "#333",
    flex: 1,
    paddingRight: 8,
  },
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
  },
  editButton: {
    position: "absolute",
    bottom: 8,
    right: 8,
    padding: 6,
  },
  // Edit Modal Styles
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  editModalCard: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    zIndex: 1000,
  },
  modalScrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1e293b",
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  modalInputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748b",
    marginBottom: 8,
    marginTop: 16,
  },
  modalInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    borderRadius: 16,
    backgroundColor: "#f8fafc",
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: 4,
  },
  modalInputIcon: {
    marginRight: 12,
  },
  modalInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: "#1e293b",
  },
  modalSaveButton: {
    backgroundColor: "#14b8a6",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
  },
  modalSaveButtonDisabled: {
    opacity: 0.6,
  },
  modalSaveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  datePickerModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  datePickerModalCard: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },
  datePickerModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  datePickerModalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1e293b",
  },
  datePickerModalButton: {
    padding: 8,
  },
  datePickerModalButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#14b8a6",
  },
  userPickerModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  userPickerModalCard: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "80%",
  },
  userPickerModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  userPickerModalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1e293b",
  },
  userPickerModalButton: {
    padding: 8,
  },
  userPickerModalButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#14b8a6",
  },
  userPickerModalList: {
    maxHeight: 400,
  },
  userPickerOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  userPickerCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#14b8a6",
    marginRight: 12,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  userPickerCheckboxSelected: {
    backgroundColor: "#14b8a6",
  },
  userPickerOptionText: {
    flex: 1,
    fontSize: 16,
    color: "#1e293b",
  },
});

