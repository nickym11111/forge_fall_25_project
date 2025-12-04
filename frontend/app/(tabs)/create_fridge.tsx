import {
  StyleSheet,
  TextInput,
  View,
  Text,
  Alert,
  ScrollView,
  TouchableOpacity,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { useState, useRef } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from "../utils/client";
import { useAuth } from "../context/authContext";
import { router } from 'expo-router';

//Custom components
import CustomButton from "@/components/CustomButton";

//Type for API response
interface ApiResponse {
  status: "success" | "error";
  message: string;
  fridge_id?: number;
}

//Backend API endpoint
const API_URL = `${process.env.EXPO_PUBLIC_API_URL}/fridges`;
const SEND_INVITE_URL = `${process.env.EXPO_PUBLIC_API_URL}/fridge/send-invite`;

//Styles
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
    paddingHorizontal: 24,
    paddingBottom: 100,
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
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
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
    width: "100%",
    marginTop: 8,
  },
  label: {
    fontSize: 15,
    color: "#333",
    marginBottom: 8,
    marginTop: 10,
    fontWeight: "500",
  },
  joinFridgeText: {
    marginTop: 24,
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
  },
});

//Main
export default function CreateFridgeScreen() {
  // State variables
  const [fridgeName, setFridgeName] = useState(""); // name of the fridge
  const [emails, setEmails] = useState<string[]>([""]); // invited emails
  const [isLoading, setIsLoading] = useState<boolean>(false); // loading indicator
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);

  const { user, refreshUser } = useAuth();

  //Update a specific email input
  const enterEmail = (text: string, index: number) => {
    const updated = [...emails];
    updated[index] = text;
    setEmails(updated);
  };

  //Add a new empty email field
  const addEmailField = () => setEmails([...emails, ""]);

  //Remove a specific email input
  const removeEmail = (index: number) => {
    const updated = emails.filter((_, i) => i !== index);
    setEmails(updated);
  };

  //Handle fridge creation and sending invites
  const handleCreateFridge = async () => {
    if (!fridgeName.trim()) {
      Alert.alert("Error", "Please enter a Kitchen name.");
      return;
    }

    setIsLoading(true);

    try {
      console.log("Getting a new session:");
      const { data: { session }, error } = await supabase.auth.getSession();
    
      console.log("Session exists?", !!session);
      console.log("Session error:", error);

      if (error || !session) {
        throw new Error("No active session. Please log in again.");
      }

      console.log("User ID from session:", user?.id);
      console.log("User email from session:", user?.email);

      // Create the fridge
      const createFridgeResponse = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json",
                   "Authorization": `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ name: fridgeName }),
      });

      const fridgeData: ApiResponse = await createFridgeResponse.json();
      console.log("Kitchen creation response:", fridgeData);

      console.log("✅ Step 1: Fridge created successfully"); 

      if (!createFridgeResponse.ok || fridgeData.status !== "success") {
        throw new Error(fridgeData.message || "Failed to create Kitchen");
      }

      console.log("✅ Step 2: Response validation passed");

      const fridgeId = fridgeData.fridge_id;
      if (!fridgeId) {
        throw new Error("No Kitchen ID returned from server");
      }

      // Invite code 
      /*
      // 2. Then, send invites to all provided emails
      const invitePromises = validEmails.map(async (email) => {
        const inviteResponse = await fetch(SEND_INVITE_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json",
                     "Authorization": `Bearer ${session.access_token}`},
          body: JSON.stringify({
            fridge_id: fridgeId.toString(),
            emails: validEmails,
            invited_by: user?.email,
          }),
        });
        return inviteResponse.json();
      });

      const inviteResults = await Promise.allSettled(invitePromises);

      // Check for any failed invites
      const failedInvites = inviteResults
        .map((result, index) =>
          result.status === "rejected" || result.value.status !== "success"
            ? validEmails[index]
            : null
        )
        .filter(Boolean);

      if (failedInvites.length > 0) {
        Alert.alert(
          "Partial Success",
          `Kitchen created successfully, but failed to send invites to: ${failedInvites.join(
            ", "
          )}`
        );
      } else {
        Alert.alert(
          "Success!",
          "Kitchen created and invites sent successfully!"
        );
      }
      */

      await refreshUser();

      // Reset state
      setIsLoading(false);
      setFridgeName("");
      setEmails([""]);

      router.replace(`/(tabs)/two`);

      Alert.alert(
        "Success!",
        "Fridge created successfully!"
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

  //Page Setup
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Create Kitchen</Text>
      </View>
      <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
        <Ionicons name="close" size={28} color="#64748b" />
      </TouchableOpacity>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView 
          contentContainerStyle={styles.formContainer}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.form}>
            <View style={[
              styles.inputContainer,
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
                returnKeyType="default"
                onSubmitEditing={Keyboard.dismiss}
                blurOnSubmit={true}
                onFocus={() => setFocusedInput("fridgeName")}
                onBlur={() => setFocusedInput(null)}
              />
            </View>
            {/*Create button*/}
          <CustomButton
            title={isLoading ? "Creating..." : "Create Kitchen"}
            onPress={handleCreateFridge}
            style={styles.createButton}
            disabled={isLoading}
            className={""}
          />

          {/*Navigate to Join Fridge page*/}
          <Text
            style={styles.joinFridgeText}
            onPress={() => !isLoading && router.push("/(tabs)/Join-Fridge")}
          >
            Join a kitchen instead
          </Text>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </View>
  );
}

