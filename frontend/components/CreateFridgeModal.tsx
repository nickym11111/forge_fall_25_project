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
import { router } from "expo-router";
import CustomButton from "./CustomButton";

interface CreateFridgeModalProps {
  onClose: () => void;
  onSwitchToJoin: () => void;
}

const CreateFridgeModal = ({ onClose, onSwitchToJoin }: CreateFridgeModalProps) => {
  const [fridgeName, setFridgeName] = useState("");
  const [emails, setEmails] = useState<string[]>([""]);
  const [isLoading, setIsLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

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
      Alert.alert("Error", "Please enter a kitchen name.");
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
        throw new Error(fridgeData.message || "Failed to create kitchen");
      }

      await refreshUser();

      setIsLoading(false);
      setFridgeName("");
      setEmails([""]);

      Alert.alert(
        "Success!",
        "Kitchen created successfully!",
        [
          {
            text: "OK",
            onPress: () => {
              onClose();
              router.replace("/(tabs)/two");
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
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Create Kitchen</Text>
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
            <Text style={styles.title}>Create Kitchen</Text>
            <Text style={styles.description}>
              Enter a name for your kitchen to get started.
            </Text>
            <View style={[
              styles.inputContainer,
              styles.kitchenNameContainer,
              focusedInput === "fridgeName" && styles.inputContainerFocused
            ]} collapsable={false}>
              <Ionicons name="restaurant-outline" size={20} color="#94a3b8" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
                placeholder="Kitchen name"
                placeholderTextColor="#94a3b8"
            value={fridgeName}
            onChangeText={setFridgeName}
            editable={!isLoading}
                onFocus={() => setFocusedInput("fridgeName")}
                onBlur={() => setFocusedInput(null)}
                onSubmitEditing={Keyboard.dismiss}
                returnKeyType="default"
                blurOnSubmit={true}
          />
            </View>

          {emails.map((email, index) => (
            <View key={index} style={styles.inputRow}>
                <View style={[
                  styles.inputContainer,
                  { flex: 1 },
                  focusedInput === `email-${index}` && styles.inputContainerFocused
                ]} collapsable={false}>
                  <Ionicons name="mail-outline" size={20} color="#94a3b8" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="friend@example.com"
                    placeholderTextColor="#94a3b8"
                value={email}
                onChangeText={(text) => enterEmail(text, index)}
                editable={!isLoading}
                    onFocus={() => setFocusedInput(`email-${index}`)}
                    onBlur={() => setFocusedInput(null)}
                    onSubmitEditing={Keyboard.dismiss}
                    returnKeyType="default"
                    blurOnSubmit={true}
              />
                </View>
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
            title={isLoading ? "Creating..." : "Create Kitchen"}
            onPress={handleCreateFridge}
            style={styles.createButton}
            disabled={isLoading}
            className=""
          />

          <Text
            style={styles.joinFridgeText}
            onPress={() => !isLoading && onSwitchToJoin()}
          >
            Join a kitchen instead
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
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 0,
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
  kitchenNameContainer: {
    width: "100%",
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
  removeButton: {
    marginLeft: 12,
    padding: 4,
  },
  addEmailText: {
    color: "#14b8a6",
    fontSize: 14,
    marginTop: 5,
    fontWeight: "600",
    textAlign: "left",
  },
  createButton: {
    width: "100%",
    marginTop: 8,
  },
  joinFridgeText: {
    marginTop: 24,
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
  },
});

export default CreateFridgeModal;