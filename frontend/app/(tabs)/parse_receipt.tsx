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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { File } from "expo-file-system";
import { CreateParseReceiptRequest } from "../api/ParseReceipt";
import CustomHeader from "@/components/CustomHeader";
import ProfileIcon from "@/components/ProfileIcon";
import { supabase } from "../utils/client";
import { AddItemToFridge, PredictExpiryDate } from "../api/AddItemToFridge";
import { Modal } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../context/authContext";

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

  const parseReceipt = async () => {
    if (!imageUri) {
      alert("Please select an image first!");
      return;
    }

    try {
      setIsLoading(true);
      setResponseText("Parsing receipt...");
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
      const parsed = JSON.parse(response);

      setParsedItems(parsed);
      console.log(parsed);
      setResponseText("");

      setResponseText(JSON.stringify(parsed, null, 2));
    } catch (error) {
      console.error(error);
      setResponseText("Error parsing receipt");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <CustomHeader
        title="Scan Receipt"
        subtitle="Take a photo or upload a receipt to automatically add items"
        noShadow={true}
      />
      <ProfileIcon className="profileIcon" />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
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
                  selectedItems.length === 0 && styles.buttonDisabled,
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
                        isAdding && styles.buttonDisabled,
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
    paddingTop: 20,
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
});
