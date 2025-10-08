import { StyleSheet, TextInput, View, Text } from "react-native";
import { useState } from "react";
import CustomButton from "@/components/CustomButton";
import CustomHeader from "@/components/CustomHeader";
import { navigate } from "expo-router/build/global-state/routing";
import { CreateAccountRequest } from "../../api/CreateAccount";
import ToastMessage from "@/components/ToastMessage";

export default function CreateAccount() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [dietaryRestrictionsText, setDietaryRestrictionsText] = useState("");
  const dietaryRestrictions = dietaryRestrictionsText
    .split(",")
    .map((item) => item.trim());
  const [isToastVisible, setIsToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  return (
    <View style={styles.container}>
      <CustomHeader title="Fridge Flow 🏠" />
      <ToastMessage message={toastMessage} visible={isToastVisible} />
      <View style={styles.createAccountContainer}>
        <View style={styles.createAccountForm}>
          <TextInput
            onChangeText={setFirstName}
            placeholder="First Name"
            value={firstName}
            style={styles.createAccountInput}
          />
          <TextInput
            onChangeText={setLastName}
            placeholder="Last Name"
            value={lastName}
            style={styles.createAccountInput}
          />
          <TextInput
            onChangeText={setEmail}
            placeholder="Email"
            value={email}
            style={styles.createAccountInput}
          />
          <TextInput
            onChangeText={setPassword}
            placeholder="Password"
            value={password}
            secureTextEntry
            style={styles.createAccountInput}
          />
          <TextInput
            onChangeText={setDietaryRestrictionsText}
            placeholder="Dietary Restrictions"
            value={dietaryRestrictionsText}
            style={styles.createAccountInput}
          />
          <CustomButton
            title="Create Account"
            onPress={async () => {
              setIsToastVisible(true);
              setTimeout(() => setIsToastVisible(false), 3000);
              try {
                const response = await CreateAccountRequest(
                  email,
                  password,
                  firstName,
                  lastName,
                  dietaryRestrictions
                );
                setToastMessage(
                  response?.status === "User created successfully"
                    ? "Account created!"
                    : response?.error || "Error creating account"
                );
              } catch (e) {
                setToastMessage("Network error");
                console.log(e);
              }
              setIsToastVisible(true);
              setTimeout(() => setIsToastVisible(false), 3000);
            }}
            disabled={!firstName || !lastName || !email || !password}
            style={styles.createAccountButton}
            className=""
          />
          <Text
            style={styles.backToLoginButton}
            onPress={() => {
              navigate("/");
            }}
          >
            Back to Login
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
  createAccountContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 200,
  },
  createAccountForm: {
    alignItems: "center",
    width: 280,
  },
  createAccountInput: {
    width: "100%",
    marginVertical: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    fontSize: 15,
  },
  createAccountButton: {
    width: "100%",
  },
  backToLoginButton: {
    marginTop: 15,
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
});
