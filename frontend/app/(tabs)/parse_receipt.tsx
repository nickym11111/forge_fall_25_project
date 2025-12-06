import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  Platform,
  StyleSheet,
  Alert,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  TextInput,
  Keyboard,
  TouchableWithoutFeedback,
  Pressable,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { File } from "expo-file-system";
import { CreateParseReceiptRequest } from "../api/ParseReceipt";
import CustomHeader from "@/components/CustomHeader";
import CustomButton from "@/components/CustomButton";

import { supabase } from "../utils/client";
import { AddItemToFridge, PredictExpiryDate } from "../api/AddItemToFridge";
import { Modal } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../context/authContext";
import { router } from "expo-router";

export default function ParseReceiptScreen() {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [responseText, setResponseText] = useState("");
  const [parsedItems, setParsedItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [addingItemIndex, setAddingItemIndex] = useState<number[]>([]);
  const [isAddingAll, setIsAddingAll] = useState(false);
  const [isAddingSelected, setIsAddingSelected] = useState(false);
  const [sharingWith, setSharingWith] = useState<string[]>([]);
  const [isShareModalVisible, setIsShareModalVisible] = useState(false);
  const [fridgeMates, setFridgeMates] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [userSession, setUserSession] = useState<any>(null);
  const { user } = useAuth();

  // Add Item Modal State
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [itemTitle, setItemTitle] = useState("");
  const [itemQuantity, setItemQuantity] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [itemExpiryDate, setItemExpiryDate] = useState<Date>(new Date());
  const [tempItemExpiryDate, setTempItemExpiryDate] = useState<Date>(
    new Date()
  );
  const [showItemDatePicker, setShowItemDatePicker] = useState(false);
  const [showItemUserPicker, setShowItemUserPicker] = useState(false);
  const [itemSharedByUserIds, setItemSharedByUserIds] = useState<string[]>([]);
  const [itemUsers, setItemUsers] = useState<any[]>([]);
  const [isAddingItem, setIsAddingItem] = useState<boolean>(false);
  const [isLoadingItemAI, setIsLoadingItemAI] = useState<boolean>(false);
  const [itemAiSuggested, setItemAiSuggested] = useState<boolean>(false);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: false,
      quality: 1,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  useEffect(() => {
    if (imageUri) {
      parseReceipt();
    }
  }, [imageUri]);

  // fetches the user's fridge mates
  const fetchFridgeMates = async () => {
    if (!user || !user.fridgeMates) return;

    try {
      const mates =
        user.fridgeMates?.map((mate) => ({
          id: mate.id,
          name: `${mate.first_name} ${mate.last_name}` || "Unknown User",
        })) || [];
      setFridgeMates(mates);
    } catch (error) {
      console.error("Error fetching fridge mates:", error);
      setFridgeMates([]);
    }
  };

  // fetches the user's session
  const getSession = async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.error("Error getting session:", error);
      return null;
    }
    setUserSession(data.session);
  };

  useEffect(() => {
    getSession();
  }, []);

  useEffect(() => {
    if (userSession) {
      fetchFridgeMates();
    }
  }, [userSession]);

  interface ApiResponse {
    data?: any;
    message: string;
    detail?: string;
  }

  // toggles the fridge mate
  const toggleFridgeMate = (userId: string) => {
    setSharingWith((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  // toggles the item selection
  const toggleItemSelection = (index: number) => {
    setSelectedItems((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  // sends the item to the user's fridge
  const sendItemToFridge = async (item: any) => {
    if (!userSession || !userSession.access_token) {
      Alert.alert("Error", "User not logged in");
      return;
    }

    if (!item.sharedWith) {
      item.sharedWith = [...sharingWith];
    }
    const newExpiryDate = new Date(); // Default to today

    try {
      const ExpiryDateResponse = await PredictExpiryDate(item.name);
      const ExpiryDateData = await ExpiryDateResponse.json();
      console.log(" Response data:", ExpiryDateData);

      if (ExpiryDateData.days) {
        const days = parseInt(ExpiryDateData.days);
        console.log(" AI predicted", days, "days for", item.name);
        newExpiryDate.setDate(newExpiryDate.getDate() + days);
      }
    } catch (expiryError) {
      console.warn(
        " Failed to predict expiry date, using default:",
        expiryError
      );
      // Continue with default date (today)
    }

    const AddItemToFridgeResponse = await AddItemToFridge(
      userSession.access_token,
      item.name,
      item.quantity,
      newExpiryDate,
      item.sharedWith || [],
      item.price
    );

    const data: ApiResponse = await AddItemToFridgeResponse.json();
    console.log("Response status:", AddItemToFridgeResponse.status);
    console.log("Response data:", data);

    if (!AddItemToFridgeResponse.ok) {
      Alert.alert(
        "Error",
        data.detail || data.message || "Failed to add item."
      );
    }

    setAddingItemIndex((prev) => prev.filter((i) => i !== item.index));
  };

  const parseReceipt = async (retryCount = 0) => {
    if (!imageUri) {
      alert("Please select an image first!");
      return;
    }

    try {
      setIsLoading(true);
      setResponseText(retryCount === 0 ? "Parsing receipt..." : "Retrying...");
      setSelectedItems([]);
      setAddingItemIndex([]);
      setSharingWith([]);

      let base64Image: string;

      if (Platform.OS === "web") {
        const response = await fetch(imageUri);
        const blob = await response.blob();
        base64Image = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () =>
            resolve((reader.result as string).split(",")[1]);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } else {
        const file = new File(imageUri);
        base64Image = file.base64Sync();
      }
      const response = await CreateParseReceiptRequest(base64Image);

      // Log the raw response to debug
      console.log("Raw API response:", response);

      // Check if response is already an object or needs parsing
      let parsed;
      if (typeof response === "string") {
        parsed = JSON.parse(response);
      } else {
        parsed = response;
      }

      // Validate that we got valid data
      if (!parsed || !Array.isArray(parsed) || parsed.length === 0) {
        throw new Error("Invalid response format from receipt parser");
      }

      setParsedItems(parsed);
      console.log("Parsed items:", parsed);
      setResponseText("");

      setResponseText(JSON.stringify(parsed, null, 2));
    } catch (error) {
      console.error("Parsing error:", error);

      // Retry once if this is the first attempt
      if (retryCount === 0) {
        console.log("First parsing attempt failed, retrying...");
        await parseReceipt(1);
      } else {
        // Second attempt failed, warn the user
        setResponseText("");
        Alert.alert(
          "Parsing Failed",
          "Unable to parse the receipt. Please try with a clearer image or ensure the receipt is fully visible.",
          [{ text: "OK" }]
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Add Item Modal Helper Functions
  const API_URL = `${process.env.EXPO_PUBLIC_API_URL}`;

  useEffect(() => {
    if (showAddItemModal && itemUsers.length === 0) {
      fetchItemUsers();
    }
  }, [showAddItemModal]);

  const fetchItemUsers = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`${API_URL}/fridge-members/`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.data && Array.isArray(result.data)) {
          setItemUsers(result.data);
        } else {
          // Fallback to fridgeMates from user context
          if (user?.fridgeMates) {
            setItemUsers(
              user.fridgeMates.map((mate: any) => ({
                id: mate.id,
                first_name: mate.first_name,
                last_name: mate.last_name,
                email: mate.email,
              }))
            );
          }
        }
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      if (user?.fridgeMates) {
        setItemUsers(
          user.fridgeMates.map((mate: any) => ({
            id: mate.id,
            first_name: mate.first_name,
            last_name: mate.last_name,
            email: mate.email,
          }))
        );
      }
    }
  };

  const getItemUserDisplayName = (user: any) => {
    if (user.first_name && user.last_name) {
      return `${user.first_name} ${user.last_name}`;
    }
    if (user.first_name) return user.first_name;
    if (user.name) return user.name;
    return user.email || "Unknown";
  };

  const formatItemDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const handleAddItemSubmit = async () => {
    if (!itemTitle.trim()) {
      Alert.alert("Error", "Please enter an item name.");
      return;
    }

    setIsAddingItem(true);
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error || !session) {
      Alert.alert("Error", "You must be logged in to add items");
      setIsAddingItem(false);
      return;
    }

    try {
      const response = await AddItemToFridge(
        session.access_token,
        itemTitle,
        itemQuantity,
        itemExpiryDate,
        itemSharedByUserIds,
        itemPrice ? Number(itemPrice) : undefined
      );
      
      const data = await response.json();

      if (response.ok) {
        Alert.alert("Success!", "Item added to kitchen!", [
          {
            text: "OK",
            onPress: () => {
              // Reset form
              setItemTitle("");
              setItemQuantity("");
              setItemPrice("");
              setItemExpiryDate(new Date());
              setTempItemExpiryDate(new Date());
              setItemSharedByUserIds([]);
              setItemAiSuggested(false);
              setShowAddItemModal(false);
            },
          },
        ]);
      } else {
        throw new Error(data.detail || data.message || "Failed to add item");
      }
    } catch (error) {
      console.error("Error adding item:", error);
      Alert.alert(
        "Error",
        error instanceof Error
          ? error.message
          : "Could not add item. Please try again."
      );
    } finally {
      setIsAddingItem(false);
    }
  };

  const resetAddItemForm = () => {
    setItemTitle("");
    setItemQuantity("");
    setItemPrice("");
    setItemExpiryDate(new Date());
    setTempItemExpiryDate(new Date());
    setItemSharedByUserIds([]);
    setItemAiSuggested(false);
  };

  const getSelectedItemUsersText = () => {
    if (itemSharedByUserIds.length === 0)
      return "Select who's sharing (optional)...";
    if (itemSharedByUserIds.length === 1) {
      const user = itemUsers.find((u) => u.id === itemSharedByUserIds[0]);
      return user ? getItemUserDisplayName(user) : "1 person selected";
    }
    return `${itemSharedByUserIds.length} people selected`;
  };

  const toggleItemUserSelection = (userId: string) => {
    setItemSharedByUserIds((prev) => {
      if (prev.includes(userId)) {
        return prev.filter((id) => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };

  const onItemDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      setShowItemDatePicker(false);
      if (selectedDate) {
        setItemExpiryDate(selectedDate);
        setItemAiSuggested(false);
      }
    } else {
      // iOS inline picker - update temp date as user selects
      if (selectedDate) {
        setTempItemExpiryDate(selectedDate);
        setItemExpiryDate(selectedDate);
        setItemAiSuggested(false);
      }
    }
  };

  const confirmItemDateSelection = () => {
    setItemExpiryDate(tempItemExpiryDate);
    setShowItemDatePicker(false);
    setItemAiSuggested(false);
  };

  const cancelItemDateSelection = () => {
    setTempItemExpiryDate(itemExpiryDate);
    setShowItemDatePicker(false);
  };

  // Trigger AI date prediction when item name or quantity changes
  useEffect(() => {
    const predictExpiryForItem = async () => {
      // Only predict if we have a title and haven't manually set a date
      if (!itemTitle.trim() || itemAiSuggested || !itemQuantity) return;

      setIsLoadingItemAI(true);
      try {
        const response = await PredictExpiryDate(itemTitle);
        const data = await response.json();
        
        if (data.days) {
          const days = parseInt(data.days);
          const newExpiryDate = new Date();
          newExpiryDate.setDate(newExpiryDate.getDate() + days);
          setItemExpiryDate(newExpiryDate);
          setTempItemExpiryDate(newExpiryDate);
          setItemAiSuggested(true);
        }
      } catch (error) {
        console.warn("Failed to predict expiry date:", error);
      } finally {
        setIsLoadingItemAI(false);
      }
    };

    // Debounce the API call
    const timeoutId = setTimeout(() => {
      if (itemTitle.trim()) {
        predictExpiryForItem();
      }
    }, 800);

    return () => clearTimeout(timeoutId);
  }, [itemTitle, itemQuantity]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <CustomHeader
        title="Scan Receipt"
        subtitle="Take a photo or upload a receipt to automatically add items"
        noShadow={true}
        style={{
          marginBottom: 10,
        }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity
          style={styles.addItemButton}
          onPress={() => setShowAddItemModal(true)}
        >
          <Ionicons
            name="add"
            size={20}
            color="white"
            style={{ marginRight: 6 }}
          />
          <Text style={styles.addItemButtonText}>Add Item Manually</Text>
        </TouchableOpacity>

        <View style={styles.uploadSection}>
          <View style={styles.imageContainer}>
            <TouchableOpacity
              onPress={pickImage}
              activeOpacity={0.8}
              style={styles.imageTouchable}
            >
              {imageUri ? (
                <View style={styles.imageWrapper}>
                  <Image source={{ uri: imageUri }} style={styles.image} />
                  <View style={styles.imageOverlay}>
                    <View style={styles.overlayContent}>
                      <View style={styles.overlayIconCircle}>
                        <Ionicons
                          name="camera-outline"
                          size={28}
                          color="#14b8a6"
                        />
                      </View>
                      <Text style={styles.imageOverlayText}>
                        Tap to change image
                      </Text>
                    </View>
                  </View>
                </View>
              ) : (
                <View style={styles.imageSkeleton}>
                  <View style={styles.imageTextContainer}>
                    <View style={styles.iconCircle}>
                      <Ionicons name="camera" size={36} color="#14b8a6" />
                    </View>
                    <Text style={styles.skeletonTitle}>
                      Scan Receipt or Take Photo
                    </Text>
                    <Text style={styles.skeletonSubtitle}>
                      AI will automatically detect items and expiry dates
                    </Text>
                    <View style={styles.hintBadge}>
                      <Ionicons name="sparkles" size={16} color="#14b8a6" />
                      <Text style={styles.hintText}>Powered by AI</Text>
                    </View>
                  </View>
                </View>
              )}
            </TouchableOpacity>
          </View>
          {!imageUri && (
            <View style={styles.tipsCard}>
              <View style={styles.tipsHeader}>
                <Ionicons name="bulb-outline" size={20} color="#14b8a6" />
                <Text style={styles.tipsTitle}>Tips for best results</Text>
              </View>
              <View style={styles.tipsList}>
                <View style={styles.tipItem}>
                  <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                  <Text style={styles.tipText}>Ensure good lighting</Text>
                </View>
                <View style={styles.tipItem}>
                  <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                  <Text style={styles.tipText}>
                    Keep receipt flat and in focus
                  </Text>
                </View>
                <View style={styles.tipItem}>
                  <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                  <Text style={styles.tipText}>
                    Include all items in the frame
                  </Text>
                </View>
              </View>
            </View>
          )}
        </View>

        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#14b8a6" />
            <Text style={styles.loadingText}>Parsing receipt...</Text>
          </View>
        )}

        <Modal
          visible={isShareModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setIsShareModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  Share {selectedItems.length}{" "}
                  {selectedItems.length === 1 ? "Item" : "Items"}
                </Text>
                <TouchableOpacity
                  onPress={() => setIsShareModalVisible(false)}
                  style={styles.modalCloseButton}
                >
                  <Ionicons name="close" size={24} color="#64748b" />
                </TouchableOpacity>
              </View>

              <Text style={{ marginBottom: 16, color: "#64748b" }}>
                Select who you want to share these items with:
              </Text>

              <ScrollView style={{ maxHeight: 300 }}>
                {fridgeMates.map((mate) => (
                  <TouchableOpacity
                    key={mate.id}
                    style={styles.fridgeMateItem}
                    onPress={() => toggleFridgeMate(mate.id)}
                  >
                    <View
                      style={[
                        styles.checkbox,
                        sharingWith.includes(mate.id) && styles.checkboxChecked,
                      ]}
                    >
                      {sharingWith.includes(mate.id) && (
                        <Ionicons name="checkmark" size={16} color="white" />
                      )}
                    </View>
                    <Text style={styles.fridgeMateName}>{mate.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {parsedItems && parsedItems.length > 0 && (
          <View style={styles.itemsContainer}>
            <View style={styles.headerRow}>
              <Text style={styles.sectionTitle}>Detected Items</Text>
            </View>
            <View style={styles.buttonGroup}>
              <TouchableOpacity
                style={[styles.shareButton]}
                onPress={() => setIsShareModalVisible(true)}
              >
                <Ionicons name="people" size={18} color="#14b8a6" />
                <Text style={styles.shareButtonText}>
                  {sharingWith.length > 0
                    ? `Sharing (${sharingWith.length})`
                    : "Share"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.addButton, styles.addAllButton]}
                onPress={async () => {
                  if (
                    !parsedItems ||
                    parsedItems.length === 0 ||
                    isAddingAll ||
                    isAddingSelected
                  )
                    return;

                  try {
                    setIsAddingAll(true);

                    // Process all items in parallel
                    const results = await Promise.all(
                      parsedItems.map(async (item, index) => {
                        const itemName = Object.keys(item)[0];
                        const itemData = item[itemName];

                        try {
                          await sendItemToFridge({
                            name: itemName,
                            quantity: Math.ceil(itemData.quantity),
                            price: itemData.price,
                            index,
                            sharedWith: [...sharingWith],
                          });
                          return { success: true, index, name: itemName };
                        } catch (error) {
                          console.error(
                            `Error adding item ${itemName}:`,
                            error
                          );
                          return {
                            success: false,
                            index,
                            name: itemName,
                            error,
                          };
                        }
                      })
                    );

                    // Count successes and failures
                    const successCount = results.filter(
                      (r) => r.success
                    ).length;
                    const failedItems = results.filter((r) => !r.success);

                    // If all succeeded, clear everything
                    if (successCount === parsedItems.length) {
                      setParsedItems([]);
                      setSelectedItems([]);
                      setAddingItemIndex([]);

                      Alert.alert(
                        "Success",
                        `Successfully added all ${successCount} items to your fridge!`
                      );
                    }
                    // If some failed, only remove successful ones
                    else {
                      const successfulIndices = results
                        .filter((r) => r.success)
                        .map((r) => r.index);

                      setParsedItems((prev) =>
                        prev.filter(
                          (_, idx) => !successfulIndices.includes(idx)
                        )
                      );

                      setSelectedItems([]);
                      setAddingItemIndex([]);

                      Alert.alert(
                        "Partial Success",
                        `Added ${successCount} of ${parsedItems.length} 
                      items.\n${failedItems.length} item(s) failed and remain in the list.`
                      );
                    }
                  } catch (error) {
                    console.error("Unexpected error:", error);
                    Alert.alert(
                      "Error",
                      "An unexpected error occurred while processing your request."
                    );
                  } finally {
                    setIsAddingAll(false);
                  }
                }}
              >
                {isAddingAll ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.addButtonText}>Add All</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.addButton,
                  styles.addSelectedButton,
                  selectedItems.length === 0 && styles.addButtonDisabled,
                ]}
                onPress={async () => {
                  if (selectedItems.length === 0 || isAddingSelected) return;

                  try {
                    setIsAddingSelected(true);

                    // Process all items in parallel
                    const results = await Promise.all(
                      selectedItems.map(async (index) => {
                        const item = parsedItems[index];
                        const itemName = Object.keys(item)[0];
                        const itemData = item[itemName];

                        try {
                          await sendItemToFridge({
                            name: itemName,
                            quantity: Math.ceil(itemData.quantity),
                            price: itemData.price,
                            index,
                            sharedWith: [...sharingWith],
                          });
                          return { success: true, index };
                        } catch (error) {
                          console.error(
                            `Error adding item ${itemName}:`,
                            error
                          );
                          return { success: false, index, error };
                        }
                      })
                    );

                    // Update UI for all successfully added items
                    const successfulItems = results
                      .filter((r) => r.success)
                      .map((r) => r.index);

                    // Remove all processed items from the list
                    setParsedItems((prev) =>
                      prev.filter((_, idx) => !selectedItems.includes(idx))
                    );

                    // Show success message
                    const successCount = successfulItems.length;
                    if (successCount > 0) {
                      Alert.alert(
                        "Success",
                        `Successfully added ${successCount} item(s) to your fridge!`
                      );
                    }

                    // If some items failed, show a warning
                    if (successCount < selectedItems.length) {
                      Alert.alert(
                        "Partial Success",
                        `Added ${successCount} of ${selectedItems.length} items. Some items may not have been added.`
                      );
                    }

                    setSelectedItems([]);
                  } catch (error) {
                    console.error("Unexpected error:", error);
                    Alert.alert(
                      "Error",
                      "An unexpected error occurred while processing your request."
                    );
                  } finally {
                    setIsAddingSelected(false);
                  }
                }}
                disabled={
                  selectedItems.length === 0 || isAddingAll || isAddingSelected
                }
              >
                {isAddingSelected ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.addButtonText}>
                    Add Selected{" "}
                    {selectedItems.length > 0
                      ? `(${selectedItems.length})`
                      : ""}
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            {parsedItems.map((item, index) => {
              const itemName = Object.keys(item)[0];
              const itemData = item[itemName];
              const isAdding = addingItemIndex.includes(index);
              return (
                <View key={index} style={styles.itemCard}>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{itemName}</Text>
                    <View style={styles.itemMeta}>
                      <Text style={styles.itemMetaText}>
                        Qty: {itemData.quantity}
                      </Text>
                      {itemData.price && (
                        <>
                          <Text style={styles.itemMetaDivider}>•</Text>
                          <Text style={styles.itemMetaText}>
                            ${itemData.price.toFixed(2)}
                          </Text>
                        </>
                      )}
                    </View>
                  </View>
                  <View style={styles.buttonGroup}>
                    <TouchableOpacity
                      style={[
                        styles.checkboxButton,
                        selectedItems.includes(index) &&
                          styles.checkboxButtonSelected,
                        isAdding && styles.addButtonDisabled,
                      ]}
                      onPress={() => !isAdding && toggleItemSelection(index)}
                      disabled={isAdding}
                    >
                      {selectedItems.includes(index) && (
                        <Ionicons name="checkmark" size={16} color="white" />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Add Item Modal */}
      {showAddItemModal && (
        <Modal
          transparent={true}
          animationType="fade"
          visible={showAddItemModal}
          onRequestClose={() => {
            Keyboard.dismiss();
            resetAddItemForm();
            setShowAddItemModal(false);
          }}
        >
          <TouchableWithoutFeedback
            onPress={() => {
              Keyboard.dismiss();
              resetAddItemForm();
              setShowAddItemModal(false);
            }}
          >
            <View style={styles.addItemModalOverlay}>
              <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View style={styles.addItemModalCard}>
                  <View style={styles.addItemModalScrollContent}>
                    <View style={styles.addItemModalHeader}>
                      <Text style={styles.addItemModalTitle}>Add Item</Text>
                      <TouchableOpacity
                        onPress={() => {
                          Keyboard.dismiss();
                          resetAddItemForm();
                          setShowAddItemModal(false);
                        }}
                        style={styles.addItemModalCloseButton}
                      >
                        <Ionicons name="close" size={20} color="#64748b" />
                      </TouchableOpacity>
                    </View>

                    {/* Item Name */}
                    <Text style={styles.addItemModalLabel}>
                      Item Name <Text style={{ color: "#ef4444" }}>*</Text>
                    </Text>
                    <View style={styles.addItemModalInputContainer}>
                      <Ionicons
                        name="cube-outline"
                        size={18}
                        color="#94a3b8"
                        style={styles.addItemModalInputIcon}
                      />
                      <TextInput
                        style={styles.addItemModalInput}
                        placeholder="e.g., Milk, Eggs, Chicken"
                        placeholderTextColor="#94a3b8"
                        value={itemTitle}
                        onChangeText={setItemTitle}
                        editable={!isAddingItem}
                      />
                    </View>

                    {/* Quantity */}
                    <Text style={styles.addItemModalLabel}>Quantity</Text>
                    <View style={styles.addItemModalInputContainer}>
                      <Ionicons
                        name="calculator-outline"
                        size={18}
                        color="#94a3b8"
                        style={styles.addItemModalInputIcon}
                      />
                      <TextInput
                        style={styles.addItemModalInput}
                        placeholder="e.g., 2 (default: 1)"
                        placeholderTextColor="#94a3b8"
                        value={itemQuantity}
                        onChangeText={setItemQuantity}
                        keyboardType="numeric"
                        editable={!isAddingItem}
                      />
                    </View>

                    {/* Price */}
                    <Text style={styles.addItemModalLabel}>Price ($)</Text>
                    <View style={styles.addItemModalInputContainer}>
                      <Ionicons
                        name="cash-outline"
                        size={18}
                        color="#94a3b8"
                        style={styles.addItemModalInputIcon}
                      />
                      <TextInput
                        style={styles.addItemModalInput}
                        placeholder="e.g., 4.99 (optional)"
                        placeholderTextColor="#94a3b8"
                        value={itemPrice}
                        onChangeText={setItemPrice}
                        keyboardType="decimal-pad"
                        editable={!isAddingItem}
                      />
                    </View>

                    {/* Expiry Date */}
                    <Text style={styles.addItemModalLabel}>
                      Expiry Date
                      {itemAiSuggested && (
                        <Text style={{ fontSize: 12, color: "#14b8a6", fontWeight: "normal" }}>
                          {" "}(AI Suggested)
                        </Text>
                      )}
                    </Text>
                    <TouchableOpacity
                      style={styles.addItemModalInputContainer}
                      onPress={() => {
                        setTempItemExpiryDate(itemExpiryDate);
                        setShowItemDatePicker(true);
                      }}
                      disabled={isAddingItem || isLoadingItemAI}
                    >
                      <Ionicons
                        name="calendar-outline"
                        size={18}
                        color="#94a3b8"
                        style={styles.addItemModalInputIcon}
                      />
                      {isLoadingItemAI ? (
                        <ActivityIndicator size="small" color="#14b8a6" style={{ flex: 1 }} />
                      ) : (
                        <Text style={styles.addItemModalDatePickerText}>
                          {formatItemDate(itemExpiryDate)}
                        </Text>
                      )}
                    </TouchableOpacity>

                    {/* Shared By */}
                    <Text style={styles.addItemModalLabel}>Shared By</Text>
                    <TouchableOpacity
                      style={styles.addItemModalInputContainer}
                      onPress={() => {
                        if (itemUsers.length === 0) fetchItemUsers();
                        setShowItemUserPicker(true);
                      }}
                      disabled={isAddingItem}
                    >
                      <Ionicons
                        name="people-outline"
                        size={18}
                        color="#94a3b8"
                        style={styles.addItemModalInputIcon}
                      />
                      <Text
                        style={
                          itemSharedByUserIds.length > 0
                            ? styles.addItemModalDatePickerText
                            : styles.addItemModalDatePickerPlaceholder
                        }
                      >
                        {getSelectedItemUsersText()}
                      </Text>
                    </TouchableOpacity>

                    {/* Add Button */}
                    <View style={styles.addItemModalButtonContainer}>
                      <CustomButton
                        title={isAddingItem ? "Adding..." : "Add Item"}
                        onPress={handleAddItemSubmit}
                        style={styles.addItemModalAddButton}
                        className=""
                        disabled={isAddingItem}
                      />
                    </View>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      )}

      {/* Date Picker Modal for Add Item */}
      {showItemDatePicker && Platform.OS === "ios" && (
        <Modal
          transparent={true}
          animationType="fade"
          visible={showItemDatePicker}
          onRequestClose={cancelItemDateSelection}
        >
          <TouchableWithoutFeedback onPress={cancelItemDateSelection}>
            <View style={styles.addItemDatePickerModalContainer}>
              <TouchableWithoutFeedback onPress={() => {}}>
                <View style={styles.addItemDatePickerModalPopupBox}>
                  <View style={styles.addItemDatePickerModalHeader}>
                    <TouchableOpacity
                      onPress={cancelItemDateSelection}
                      style={styles.addItemDatePickerModalButton}
                    >
                      <Text style={styles.addItemDatePickerModalButtonText}>
                        Cancel
                      </Text>
                    </TouchableOpacity>
                    <Text style={styles.addItemDatePickerModalTitle}>
                      Select Date
                    </Text>
                    <TouchableOpacity
                      onPress={confirmItemDateSelection}
                      style={styles.addItemDatePickerModalButton}
                    >
                      <Text style={styles.addItemDatePickerModalButtonText}>
                        Done
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.addItemDatePickerModalPickerWrapper}>
                    <DateTimePicker
                      value={tempItemExpiryDate}
                      mode="date"
                      display="inline"
                      onChange={onItemDateChange}
                      minimumDate={new Date()}
                      style={styles.addItemDatePickerIOS}
                    />
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      )}

      {showItemDatePicker && Platform.OS === "android" && (
        <DateTimePicker
          value={itemExpiryDate}
          mode="date"
          display="default"
          onChange={onItemDateChange}
          minimumDate={new Date()}
        />
      )}

      {/* User Picker Modal for Add Item */}
      {showItemUserPicker && (
        <Modal
          transparent={true}
          animationType="slide"
          visible={showItemUserPicker}
          onRequestClose={() => setShowItemUserPicker(false)}
        >
          <TouchableWithoutFeedback onPress={() => setShowItemUserPicker(false)}>
            <View style={styles.addItemUserPickerModalOverlay}>
              <TouchableWithoutFeedback onPress={() => {}}>
                <View style={styles.addItemUserPickerModalCard}>
                  <View style={styles.addItemUserPickerModalHeader}>
                    <TouchableOpacity
                      onPress={() => {
                        setItemSharedByUserIds([]);
                        setShowItemUserPicker(false);
                      }}
                      style={styles.addItemUserPickerModalButton}
                    >
                      <Text style={styles.addItemUserPickerModalButtonText}>
                        Clear All
                      </Text>
                    </TouchableOpacity>
                    <Text style={styles.addItemUserPickerModalTitle}>
                      Select Users
                    </Text>
                    <TouchableOpacity
                      onPress={() => setShowItemUserPicker(false)}
                      style={styles.addItemUserPickerModalButton}
                    >
                      <Text style={styles.addItemUserPickerModalButtonText}>
                        Done
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <ScrollView style={styles.addItemUserPickerModalList}>
                    {itemUsers.map((user) => (
                      <TouchableOpacity
                        key={user.id}
                        style={styles.addItemUserPickerOption}
                        onPress={() => toggleItemUserSelection(user.id)}
                      >
                        <View
                          style={[
                            styles.addItemUserPickerCheckbox,
                            itemSharedByUserIds.includes(user.id) &&
                              styles.addItemUserPickerCheckboxSelected,
                          ]}
                        >
                          {itemSharedByUserIds.includes(user.id) && (
                            <Ionicons name="checkmark" size={16} color="#fff" />
                          )}
                        </View>
                        <Text style={styles.addItemUserPickerOptionText}>
                          {getItemUserDisplayName(user)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFBFC",
  },
  scrollView: {
    flex: 1,
    marginTop: -32,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
    paddingTop: 40,
  },
  uploadSection: {
    paddingHorizontal: 20,
    paddingTop: 0,
  },
  imageContainer: {
    height: 300,
    shadowColor: "#14b8a6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  imageTouchable: {
    width: "100%",
    height: "100%",
  },
  imageWrapper: {
    width: "100%",
    height: "100%",
    position: "relative",
    borderRadius: 24,
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  imageOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  overlayContent: {
    alignItems: "center",
    gap: 8,
  },
  imageOverlayText: {
    color: "white",
    fontWeight: "600",
    fontSize: 14,
  },
  imageSkeleton: {
    width: "100%",
    height: "100%",
    backgroundColor: "#f0fdfa",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2.5,
    borderColor: "#14b8a6",
    borderStyle: "dashed",
    borderRadius: 24,
  },
  imageTextContainer: {
    alignItems: "center",
    gap: 18,
    paddingHorizontal: 32,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
    shadowColor: "#14b8a6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  hintBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#ffffff",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 4,
  },
  hintText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#14b8a6",
  },
  overlayIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  skeletonTitle: {
    fontWeight: "700",
    color: "#0f172a",
    fontSize: 18,
    textAlign: "center",
  },
  skeletonSubtitle: {
    color: "#64748b",
    fontSize: 14,
    textAlign: "center",
  },
  loadingContainer: {
    padding: 32,
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    color: "#64748b",
    fontSize: 14,
  },
  itemsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0f172a",
  },
  addAllButton: {
    // Inherits from addButton
  },
  addAllText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 14,
  },
  itemCard: {
    backgroundColor: "#ffffff",
    padding: 18,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  itemInfo: {
    flex: 1,
    marginRight: 12,
  },
  itemName: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 6,
  },
  itemMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  itemMetaText: {
    fontSize: 14,
    color: "#64748b",
  },
  itemMetaDivider: {
    fontSize: 14,
    color: "#cbd5e1",
  },
  addButton: {
    backgroundColor: "#14b8a6",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    width: 120,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  addButtonDisabled: {
    opacity: 0.6,
  },
  addButtonText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 14,
    textAlign: "center",
    width: "100%",
  },
  buttonGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  shareButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#ffffff",
    width: 120,
    height: 44,
  },
  shareButtonText: {
    color: "#14b8a6",
    fontWeight: "600",
    fontSize: 14,
  },
  addSelectedButton: {
    // Inherits from addButton
  },
  checkboxButton: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: "#cbd5e1",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  checkboxButtonSelected: {
    backgroundColor: "#14b8a6",
    borderColor: "#14b8a6",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
  },
  modalCloseButton: {
    padding: 5,
  },
  fridgeMateItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  fridgeMateName: {
    marginLeft: 12,
    fontSize: 16,
    color: "#0f172a",
    flex: 1,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: "#cbd5e1",
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxChecked: {
    backgroundColor: "#14b8a6",
    borderColor: "#14b8a6",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 20,
    gap: 12,
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  cancelButtonText: {
    color: "#64748b",
    fontWeight: "600",
    fontSize: 14,
  },
  confirmButton: {
    backgroundColor: "#14b8a6",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  confirmButtonText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 14,
  },
  tipsCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 20,
    marginTop: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  tipsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
  },
  tipsList: {
    gap: 10,
  },
  tipItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  tipText: {
    fontSize: 14,
    color: "#64748b",
    flex: 1,
  },
  addItemButton: {
    width: 200,
    backgroundColor: "#14b8a6",
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginHorizontal: 20,
    marginBottom: 16,
  },
  addItemButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  // Add Item Modal Styles
  addItemModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-start",
    alignItems: "center",
    paddingTop: 140,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  addItemModalCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 25,
    width: "100%",
    maxWidth: 350,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
    paddingBottom: 40,
  },
  addItemModalScrollContent: {
    width: "100%",
    paddingBottom: 0,
  },
  addItemModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  addItemModalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0f172a",
  },
  addItemModalCloseButton: {
    padding: 4,
    borderRadius: 18,
    backgroundColor: "#f1f5f9",
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  addItemModalLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0f172a",
    width: "100%",
    marginBottom: 5,
    marginTop: 6,
  },
  addItemModalInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    backgroundColor: "#f8fafc",
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  addItemModalInputIcon: {
    marginRight: 10,
  },
  addItemModalInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 15,
    color: "#1e293b",
  },
  addItemModalDatePickerText: {
    flex: 1,
    fontSize: 15,
    color: "#1e293b",
    paddingVertical: 10,
  },
  addItemModalDatePickerPlaceholder: {
    flex: 1,
    fontSize: 15,
    color: "#94a3b8",
    paddingVertical: 10,
  },
  addItemDatePickerModalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  addItemDatePickerModalPopupBox: {
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
  addItemDatePickerModalHeader: {
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
  addItemDatePickerModalButton: {
    padding: 8,
  },
  addItemDatePickerModalButtonText: {
    fontSize: 16,
    color: "#14b8a6",
    fontWeight: "600",
  },
  addItemDatePickerModalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
  },
  addItemDatePickerModalPickerWrapper: {
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
  addItemDatePickerIOS: {
    alignSelf: "center",
    width: "100%",
  },
  addItemModalButtonContainer: {
    alignItems: "center",
    marginTop: 16,
  },
  addItemModalAddButton: {
    width: 217,
  },
  addItemUserPickerModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  addItemUserPickerModalCard: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "80%",
  },
  addItemUserPickerModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  addItemUserPickerModalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1e293b",
  },
  addItemUserPickerModalButton: {
    padding: 8,
  },
  addItemUserPickerModalButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#14b8a6",
  },
  addItemUserPickerModalList: {
    maxHeight: 400,
  },
  addItemUserPickerOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  addItemUserPickerCheckbox: {
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
  addItemUserPickerCheckboxSelected: {
    backgroundColor: "#14b8a6",
  },
  addItemUserPickerOptionText: {
    flex: 1,
    fontSize: 16,
    color: "#1e293b",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
