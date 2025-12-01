import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../app/utils/client";
import { useAuth } from "../app/context/authContext";
import { router } from "expo-router";
import CustomButton from "./CustomButton";
import CustomHeader from "./CustomHeader";

interface CreateFridgeModalProps {
  onClose: () => void;
  onSwitchToJoin: () => void;
}

const CreateFridgeModal = ({ onClose, onSwitchToJoin }: CreateFridgeModalProps) => {
  const [fridgeName, setFridgeName] = useState("");
  const [emails, setEmails] = useState<string[]>([""]);
  const [isLoading, setIsLoading] = useState(false);

  const { user, refreshUser } = useAuth();

  const API_URL = `${process.env.EXPO_PUBLIC_API_URL}/fridges`;

  const enterEmail = (text: string, index: number) => {
    const updated = [...emails];
    updated[index] = text;
    setEmails(updated);
  };

  const addEmailField = () => setEmails([...emails, ""]);

  const removeEmail = (index: number) => {
    const updated = emails.filter((_, i) => i !== index);
    setEmails(updated);
  };

  const handleCreateFridge = async () => {
    if (!fridgeName.trim()) {
      Alert.alert("Error", "Please enter a fridge name.");
      return;
    }

    const validEmails = emails.filter((email) => email.trim() !== "");
    if (validEmails.length === 0) {
      Alert.alert("Error", "Please enter at least one email address.");
      return;
    }

    setIsLoading(true);

    try {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error || !session) {
        throw new Error("No active session. Please log in again.");
      }

      const createFridgeResponse = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ name: fridgeName }),
      });

      const fridgeData = await createFridgeResponse.json();

      if (!createFridgeResponse.ok || fridgeData.status !== "success") {
        throw new Error(fridgeData.message || "Failed to create fridge");
      }

      await refreshUser();

      setIsLoading(false);
      setFridgeName("");
      setEmails([""]);

      Alert.alert(
        "Success!",
        "Fridge created successfully!",
        [
          {
            text: "OK",
            onPress: () => {
              onClose(); // Close modal
              router.replace("/(tabs)/two"); // Navigate to fridge items
            }
          }
        ]
      );

    } catch (error) {
      console.error("Error:", error);
      setIsLoading(false);
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "An unexpected error occurred"
      );
    }
  };

  return (
    <View style={styles.container}>
      {/* X Button in top left */}
      <TouchableOpacity style={styles.closeButton} onPress={onClose}>
        <Ionicons name="close-circle" size={36} color="#333" />
      </TouchableOpacity>

      <CustomHeader
        title="Create Fridge  "
        logo={require('../assets/images/FridgeIcon.png')}
      />

      <ScrollView contentContainerStyle={styles.formContainer}>
        <View style={styles.form}>
          <Text style={styles.label}>Fridge Name:</Text>
          <TextInput
            style={styles.input}
            placeholder="example"
            placeholderTextColor="gray"
            value={fridgeName}
            onChangeText={setFridgeName}
            editable={!isLoading}
          />

          <Text style={styles.label}>Invite Fridgemates (Email):</Text>

          {emails.map((email, index) => (
            <View key={index} style={styles.inputRow}>
              <TextInput
                style={styles.input}
                placeholder="friend@example.com"
                placeholderTextColor="gray"
                value={email}
                onChangeText={(text) => enterEmail(text, index)}
                editable={!isLoading}
              />
              {emails.length > 1 && (
                <TouchableOpacity
                  onPress={() => removeEmail(index)}
                  style={styles.removeButton}
                  disabled={isLoading}
                >
                  <Ionicons name="remove-circle" size={24} color="#e63946" />
                </TouchableOpacity>
              )}
            </View>
          ))}

          <Text style={styles.addEmailText} onPress={addEmailField}>
            + Add Another Email
          </Text>

          <CustomButton
            title={isLoading ? "Creating..." : "Create Fridge"}
            onPress={handleCreateFridge}
            style={styles.createButton}
            disabled={isLoading}
            className=""
          />

          <Text
            style={styles.joinFridgeText}
            onPress={() => !isLoading && onSwitchToJoin()}
          >
            Join a fridge instead
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FF",
  },
  closeButton: {
    position: "absolute",
    top: 60,
    right: 20,
    zIndex: 1000,
  },
  formContainer: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 100,
  },
  form: {
    width: 300,
  },
  label: {
    fontSize: 15,
    color: "#333",
    marginBottom: 5,
    marginTop: 10,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
  },
  input: {
    flex: 1,
    marginVertical: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    fontSize: 15,
    backgroundColor: "#fff",
  },
  removeButton: {
    marginLeft: 6,
  },
  addEmailText: {
    color: "#007bff",
    fontSize: 14,
    marginTop: 5,
    fontWeight: "600",
    textAlign: "left",
  },
  createButton: {
    width: 217,
    marginTop: 15,
    alignSelf: "center",
  },
  joinFridgeText: {
    marginTop: 10,
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
});

export default CreateFridgeModal;