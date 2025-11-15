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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { File } from "expo-file-system";
import { CreateParseReceiptRequest } from "../api/ParseReceipt";
import CustomHeader from "@/components/CustomHeader";
import { supabase } from "../utils/client";
import { AddItemToFridge, PredictExpiryDate } from "../api/AddItemToFridge";
import ToastMessage from "@/components/ToastMessage";

export default function ParseReceiptScreen() {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [responseText, setResponseText] = useState("");
  const [parsedItems, setParsedItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [userSession, setUserSession] = useState<any>(null);
  const [isToastVisible, setIsToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [addingItemIndex, setAddingItemIndex] = useState<number[]>([]);

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

  useEffect(() => {
    let isMounted = true;

    const fetchSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error("Error getting session:", error);
        return;
      }
      if (isMounted) setUserSession(data.session);
    };

    fetchSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isMounted) setUserSession(session);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  interface ApiResponse {
    data?: any;
    message: string;
    detail?: string;
  }
  const sendItemToFridge = async (item: any) => {
    if (!userSession) {
      Alert.alert("Error", "User not logged in");
      return;
    }
    const newExpiryDate = new Date(); // Default to today

    try {
      const ExpiryDateResponse = await PredictExpiryDate(item.name);
      const ExpiryDateData = await ExpiryDateResponse.json();
      console.log("📦 Response data:", ExpiryDateData);

      if (ExpiryDateData.days) {
        const days = parseInt(ExpiryDateData.days);
        console.log("✅ AI predicted", days, "days for", item.name);
        newExpiryDate.setDate(newExpiryDate.getDate() + days);
      }
    } catch (expiryError) {
      console.warn("⚠️ Failed to predict expiry date, using default:", expiryError);
      // Continue with default date (today)
    }

    const AddItemToFridgeResponse = await AddItemToFridge(
      userSession.access_token,
      item.name,
      item.quantity,
      newExpiryDate, // Placeholder for current user ID
      ["TEMP_USER_ID"]
    );

    const data: ApiResponse = await AddItemToFridgeResponse.json();
    console.log("Response status:", AddItemToFridgeResponse.status);
    console.log("Response data:", data);

    setIsToastVisible(true);
    setTimeout(() => setIsToastVisible(false), 3000);

    if (AddItemToFridgeResponse.ok) {
      Alert.alert("Success!", "Item added to fridge!");
      setToastMessage("Item added to fridge!");
    } else {
      Alert.alert(
        "Error",
        data.detail || data.message || "Failed to add item."
      );
      setToastMessage("Failed to add item.");
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
      const parsed = JSON.parse(response.output[0].content[0].text);

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
    <ScrollView style={styles.container}>
      <CustomHeader 
        title="Scan Receipt" 
        subtitle="Take a photo or upload a receipt to automatically add items"
      />
      <View style={{ position: "fixed", zIndex: 999, left: 0, right: 20 }}>
        <ToastMessage message={toastMessage} visible={isToastVisible} />
      </View>
      
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
                      <Ionicons name="camera-outline" size={28} color="#14b8a6" />
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
                <Text style={styles.tipText}>Keep receipt flat and in focus</Text>
              </View>
              <View style={styles.tipItem}>
                <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                <Text style={styles.tipText}>Include all items in the frame</Text>
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

      {parsedItems && parsedItems.length > 0 && (
        <View style={styles.itemsContainer}>
          <View style={styles.headerRow}>
            <Text style={styles.sectionTitle}>Detected Items</Text>
            <TouchableOpacity
              style={styles.addAllButton}
              onPress={() => {
                parsedItems.forEach((item, index) => {
                  const itemName = Object.keys(item)[0];
                  const itemData = item[itemName];
                  sendItemToFridge({
                    name: itemName,
                    quantity: Math.ceil(itemData.quantity),
                    index,
                  });
                  setAddingItemIndex((prev) => [...prev, index]);
                });
              }}
            >
              <Text style={styles.addAllText}>Add All</Text>
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
                <TouchableOpacity
                  style={[styles.addButton, isAdding && styles.addButtonDisabled]}
                  onPress={() => {
                    if (!isAdding) {
                      sendItemToFridge({
                        name: itemName,
                        quantity: Math.ceil(itemData.quantity),
                        index,
                      });
                      setAddingItemIndex((prev) => [...prev, index]);
                    }
                  }}
                  disabled={isAdding}
                >
                  {isAdding ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.addButtonText}>Add</Text>
                  )}
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFBFC",
  },
  uploadSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
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
    backgroundColor: "#14b8a6",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
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
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    minWidth: 80,
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