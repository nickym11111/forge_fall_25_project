import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Button,
  Image,
  Platform,
  StyleSheet,
  Alert,
  ScrollView,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { File } from "expo-file-system";
import { CreateParseReceiptRequest } from "../api/ParseReceipt";
import CustomHeader from "@/components/CustomHeader";
import { TouchableOpacity } from "react-native";
import { supabase } from "../utils/client";
import { AddItemToFridge, PredictExpiryDate } from "../api/AddItemToFridge";
import ToastMessage from "@/components/ToastMessage";
import ProfileIcon from "@/components/ProfileIcon";

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
  const sendItemToFridge = async (item: any, retryCount = 0) => {
    const MAX_RETRIES = 1; // Will try twice total (initial + 1 retry)
    
    if (!userSession) {
      Alert.alert("Error", "User not logged in");
      setAddingItemIndex((prev) => prev.filter((i) => i !== item.index));
      return;
    }

    const userId = userSession.user?.id;
  
  if (!userId) {
    Alert.alert("Error", "Could not get user ID");
    return;
  }

    const ExpiryDateResponse = await PredictExpiryDate(item.name);
    const ExpiryDateData = await ExpiryDateResponse.json();
    console.log("📦 Response data:", ExpiryDateData);
    const newExpiryDate = new Date(); // Default to today

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

      if (AddItemToFridgeResponse.ok) {
        setIsToastVisible(true);
        setTimeout(() => setIsToastVisible(false), 3000);
        setToastMessage(`✅ ${item.name} added to fridge!`);
        console.log(`✅ Successfully added ${item.name}`);
      } else {
        throw new Error(data.detail || data.message || "Failed to add item");
      }
    } catch (error) {
      console.error(`❌ Error adding ${item.name} (attempt ${retryCount + 1}):`, error);
      
      // Retry logic
      if (retryCount < MAX_RETRIES) {
        console.log(`🔄 Retrying ${item.name}... (attempt ${retryCount + 2})`);
        setToastMessage(`Retrying ${item.name}...`);
        setIsToastVisible(true);
        setTimeout(() => setIsToastVisible(false), 2000);
        
        // Wait a bit before retrying
        await new Promise(resolve => setTimeout(resolve, 1000));
        return sendItemToFridge(item, retryCount + 1);
      } else {
        // Failed after retries
        console.error(`❌ Failed to add ${item.name} after ${MAX_RETRIES + 1} attempts`);
        setIsToastVisible(true);
        setTimeout(() => setIsToastVisible(false), 3000);
        setToastMessage(`⚠️ Skipped ${item.name} - failed to add`);
      }
    } finally {
      setAddingItemIndex((prev) => prev.filter((i) => i !== item.index));
    }
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
      try {
        const parsed = JSON.parse(response.output[0].content[0].text);

        setParsedItems(parsed);
        console.log(parsed);
        setResponseText("");

        setResponseText(JSON.stringify(parsed, null, 2));
      } catch (error) {
        console.error("Error parsing JSON:", error);
        setResponseText("Failed to parse receipt data.");
      }
    } catch (error) {
      console.error(error);
      setResponseText("Error parsing receipt");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <CustomHeader title="Add Items 📷" />
      <ProfileIcon className="profileIcon" />
      <View style={{ position: "fixed", zIndex: 999, left: 0, right: 20 }}>
        <ToastMessage message={toastMessage} visible={isToastVisible} />
      </View>
      <View style={styles.imageContainer}>
        <TouchableOpacity
          onPress={pickImage}
          style={{ width: "100%", height: "100%" }}
        >
          {imageUri ? (
            <View style={styles.imageWrapper}>
              <Image source={{ uri: imageUri }} style={styles.image} />
              <View style={styles.imageOverlay}>
                <Text style={styles.imageOverlayText}>
                  Click to Change Image
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.imageSkeleton}>
              <View style={styles.imageTextContainer}>
                <Text style={{ fontSize: 24 }}>📸</Text>
                <Text
                  style={{
                    fontWeight: "bold",
                    color: "white",
                    fontSize: 18,
                    textAlign: "center",
                  }}
                >
                  Scan Receipt or Take Photo
                </Text>
                <Text
                  style={{ color: "white", fontSize: 15, textAlign: "center" }}
                >
                  AI will detect items and expiry dates
                </Text>
              </View>
            </View>
          )}
        </TouchableOpacity>
      </View>
      <View style={styles.responseTextContainer}>
        {isLoading && <Text>Parsing Receipt</Text>}
        {!parsedItems ? (
          <Text style={styles.responseText}>{responseText}</Text>
        ) : parsedItems.length > 0 ? (
          <View>
            <View
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <Button
                title="Add All to Fridge"
                onPress={async () => {
                  // Add all items with error handling
                  for (let index = 0; index < parsedItems.length; index++) {
                    const item = parsedItems[index];
                    const itemName = Object.keys(item)[0];
                    const itemData = item[itemName];
                    
                    setAddingItemIndex((prev) => [...prev, index]);
                    
                    // Process items sequentially to avoid overwhelming the server
                    await sendItemToFridge({
                      name: itemName,
                      quantity: Math.ceil(itemData.quantity),
                      index,
                    });
                    
                    // Small delay between items
                    if (index < parsedItems.length - 1) {
                      await new Promise(resolve => setTimeout(resolve, 500));
                    }
                  }
                  
                  // Show final summary
                  setIsToastVisible(true);
                  setToastMessage("✅ Finished adding items!");
                  setTimeout(() => setIsToastVisible(false), 3000);
                }}
              />
            </View>
            {parsedItems.map((item, index) => {
              const itemName = Object.keys(item)[0];
              const itemData = item[itemName];
              return (
                <View key={index} style={styles.itemCard}>
                  <View>
                    <Text style={styles.itemName}>{itemName}</Text>
                    <Text style={styles.itemDetails}>
                      Quantity: {itemData.quantity} | Price: $
                      {itemData.price.toFixed(2)}
                    </Text>
                  </View>
                  <View style={{ maxWidth: 120 }}>
                    {addingItemIndex.includes(index) ? (
                      <Text>Adding...</Text>
                    ) : (
                      <Button
                        title="Add to Fridge"
                        onPress={() => {
                          sendItemToFridge({
                            name: itemName,
                            quantity: Math.ceil(itemData.quantity),
                            index,
                          });
                          setAddingItemIndex((prev) => [...prev, index]);
                        }}
                      />
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FF",
    overflowY: "scroll",
  },
  imageWrapper: {
    width: "100%",
    height: "100%",
    position: "relative",
    borderRadius: 8,
    overflow: "hidden",
  },
  imageOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.25)", // subtle dim so text is readable
  },
  imageOverlayText: {
    color: "white",
    fontWeight: "700",
    fontSize: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "rgba(0,0,0,0.4)",
    borderRadius: 6,
  },

  imageContainer: {
    width: "100%",
    height: "100%",
    maxHeight: 300,
    justifyContent: "center",
    maxWidth: 400,
    alignItems: "center",
    marginVertical: 16,
    display: "flex",
    alignSelf: "center",
  },
  imageSkeleton: {
    width: "100%",
    height: "100%",
    backgroundColor: "#74B9FF",
    borderRadius: 8,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  imageTextContainer: {
    alignItems: "center",
    gap: 22,
    maxWidth: 165,
  },
  image: {
    width: "100%",
    height: "100%",
    marginVertical: 8,
  },
  responseTextContainer: {
    width: "100%",
    padding: 16,
  },
  responseText: {
    textAlign: "center",
  },
  itemCard: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  itemName: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  itemDetails: {
    fontSize: 14,
    color: "#666",
  },
});
