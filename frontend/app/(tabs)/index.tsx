import { StyleSheet, TextInput, View, Text } from "react-native";
import { useState } from "react";
import CustomButton from "@/components/CustomButton";
import { navigate } from "expo-router/build/global-state/routing";
import CustomHeader from "@/components/CustomHeader";
import ToastMessage from "@/components/ToastMessage";
import { useAuth } from "../context/authContext";  // NEW: Add this import

export default function TabOneScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [isToastVisible, setIsToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

<<<<<<< HEAD
  const { login } = useAuth();  // NEW: Get login from context

=======
>>>>>>> 2eb73e9 (Refactor API URL references to use environment variable for consistency)
  const apiUrl = process.env.EXPO_PUBLIC_API_URL;
  console.log("API URL:", apiUrl);

  return (
    <View style={styles.container}>
<<<<<<< HEAD
      <CustomHeader 
      title="Fridge Flow  " 
      logo={require('../../assets/images/FridgeIcon.png')}/>
=======
      <CustomHeader title="Fridge Flow 🏠"/>
>>>>>>> 5ca5d15 (Refactor image picking logic and remove redundant comments in ParseReceiptScreen)

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
                const result = await login(email, password);  // CHANGED: Use context login
                
                if (result.success) {  // CHANGED: Check result.success
                  setToastMessage("Login successful!");
                } else {
                  setToastMessage(result.error || "Login failed");  // CHANGED: result.error
                }
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
    color: '#d32f2f', 
    fontWeight: 'bold',
  },
});