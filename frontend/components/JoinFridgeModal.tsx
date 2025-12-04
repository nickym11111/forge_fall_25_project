import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../app/utils/client";
import { useAuth } from "../app/context/authContext";
import CustomButton from "./CustomButton";

interface JoinFridgeModalProps {
  onClose: () => void;
  onSwitchToCreate: () => void;
}

const JoinFridgeModal = ({ onClose, onSwitchToCreate }: JoinFridgeModalProps) => {
  const [fridgeCode, setFridgeCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  const { user } = useAuth();

  const API_URL = `${process.env.EXPO_PUBLIC_API_URL}`;

  const handleJoinFridge = async () => {
    if (!fridgeCode.trim()) {
      Alert.alert("Error", "Please enter a kitchen code.");
      return;
    }

    setIsLoading(true);

    try {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error || !session) {
        throw new Error("No active session. Please log in again.");
      }

      const response = await fetch(`${API_URL}/fridge/request-join`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ fridgeCode: fridgeCode.trim() }),
      });

      const data = await response.json();

      if (!response.ok || data.status !== "success") {
        throw new Error(data.message || "Failed to join kitchen");
      }

      Alert.alert(
        "Request Sent!",
        "Your request to join the kitchen has been sent. You'll be notified when it's approved."
      );

      setFridgeCode("");

    } catch (error) {
      console.error("Error:", error);
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "An unexpected error occurred"
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
      <TouchableOpacity style={styles.closeButton} onPress={onClose}>
        <Ionicons name="close" size={28} color="#64748b" />
      </TouchableOpacity>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView 
          contentContainerStyle={styles.formContainer}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.form}>
            <Text style={styles.title}>Join Kitchen</Text>
            <Text style={styles.description}>
              Enter the kitchen code to join an existing kitchen.
            </Text>
            <View style={[
              styles.inputContainer,
              focusedInput === "fridgeCode" && styles.inputContainerFocused
            ]} collapsable={false}>
              <Ionicons name="key-outline" size={20} color="#94a3b8" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="abc-123"
                placeholderTextColor="#94a3b8"
                value={fridgeCode}
                onChangeText={setFridgeCode}
                editable={!isLoading}
                autoCapitalize="characters"
                onFocus={() => setFocusedInput("fridgeCode")}
                onBlur={() => setFocusedInput(null)}
                onSubmitEditing={Keyboard.dismiss}
                returnKeyType="default"
                blurOnSubmit={true}
              />
            </View>

          <CustomButton
            title={isLoading ? "Joining..." : "Join Kitchen"}
            onPress={handleJoinFridge}
            style={styles.joinButton}
            disabled={isLoading}
            className=""
          />

          <Text
            style={styles.createFridgeText}
            onPress={() => !isLoading && onSwitchToCreate()}
          >
            Create a kitchen instead
          </Text>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </View>
  );
};

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
    top: 80,
    right: 20,
    zIndex: 1000,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  formContainer: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 100,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  form: {
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
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 12,
    textAlign: "center",
    color: "#1e293b",
  },
  description: {
    fontSize: 15,
    color: "#64748b",
    marginBottom: 24,
    textAlign: "center",
    lineHeight: 22,
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
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: "#1e293b",
  },
  joinButton: {
    width: "100%",
    marginTop: 8,
  },
  createFridgeText: {
    marginTop: 24,
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
  },
});

export default JoinFridgeModal;