import { StyleSheet, TextInput, View, Text, Alert } from "react-native";
import { useState } from "react";
import CustomButton from "@/components/CustomButton";
import { navigate } from "expo-router/build/global-state/routing";
import CustomHeader from "@/components/CustomHeader";

interface ApiResponse {
  status: 'success' | 'error';
  message: string;
}

const styles = StyleSheet.create({

  container: 
  {
    flex: 1,
    backgroundColor: "#F8F9FF",
  },

  joinContainer: 
  {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 200,
  },

  joinForm: 
  {
    alignItems: "center",
    width: 280,
  },

  joinInput: 
  {
    width: "100%",
    marginVertical: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    fontSize: 15,
  },

  joinButton: 
  {
    width: 217,
  },

  createFridgeButton: 
  {
    marginTop: 10,
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
});

export default function JoinFridgeScreen()
{
  const [jCode, setjCode] = useState("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  const handleJoinFridge = async () => {
  if (!jCode.trim()){
    Alert.alert("error", "Please enter a fridge code.");
    return;
  }

  setIsLoading(true);
  const API_URL = "http://127.0.0.1:8000/fridge/join-fridge"; //change ip address for backend development

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fridgeCode: jCode,
      }),
    });

  const data: ApiResponse = await response.json();

  if (response.ok && data.status === "success") {
    Alert.alert("Success!", data.message);
  }
  else {
    Alert.alert("Join Failed", data.message || "An unknown error occurred.");
  }
} catch (error) {
  console.error("Network request failed:", error);
  Alert.alert("Connection Error", "Could not connect to the server. Please check your internet connection.");
}finally {
  setIsLoading(false);
}
};
  return (
    <View style={styles.container}>
      <CustomHeader title = "Join Fridge 🏠"/>
      <View style = {styles.joinContainer}>
        <View style = {styles.joinForm}>
          <TextInput
            onChangeText={setjCode}
            placeholder="abc-123"
            value={jCode}
            style={styles.joinInput}
            editable={!isLoading}
          />
          <CustomButton 
            title={isLoading ? "Joining..." : "Join"}
            onPress={() => handleJoinFridge()}
            style={styles.joinButton}
            className=""
            disabled={isLoading}
          />
          <Text
            style={styles.createFridgeButton}
            onPress={() =>
              !isLoading && navigate("/(tabs)/create_fridge")} // connect to "create fridge" page
          >
            Create a fridge instead
          </Text>
        </View>
      </View>
    </View>
  );
}


