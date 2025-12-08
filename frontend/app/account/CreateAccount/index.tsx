import {
  StyleSheet,
  TextInput,
  View,
  Text,
  TouchableOpacity,
  Keyboard,
  TouchableWithoutFeedback,
  ScrollView,
} from "react-native";
import { useState, useRef } from "react";
import { Ionicons } from "@expo/vector-icons";
import CustomButton from "@/components/CustomButton";
import { navigate } from "expo-router/build/global-state/routing";
import { CreateAccountRequest } from "../../api/CreateAccount";
import { Alert } from "react-native";

export default function CreateAccount() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [dietaryRestrictionsText, setDietaryRestrictionsText] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const lastNameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const dietaryRef = useRef<TextInput>(null);
  const dietaryRestrictions = dietaryRestrictionsText
    .split(",")
    .map((item) => item.trim());

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Create Account</Text>
      </View>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          contentContainerStyle={styles.createAccountContainer}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.createAccountCard}>
            <View
              style={[
                styles.inputContainer,
                focusedInput === "firstName" && styles.inputContainerFocused,
              ]}
              collapsable={false}
            >
              <Ionicons
                name="person-outline"
                size={20}
                color="#94a3b8"
                style={styles.inputIcon}
              />
              <TextInput
                onChangeText={setFirstName}
                placeholder="First Name"
                placeholderTextColor="#94a3b8"
                value={firstName}
                style={styles.createAccountInput}
                onFocus={() => setFocusedInput("firstName")}
                onBlur={() => setFocusedInput(null)}
                onSubmitEditing={Keyboard.dismiss}
                returnKeyType="default"
                blurOnSubmit={true}
              />
            </View>
            <View
              style={[
                styles.inputContainer,
                focusedInput === "lastName" && styles.inputContainerFocused,
              ]}
              collapsable={false}
            >
              <Ionicons
                name="person-outline"
                size={20}
                color="#94a3b8"
                style={styles.inputIcon}
              />
              <TextInput
                ref={lastNameRef}
                onChangeText={setLastName}
                placeholder="Last Name"
                placeholderTextColor="#94a3b8"
                value={lastName}
                style={styles.createAccountInput}
                onFocus={() => setFocusedInput("lastName")}
                onBlur={() => setFocusedInput(null)}
                onSubmitEditing={Keyboard.dismiss}
                returnKeyType="default"
                blurOnSubmit={true}
              />
            </View>
            <View
              style={[
                styles.inputContainer,
                focusedInput === "email" && styles.inputContainerFocused,
              ]}
              collapsable={false}
            >
              <Ionicons
                name="mail-outline"
                size={20}
                color="#94a3b8"
                style={styles.inputIcon}
              />
              <TextInput
                ref={emailRef}
                onChangeText={setEmail}
                placeholder="Email"
                placeholderTextColor="#94a3b8"
                value={email}
                style={styles.createAccountInput}
                keyboardType="email-address"
                autoCapitalize="none"
                onFocus={() => setFocusedInput("email")}
                onBlur={() => setFocusedInput(null)}
                onSubmitEditing={Keyboard.dismiss}
                returnKeyType="default"
                blurOnSubmit={true}
              />
            </View>
            <View
              style={[
                styles.inputContainer,
                focusedInput === "password" && styles.inputContainerFocused,
              ]}
              collapsable={false}
            >
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color="#94a3b8"
                style={styles.inputIcon}
              />
              <TextInput
                ref={passwordRef}
                onChangeText={setPassword}
                placeholder="Password"
                placeholderTextColor="#94a3b8"
                value={password}
                secureTextEntry={!showPassword}
                style={styles.createAccountInput}
                onFocus={() => setFocusedInput("password")}
                onBlur={() => setFocusedInput(null)}
                onSubmitEditing={Keyboard.dismiss}
                returnKeyType="default"
                blurOnSubmit={true}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIcon}
              >
                <Ionicons
                  name={showPassword ? "eye-outline" : "eye-off-outline"}
                  size={20}
                  color="#94a3b8"
                />
              </TouchableOpacity>
            </View>
            <View
              style={[
                styles.inputContainer,
                focusedInput === "dietary" && styles.inputContainerFocused,
              ]}
              collapsable={false}
            >
              <Ionicons
                name="restaurant-outline"
                size={20}
                color="#94a3b8"
                style={styles.inputIcon}
              />
              <TextInput
                ref={dietaryRef}
                onChangeText={setDietaryRestrictionsText}
                placeholder="Dietary Restrictions (optional)"
                placeholderTextColor="#94a3b8"
                value={dietaryRestrictionsText}
                style={styles.createAccountInput}
                onFocus={() => setFocusedInput("dietary")}
                onBlur={() => setFocusedInput(null)}
                onSubmitEditing={Keyboard.dismiss}
                returnKeyType="default"
                blurOnSubmit={true}
              />
            </View>
            <CustomButton
              title="Create Account"
              onPress={async () => {
                try {
                  const response = await CreateAccountRequest(
                    email,
                    password,
                    firstName,
                    lastName,
                    dietaryRestrictions
                  );
                  Alert.alert(
                    "Check your email",
                    "Please check your email to verify your account.",
                    [
                      {
                        text: "OK",
                        onPress: () => navigate("/(tabs)/create_fridge"),
                      },
                    ]
                  );
                } catch (e) {
                  console.log(e);
                }
              }}
              disabled={!firstName || !lastName || !email || !password}
              style={styles.createAccountButton}
              className=""
            />
            <TouchableOpacity
              style={styles.backToLoginButton}
              onPress={() => {
                navigate("/");
              }}
            >
              <Text style={styles.backToLoginText}>
                Already have an account?{" "}
                <Text style={styles.backToLoginLink}>Sign in</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </View>
  );
}

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
  createAccountContainer: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 100,
    paddingTop: 20,
  },
  createAccountCard: {
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
    borderWidth: 1,
    borderColor: "#e2e8f0",
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
  createAccountInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: "#1e293b",
  },
  eyeIcon: {
    padding: 4,
  },
  createAccountButton: {
    width: "100%",
    marginTop: 8,
  },
  backToLoginButton: {
    marginTop: 24,
    alignItems: "center",
  },
  backToLoginText: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
  },
  backToLoginLink: {
    color: "#14b8a6",
    fontWeight: "600",
  },
});
