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
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from "react-native";
import { type SetStateAction, type Dispatch } from "react";
import { Ionicons } from "@expo/vector-icons";
import { router } from 'expo-router';
import EditScreenInfo from "@/components/EditScreenInfo";
import { Text, View } from "@/components/Themed";
import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import type { PropsWithChildren } from "react";
import { supabase } from "../utils/client";
import { useAuth } from "../context/authContext";
import CustomHeader from "@/components/CustomHeader";
import ProfileIcon from "@/components/ProfileIcon";
import { useFocusEffect } from "@react-navigation/native";
import DateTimePicker from "@react-native-community/datetimepicker";
import CustomButton from "@/components/CustomButton";
import { UpdateFridgeItem } from "../api/AddItemToFridge";

const API_URL = `${process.env.EXPO_PUBLIC_API_URL}`; // Backend API endpoint

// just to note, we should prob figure out what to do when the food goes past the expiration date

// --- Type Definitions ---

interface FridgeMate {
  id?: string;
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
      <TouchableOpacity onPress={handleDelete} style={styles.deleteIcon}>
        <Ionicons name="trash-outline" size={18} color="#666" />
      </TouchableOpacity>
      <View style={styles.itemContent}>
        {/* Item info */}
        <View style={styles.itemLeft}>
          <View style={styles.itemTitleRow}>
            <Text style={styles.itemTitle} numberOfLines={2}>
              {item.name}
            </Text>
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
      
      {/* Edit Button - Bottom Right */}
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
  
  const handleEdit = async (item: FoodItem) => {
    setEditItem(item);
    setEditName(item.name);
    setEditQuantity(item.quantity?.toString() || "1");
    
    // Calculate expiry date from days_till_expiration
    const expiryDate = new Date();
    if (item.days_till_expiration !== undefined) {
      expiryDate.setDate(expiryDate.getDate() + item.days_till_expiration);
    }
    setEditExpiryDate(expiryDate);
    
    // Fetch users first
    await fetchUsers();
    
    // Extract user IDs from shared_by array - check if IDs are already present
    const sharedByIds: string[] = [];
    if (item.shared_by && item.shared_by.length > 0) {
      item.shared_by.forEach((mate: FridgeMate) => {
        if (mate.id) {
          sharedByIds.push(mate.id);
        }
      });
    }
    setEditSharedBy(sharedByIds);
    
    setShowEditModal(true);
  };
  
  const fetchUsers = async () => {
    try {
      setIsLoadingUsers(true);
      const response = await fetch(`${API_URL}/users/`);
      const data = await response.json();
      if (data.data && data.data.length > 0) {
        setUsers(data.data);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setIsLoadingUsers(false);
    }
  };
  
  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };
  
  const getUserDisplayName = (u: any) => {
    if (u?.first_name) {
      return `${u.first_name} ${u.last_name || ""}`.trim();
    }
    if (u?.user_metadata?.first_name) {
      return `${u.user_metadata.first_name} ${u.user_metadata.last_name || ""}`.trim();
    }
    return u?.email || "Unknown";
  };
  
  const getSelectedUsersDisplayText = () => {
    if (editSharedBy.length === 0) {
      return "Select who's sharing (optional)...";
    }
    
    // Always try to show names if users are available
    if (users.length > 0) {
      const selectedUsers = users.filter((u: any) => {
        if (!u?.id) return false;
        return editSharedBy.includes(u.id);
      });
      
      if (selectedUsers.length > 0) {
        if (selectedUsers.length === 1) {
          return getUserDisplayName(selectedUsers[0]);
        }
        
        // Show up to 2 names, then "and X more"
        if (selectedUsers.length <= 2) {
          return selectedUsers.map(getUserDisplayName).join(", ");
        }
        
        return `${getUserDisplayName(selectedUsers[0])}, ${getUserDisplayName(selectedUsers[1])} and ${selectedUsers.length - 2} more`;
      }
    }
    
    // Fallback: show count if users not loaded or not found
    return `${editSharedBy.length} ${editSharedBy.length === 1 ? "person" : "people"} selected`;
  };
  
  const handleUpdateItem = async () => {
    if (!editItem || !editName.trim()) {
      Alert.alert("Error", "Please enter an item name.");
      return;
    }

    setIsLoadingEdit(true);
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error || !session) {
      Alert.alert("Error", "You must be logged in to edit items");
      setIsLoadingEdit(false);
      return;
    }

