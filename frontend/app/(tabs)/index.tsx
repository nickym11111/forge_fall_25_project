import { StyleSheet, TextInput, View, Text } from "react-native";
import { useState } from "react";
import CustomButton from "@/components/CustomButton";
import { navigate } from "expo-router/build/global-state/routing";
import CustomHeader from "@/components/CustomHeader";

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
            onPress={() => {
              console.log("login");
            }}
            style={styles.loginButton}
            className=""
          />
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
});
