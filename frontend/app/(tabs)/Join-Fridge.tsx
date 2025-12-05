import { StyleSheet, TextInput, View, Text, Alert, TouchableWithoutFeedback, Keyboard, ScrollView, TouchableOpacity } from "react-native";
import { useState, useRef } from "react";
import { Ionicons } from "@expo/vector-icons";
import CustomButton from "@/components/CustomButton";
import { navigate } from "expo-router/build/global-state/routing";
import { router } from "expo-router";
import CustomHeader from "@/components/CustomHeader";
import { supabase } from "../utils/client";

interface ApiResponse {
  status: "success" | "error";
  message: string;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFBFC",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1e293b",
  },
  closeButton: {
    position: "absolute",
    right: 20,
    top: 58,
    zIndex: 1000,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  joinContainer: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 100,
    paddingTop: 20,
  },

  joinForm: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },

  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    borderRadius: 16,
    backgroundColor: "#f8fafc",
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  inputContainerFocused: {
    borderColor: "#14b8a6",
    borderWidth: 2.5,
    backgroundColor: "#ffffff",
    shadowColor: "#14b8a6",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  inputIcon: {
    marginRight: 12,
  },
  joinInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: "#1e293b",
  },

  joinButton: {
    width: "30%",
    marginVertical: -10,
    padding: 12,
    borderRadius: 8,
    fontSize: 15,
    },

  createFridgeButton: {
    marginTop: 24,
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
  },

  label:
  {
    fontSize: 14,
    color: "#0c0c0cff",
    marginBottom: 2,
    marginTop: 10,
  }
});

export default function JoinFridgeScreen() {
  const [jCode, setjCode] = useState("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  const handleJoinFridge = async () => {
  if (!jCode.trim()){
    Alert.alert("error", "Please enter a kitchen code.");
    return;
  }

    setIsLoading(true);
    const API_URL = `${process.env.EXPO_PUBLIC_API_URL}/fridge/request-join`;

    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error || !session) {
        throw new Error("No active session. Please log in again.");
      }

      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          fridgeCode: jCode,
        }),
      });

      const data: ApiResponse = await response.json();

      if (response.ok && data.status === "success") {
        Alert.alert("Request to join kitchen sent!", data.message);
      } else {
        Alert.alert(
          "Join Request Failed",
          data.message || "An unknown error occurred."
        );
      }
    } catch (error) {
      console.error("Network request failed:", error);
      Alert.alert(
        "Connection Error",
        "Could not connect to the server. Please check your internet connection."
      );
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Join Kitchen</Text>
      </View>
      <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
        <Ionicons name="close" size={28} color="#64748b" />
      </TouchableOpacity>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView 
          contentContainerStyle={styles.joinContainer}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.joinForm}>
            <View style={[
              styles.inputContainer,
              focusedInput === "joinCode" && styles.inputContainerFocused
            ]} collapsable={false}>
              <Ionicons name="key-outline" size={20} color="#94a3b8" style={styles.inputIcon} />
              <TextInput
                onChangeText={setjCode}
                placeholder="abc-123"
                placeholderTextColor="#94a3b8"
                value={jCode}
                style={styles.joinInput}
                editable={!isLoading}
                onFocus={() => setFocusedInput("joinCode")}
                onBlur={() => setFocusedInput(null)}
                onSubmitEditing={Keyboard.dismiss}
                returnKeyType="default"
                blurOnSubmit={true}
              />
            </View>
            <CustomButton
              title={isLoading ? "Joining..." : "Join"}
              onPress={() => handleJoinFridge()}
              style={styles.joinButton}
              className=""
              disabled={isLoading}
            />
            <Text
              style={styles.createFridgeButton}
              onPress={() => !isLoading && navigate("/(tabs)/create_fridge")}
            >
              Create a kitchen instead
            </Text>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </View>
  );
}
