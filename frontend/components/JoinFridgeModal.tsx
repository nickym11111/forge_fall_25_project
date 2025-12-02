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
import CustomButton from "./CustomButton";
import CustomHeader from "./CustomHeader";

interface JoinFridgeModalProps {
  onClose: () => void;
  onSwitchToCreate: () => void;
}

const JoinFridgeModal = ({ onClose, onSwitchToCreate }: JoinFridgeModalProps) => {
  const [fridgeCode, setFridgeCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { user } = useAuth();

  const API_URL = `${process.env.EXPO_PUBLIC_API_URL}`;

  const handleJoinFridge = async () => {
    if (!fridgeCode.trim()) {
      Alert.alert("Error", "Please enter a fridge code.");
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
        throw new Error(data.message || "Failed to join fridge");
      }

      Alert.alert(
        "Request Sent!",
        "Your request to join the fridge has been sent. You'll be notified when it's approved."
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
      <TouchableOpacity style={styles.closeButton} onPress={onClose}>
        <Ionicons name="close-circle" size={36} color="#333" />
      </TouchableOpacity>

      <CustomHeader
        title="Join Fridge  "
        logo={require('../assets/images/FridgeIcon.png')}
      />

      <ScrollView contentContainerStyle={styles.formContainer}>
        <View style={styles.form}>
          <Text style={styles.label}>Enter Fridge Code:</Text>
          <TextInput
            style={styles.input}
            placeholder="ABC123"
            placeholderTextColor="gray"
            value={fridgeCode}
            onChangeText={setFridgeCode}
            editable={!isLoading}
            autoCapitalize="characters"
          />

          <CustomButton
            title={isLoading ? "Joining..." : "Join Fridge"}
            onPress={handleJoinFridge}
            style={styles.joinButton}
            disabled={isLoading}
            className=""
          />

          <Text
            style={styles.createFridgeText}
            onPress={() => !isLoading && onSwitchToCreate()}
          >
            Create a fridge instead
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
  input: {
    width: "100%",
    marginVertical: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    fontSize: 15,
    backgroundColor: "#fff",
  },
  joinButton: {
    width: 217,
    marginTop: 15,
    alignSelf: "center",
  },
  createFridgeText: {
    marginTop: 10,
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
});

export default JoinFridgeModal;