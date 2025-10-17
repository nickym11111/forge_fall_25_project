import { StyleSheet, TextInput, View, Text } from "react-native";
import { useState } from "react";
import CustomButton from "@/components/CustomButton";
import { navigate } from "expo-router/build/global-state/routing";
import CustomHeader from "@/components/CustomHeader";
import { LoginRequest } from "../api/Login";
import ToastMessage from "@/components/ToastMessage";
import { useAuth } from "@/contexts/AuthContext";

export default function TabOneScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [isToastVisible, setIsToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const { login } = useAuth();

  const apiUrl = process.env.EXPO_PUBLIC_API_URL;

  return (
    <View style={styles.container}>
      <CustomHeader title="Fridge Flow 🏠" />
      <ToastMessage message={toastMessage} visible={isToastVisible} />
      <View style={styles.loginContainer}>
        <View style={styles.loginForm}>
          <TextInput
            onChangeText={setEmail}
            placeholder="Email"
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
              setIsToastVisible(true);
              setTimeout(() => setIsToastVisible(false), 3000);

              try {
                const response = await login(email, password);
                setToastMessage(
                  response?.status === "Login successful"
                    ? "Login successful!"
                    : response?.error || "Login failed"
                );
              } catch (e) {
                setToastMessage("Network error");
                console.log(e);
              }
              setIsToastVisible(true);
              setTimeout(() => setIsToastVisible(false), 3000);
            }}
            style={styles.loginButton}
            className=""
            disabled={false}
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
  redText: {
    color: "#d32f2f",
    fontWeight: "bold",
  },
});