    try {
      const response = await UpdateFridgeItem(
        session.access_token,
        editItem.id,
        editName,
        editQuantity,
        editExpiryDate,
        editSharedBy,
        undefined // price
      );

      const result = await response.json();

      if (response.ok) {
        // Refresh the data
        await fetchFridgeItems(false);
        setShowEditModal(false);
        setEditItem(null);
        Alert.alert("Success!", "Item updated successfully!");
      } else {
        throw new Error(result.detail || result.message || "Failed to update item");
      }
    } catch (error: any) {
      console.error("Error updating item:", error);
      Alert.alert("Error", error.message || "Failed to update item");
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


  const fetchFridgeItems = async (showFullLoading: boolean = false) => {
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
        style={styles.flatList}
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
    
    {/* Edit Modal */}
    {showEditModal && editItem && (
      <Modal
        transparent={true}
        animationType="none"
        visible={showEditModal}
        onRequestClose={() => setShowEditModal(false)}
      >
        <Pressable style={styles.editModalOverlay} onPress={() => setShowEditModal(false)} />
        
        <View style={styles.editModalCard}>
          <ScrollView 
            contentContainerStyle={styles.editModalScrollContent} 
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.editModalTitle}>Edit Item</Text>
            
            {/* Item Name */}
            <Text style={styles.editInputLabel}>Item Name *</Text>
            <View style={styles.editInputContainer}>
              <Ionicons name="cube-outline" size={20} color="#94a3b8" style={styles.editInputIcon} />
              <TextInput
                style={styles.editInput}
                value={editName}
                onChangeText={setEditName}
                placeholder="Enter item name"
                placeholderTextColor="#94a3b8"
              />
            </View>
            
            {/* Quantity */}
            <Text style={styles.editInputLabel}>Quantity</Text>
            <View style={styles.editInputContainer}>
              <Ionicons name="basket-outline" size={20} color="#94a3b8" style={styles.editInputIcon} />
              <TextInput
                style={styles.editInput}
                value={editQuantity}
                onChangeText={setEditQuantity}
                placeholder="1"
                placeholderTextColor="#94a3b8"
                keyboardType="numeric"
              />
            </View>
            
            {/* Expiry Date with inline picker */}
            <Text style={styles.editInputLabel}>Expiry Date</Text>
            <TouchableOpacity
              style={styles.editDateInput}
              onPress={() => setShowDatePicker(!showDatePicker)}
            >
              <Text style={styles.editDateText}>
                {formatDate(editExpiryDate)}
              </Text>
              <Ionicons name="calendar-outline" size={20} color="#222" />
            </TouchableOpacity>
            
            {showDatePicker && (
              <View style={styles.editDatePickerContainer}>
                <DateTimePicker
                  value={editExpiryDate}
                  mode="date"
                  display={Platform.OS === "ios" ? "inline" : "default"}
                  onChange={(event, selectedDate) => {
                    if (selectedDate) {
                      setEditExpiryDate(selectedDate);
                    }
                    if (Platform.OS !== "ios") {
                      setShowDatePicker(false);
                    }
                  }}
                  minimumDate={new Date()}
                />
              </View>
            )}
            
            {/* Shared By */}
            <Text style={styles.editInputLabel}>Shared By</Text>
            <TouchableOpacity
              style={styles.editInputContainer}
              onPress={async () => {
                // Always fetch users to ensure we have the latest data
                if (users.length === 0) {
                  await fetchUsers();
                }
                setShowUserPicker(true);
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="people-outline" size={20} color="#94a3b8" style={styles.editInputIcon} />
              <View key={`shared-by-wrapper-${editSharedBy.join('-')}-${users.length}`}>
                <Text style={editSharedBy.length > 0 ? styles.editUserPickerText : styles.editUserPickerPlaceholder}>
                  {getSelectedUsersDisplayText()}
                </Text>
              </View>
            </TouchableOpacity>
            
            {/* User Picker - Inline dropdown */}
            {showUserPicker && (
              <View style={styles.editUserPickerContainer}>
                <View style={styles.editUserPickerHeader}>
                  <TouchableOpacity
                    onPress={() => {
                      setEditSharedBy([]);
                      setShowUserPicker(false);
                    }}
                    style={styles.userPickerButton}
                  >
                    <Text style={styles.userPickerButtonText}>Clear All</Text>
                  </TouchableOpacity>
                  <Text style={styles.editUserPickerTitle}>Select Users</Text>
                  <TouchableOpacity
                    onPress={() => setShowUserPicker(false)}
                    style={styles.userPickerButton}
                  >
                    <Text style={styles.userPickerButtonText}>Done</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.editUserListContainer} nestedScrollEnabled>
                  {isLoadingUsers ? (
                    <View style={styles.loadingUsersContainer}>
                      <ActivityIndicator size="small" color="#14b8a6" />
                      <Text style={styles.loadingUsersText}>Loading users...</Text>
                    </View>
                  ) : users.length === 0 ? (
                    <View style={styles.loadingUsersContainer}>
                      <Text style={styles.loadingUsersText}>No users found</Text>
                    </View>
                  ) : (
                    users.map((user: any) => {
                      return (
                        <TouchableOpacity
                          key={user.id}
                          style={styles.userOption}
                          onPress={() => {
                            setEditSharedBy((prev) => {
                              if (prev.includes(user.id)) {
                                return prev.filter((id) => id !== user.id);
                              } else {
                                return [...prev, user.id];
                              }
                            });
                          }}
                        >
                          <View
                            style={[
                              styles.checkbox,
                              editSharedBy.includes(user.id) && styles.checkboxSelected,
                            ]}
                          >
                            {editSharedBy.includes(user.id) && (
                              <Text style={styles.checkmarkText}>✓</Text>
                            )}
                          </View>
                          <Text style={styles.userOptionText}>
                            {getUserDisplayName(user)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })
                  )}
                </ScrollView>
              </View>
            )}
            
            {/* Update Button */}
            <TouchableOpacity 
              style={styles.editUpdateButton} 
              onPress={handleUpdateItem}
              disabled={isLoadingEdit}
            >
              <Text style={styles.editUpdateButtonText}>
                {isLoadingEdit ? "Updating..." : "Update Item"}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={() => setShowEditModal(false)} 
              style={styles.editCancelButton}
            >
              <Text style={styles.editCancelText}>Cancel</Text>
            </TouchableOpacity>
          </ScrollView>
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
    width: "100%",
    alignItems: "center",
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
    marginTop: 10,
    marginBottom: 10,
    paddingHorizontal: 20,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    maxWidth: 600,
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
  searchInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: "#1e293b",
  },
  flatList: {
    width: "100%",
    flex: 1,
  },
  listContent: {
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  // Item Card Styles
  item: {
    backgroundColor: "#ffffff",
    padding: 18,
    marginVertical: 8,
    borderRadius: 16,
    width: "100%",
    maxWidth: 600,
    alignSelf: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    position: "relative",
  },
  itemContent: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  itemLeft: {
    flex: 1,
    marginRight: 12,
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
    position: "absolute",
    top: 12,
    right: 12,
    padding: 6,
    zIndex: 10,
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
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 8,
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
    bottom: 12,
    right: 12,
    padding: 6,
    zIndex: 10,
  },
  // Edit Modal Styles - matching shopping list modal
  editModalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  editModalCard: {
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
    zIndex: 1000,
  },
  editModalScrollContent: {
    padding: 10,
  },
  editModalTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 12,
    color: "#333",
  },
  editInputLabel: {
    fontSize: 13,
    color: "#555",
    marginBottom: 6,
  },
  editInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E8E8E8",
    borderRadius: 12,
    padding: 12,
    backgroundColor: "#FAFBFF",
  },
  editDateInput: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: "#FAFBFF",
    borderWidth: 1,
    borderColor: "#E8E8E8",
    marginBottom: 12,
  },
  editDatePickerContainer: {
    marginTop: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  editInputIcon: {
    marginRight: 12,
  },
  editInput: {
    flex: 1,
    fontSize: 16,
    color: "#333",
  },
  editDateText: {
    color: "#333",
    fontSize: 16,
  },
  editUserPickerText: {
    flex: 1,
    fontSize: 16,
    color: "#333",
  },
  editUserPickerPlaceholder: {
    flex: 1,
    fontSize: 16,
    color: "#888",
  },
  editUpdateButton: {
    marginTop: 14,
    backgroundColor: "#14b8a6",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    width: "100%",
  },
  editUpdateButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  editCancelButton: {
    marginTop: 8,
    alignSelf: "center",
  },
  editCancelText: {
    color: "#666",
    fontSize: 14,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    backgroundColor: "#FAFBFC",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalButton: {
    padding: 8,
  },
  modalButtonText: {
    fontSize: 16,
    color: "#14b8a6",
    fontWeight: "600",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
  },
  popupBox: {
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingVertical: 0,
    paddingHorizontal: 0,
    width: "90%",
    maxWidth: 400,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
    overflow: "hidden",
  },
  pickerWrapper: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 5,
    paddingTop: 5,
    paddingBottom: 15,
    backgroundColor: "#FAFBFC",
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  datePickerIOS: {
    alignSelf: "center",
    width: "100%",
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#007AFF",
    marginRight: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxSelected: {
    backgroundColor: "#007AFF",
  },
  checkmarkText: {
    color: "white",
    fontSize: 50,
    fontWeight: "bold",
  },
  userListContainer: {
    maxHeight: 300,
  },
  userOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  userOptionText: {
    flex: 1,
    fontSize: 16,
    color: "#333",
  },
  loadingUsersContainer: {
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingUsersText: {
    marginTop: 8,
    fontSize: 14,
    color: "#666",
  },
  editUserPickerContainer: {
    marginTop: 12,
    marginBottom: 12,
    backgroundColor: "#FAFBFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E8E8E8",
    maxHeight: 300,
    overflow: "hidden",
  },
  editUserPickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    backgroundColor: "#FAFBFF",
  },
  editUserPickerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  editUserListContainer: {
    maxHeight: 250,
  },
  userPickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  userPickerButton: {
    padding: 4,
  },
  userPickerButtonText: {
    fontSize: 16,
    color: "#14b8a6",
    fontWeight: "600",
  },
});

