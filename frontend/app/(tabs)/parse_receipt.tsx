import React, { useEffect, useState } from "react";
import { View, Text, Button, Image, Platform, StyleSheet } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import { CreateParseReceiptRequest } from "../api/ParseReceipt";
import CustomHeader from "@/components/CustomHeader";
import { TouchableOpacity } from "react-native";

export default function ParseReceiptScreen() {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [responseText, setResponseText] = useState("");
  const [parsedItems, setParsedItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
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
        base64Image = await FileSystem.readAsStringAsync(imageUri, {
          encoding: "base64",
        });
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
    <View style={styles.container}>
      <CustomHeader title="Add Items 📷" />
      <View style={styles.imageContainer}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.image} />
        ) : (
<<<<<<< HEAD
          <TouchableOpacity
            onPress={pickImage}
            style={{ width: "100%", height: "100%" }}
          >
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
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.responseTextContainer}>
        {isLoading && <Text>Parsing Receipt</Text>}
        {!parsedItems ? (
          <Text style={styles.responseText}>{responseText}</Text>
        ) : parsedItems.length > 0 ? (
          parsedItems.map((item, index) => {
            const itemName = Object.keys(item)[0];
            const itemData = item[itemName];
            return (
              <View key={index} style={styles.itemCard}>
                <Text style={styles.itemName}>{itemName}</Text>
                <Text style={styles.itemDetails}>
                  Quantity: {itemData.quantity} | Price: $
                  {itemData.price.toFixed(2)}
                </Text>
              </View>
            );
          })
        ) : null}
=======
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
      </View>
      <View style={styles.responseTextContainer}>
      <Text style={styles.responseText}>
        {responseText}
      </Text>
>>>>>>> 5ca5d15 (Refactor image picking logic and remove redundant comments in ParseReceiptScreen)
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FF",
<<<<<<< HEAD
    overflowY: "scroll",
=======
>>>>>>> 5ca5d15 (Refactor image picking logic and remove redundant comments in ParseReceiptScreen)
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
<<<<<<< HEAD
=======

>>>>>>> 5ca5d15 (Refactor image picking logic and remove redundant comments in ParseReceiptScreen)
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
<<<<<<< HEAD
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
  },
  itemName: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  itemDetails: {
    fontSize: 14,
    color: "#666",
=======
    display: "flex",
    alignItems: "center",
  },
  responseText: {
>>>>>>> 5ca5d15 (Refactor image picking logic and remove redundant comments in ParseReceiptScreen)
  },
});
