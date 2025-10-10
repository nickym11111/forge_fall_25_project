import { StyleSheet, TextInput, View, Text } from "react-native";
import { useState } from "react";
import CustomButton from "@/components/CustomButton";
import { navigate } from "expo-router/build/global-state/routing";
import CustomHeader from "@/components/CustomHeader";
import { LoginRequest } from "../api/Login";

export default function TabOneScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <View style={styles.container}>
      <CustomHeader title="Fridge Flow 🏠"/>

      <View style={styles.loginContainer}>
        <View style={styles.loginForm}>
          <TextInput
            onChangeText={setEmail}
            placeholder="Username"
            value={email}
            style={styles.loginInput}
          />
          <TextInput
            onChangeText={setPassword}
            placeholder="Password"
            value={password}
            secureTextEntry
            style={styles.loginInput}
          />
          <CustomButton
            title="Login"
            onPress={async () => {
              console.log("Attempting login...");
              console.log("Email entered:", email);

              try {
                const response = await LoginRequest(email, password);
                console.log("Server response:", response);

                if (response?.status === "Login successful") {
                  console.log("Login successful.");
                  console.log("User info:", response.user);
                  console.log("Session token:", response.session?.access_token);
                } else {
                  console.log("Login failed:", response?.error || "Invalid credentials.");
                }
              } catch (error) {
                console.error("Network or server error:", error);
              }
            } }
            style={styles.loginButton}
            className="" disabled={false}          />
          <Text
            style={styles.createAccountButton}
            onPress={() => {
              navigate("/account/CreateAccount");
            }}
          >
            Create Account
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FF",
  },
  loginContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 200,
  },
  loginForm: {
    alignItems: "center",
    width: 280,
  },
  loginInput: {
    width: "100%",
    marginVertical: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    fontSize: 15,
  },
  loginButton: {
    width: 217,
  },
  createAccountButton: {
    marginTop: 15,
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  redText: {
    color: '#d32f2f', 
    fontWeight: 'bold',
  },
});