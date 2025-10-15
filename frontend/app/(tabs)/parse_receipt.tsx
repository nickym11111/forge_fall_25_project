import React, { useState } from "react";
import { View, Text, Button, Image, Platform } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import { CreateParseReceiptRequest } from "../api/ParseReceipt";

export default function ParseReceiptScreen() {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [responseText, setResponseText] = useState("");

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images", // ✅ new API
      allowsEditing: false,
      quality: 1,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
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
        // ✅ Web fallback: fetch the blob and convert manually
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
        // ✅ Native (iOS/Android)
        base64Image = await FileSystem.readAsStringAsync(imageUri, {
          encoding: "base64",
        });
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
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
      }}
    >
      <Button title="Pick an image" onPress={pickImage} />
      {imageUri && (
        <Image
          source={{ uri: imageUri }}
          style={{ width: 200, height: 200, marginVertical: 8 }}
        />
      )}
      <Button title="Parse Receipt" onPress={parseReceipt} />
      <Text style={{ marginTop: 16, paddingHorizontal: 12 }}>
        {responseText}
      </Text>
    </View>
  );
}
