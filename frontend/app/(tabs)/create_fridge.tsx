import { 
  StyleSheet, 
  TextInput, 
  View, 
  Text, 
  Alert, 
  ScrollView, 
  TouchableOpacity 
} from "react-native";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";

//Custom components
import CustomButton from "@/components/CustomButton";
import CustomHeader from "@/components/CustomHeader";
import { navigate } from "expo-router/build/global-state/routing";

//Type for API response
interface ApiResponse {
  status: "success" | "error";
  message: string;
  fridge_id?: number;
}

//Backend API endpoint
const API_URL = "http://127.0.0.1:8000/fridges";

//Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FF",
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

  //Handle fridge creation request
  const handleCreateFridge = async () => {
    if (!fridgeName.trim()) {
      Alert.alert("Error", "Please enter a fridge name.");
      return;
    }

    setIsLoading(true);

    try {
      //Send POST request to FastAPI backend
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fridgeName,
          emails: emails.filter((e) => e.trim() !== ""), //remove empty entries
        }),
      });

      const data: ApiResponse = await response.json();
      console.log("API Response:", data);

      //Success case
      if (response.ok && data.status === "success") {
        Alert.alert("Success!", data.message || "Fridge created!");
        navigate("/(tabs)"); // redirect to main tabs page
      } else {
        //Error case from API
        Alert.alert("Error", data.message || "Failed to create fridge.");
      }
    } catch (error) {
      //Network or connection error
      console.error("Network error:", error);
      Alert.alert(
        "Connection Error",
        "Could not connect to the server. Make sure your backend is running."
      );
    } finally {
      setIsLoading(false);
    }
  };

  //Page Setup
  return (
    <View style={styles.container}>
      {/*Page Header*/}
      <CustomHeader title="Create Fridge 🧊" />

      <ScrollView contentContainerStyle={styles.formContainer}>
        <View style={styles.form}>
          {/*Enter Fridge Name*/}
          <Text style={styles.label}>Fridge Name:</Text>
          <TextInput
            style={styles.input}
            placeholder="example"
            placeholderTextColor="gray"
            value={fridgeName}
            onChangeText={setFridgeName}
            editable={!isLoading}
          />

          {/*Invite Fridgemates*/}
          <Text style={styles.label}>Invite Fridgemates (Email):</Text>

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
            title={isLoading ? "Creating..." : "Create Fridge"}
            onPress={handleCreateFridge}
            style={styles.createButton}
            disabled={isLoading} className={""}          />

          {/*Navigate to Join Fridge page*/}
          <Text
            style={styles.joinFridgeText}
            onPress={() => !isLoading && navigate("/(tabs)/Join-Fridge")}
          >
            Join a fridge instead
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
