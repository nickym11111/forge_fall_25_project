import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Button,
  Image,
  Platform,
  StyleSheet,
  Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
    import { File } from 'expo-file-system';
import { CreateParseReceiptRequest } from "../api/ParseReceipt";
import CustomHeader from "@/components/CustomHeader";
import { TouchableOpacity } from "react-native";
import { supabase } from "../utils/client";
import { AddItemToFridge, PredictExpiryDate } from "../api/AddItemToFridge";
import ToastMessage from "@/components/ToastMessage";

export default function ParseReceiptScreen() {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [responseText, setResponseText] = useState("");


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
    const ExpiryDateResponse = await PredictExpiryDate(item.name);
    const ExpiryDateData = await ExpiryDateResponse.json();
    console.log("📦 Response data:", ExpiryDateData);
    const newExpiryDate = new Date(); // Default to today

    if (ExpiryDateData.days) {
      const days = parseInt(ExpiryDateData.days);
      console.log("✅ AI predicted", days, "days for", item.name);
      newExpiryDate.setDate(newExpiryDate.getDate() + days);
    }

    const AddItemToFridgeResponse = await AddItemToFridge(
      userSession.access_token,
      item.name,
      item.quantity,
      newExpiryDate,
      "TEMP_USER_ID", // Placeholder for current user ID
      []
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
      setResponseText(JSON.stringify(parsed, null, 2));
    } catch (error) {
      console.error(error);
      setResponseText("Error parsing receipt");
    }
  };

  return (
    <View style={styles.container}>
      <CustomHeader title="Add Items 📷" />
      <View style={{ position: "fixed", zIndex: 999, left: 0, right: 20 }}>
        <ToastMessage message={toastMessage} visible={isToastVisible} />
      </View>
      <View style={styles.imageContainer}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.image} />
        ) : (
          <TouchableOpacity onPress={pickImage} style={{width: "100%", height: "100%"}}> 
          <View style={styles.imageSkeleton} >
            <View style={styles.imageTextContainer}>
              <Text style={{fontSize: 24}}>📸</Text>
              <Text style={{fontWeight: "bold", color: "white", fontSize: 18, textAlign: "center",}}>Scan Receipt or Take Photo</Text>
              <Text style={{color: "white", fontSize: 15, textAlign: "center",}}>AI will detect items and expiry dates</Text>
            </View>
          </View>
          </TouchableOpacity>

        )}
        </TouchableOpacity>
      </View>
      <View style={styles.responseTextContainer}>
      <Text style={styles.responseText}>
        {responseText}
      </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FF",
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
    display: "flex",
    alignItems: "center",
  },
  responseText: {
  },
});
