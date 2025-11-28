import {
  StyleSheet,
  TextInput,
  View,
  Text,
  Alert,
  ScrollView,
  TouchableOpacity,
  Keyboard,
} from "react-native";
import { useState, useCallback } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from "../utils/client";
import { useAuth } from "../context/authContext";
import { router } from 'expo-router';

//Custom components
import CustomButton from "@/components/CustomButton";
import CustomHeader from "@/components/CustomHeader";
import ProfileIcon from "@/components/ProfileIcon";

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

//Main
export default function CreateFridgeScreen() {
  // State variables
  const [fridgeName, setFridgeName] = useState(""); // name of the fridge
  const [emails, setEmails] = useState<string[]>([""]); // invited emails
  const [isLoading, setIsLoading] = useState<boolean>(false); // loading indicator

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

    // Filter out empty emails
    const validEmails = emails.filter((email) => email.trim() !== "");
    if (validEmails.length === 0) {
      Alert.alert("Error", "Please enter at least one email address.");
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

      router.replace("/(tabs)/two");

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
      {/*Page Header*/}
      <CustomHeader 
      title="Create Fridge  "
      logo={require('../../assets/images/FridgeIcon.png')}
      />
      <ProfileIcon className="profileIcon" />
      <ScrollView contentContainerStyle={styles.formContainer}>
        <View style={styles.form}>
          {/*Enter Fridge Name*/}
          <Text style={styles.label}>Kitchen Name:</Text>
          <TextInput
            style={styles.input}
            placeholder="example"
            placeholderTextColor="gray"
            value={fridgeName}
            onChangeText={setFridgeName}
            editable={!isLoading}
            returnKeyType="default"
            onSubmitEditing={Keyboard.dismiss}
            blurOnSubmit={true}
          />

          {/*Invite Fridgemates*/}
          <Text style={styles.label}>Invite KitchenMates (Email):</Text>

          {/*Email fields*/}
          {emails.map((email, index) => (
            <View key={index} style={styles.inputRow}>
              <TextInput
                style={styles.input}
                placeholder="friend@example.com"
                placeholderTextColor="gray"
                value={email}
                onChangeText={(text) => enterEmail(text, index)}
                editable={!isLoading}
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
                blurOnSubmit={true}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              {/*Remove email button*/}
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

          {/*Add more email fields*/}
          <Text style={styles.addEmailText} onPress={addEmailField}>
            + Add Another Email
          </Text>

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
    </View>
  );
}

