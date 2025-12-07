import {
  StyleSheet,
  TextInput,
  View,
  Text,
  TouchableOpacity,
  Keyboard,
  TouchableWithoutFeedback,
  ScrollView,
  Modal,
  Image,
} from "react-native";
import { useState, useRef } from "react";
import { Ionicons } from "@expo/vector-icons";
import CustomButton from "@/components/CustomButton";
import { navigate } from "expo-router/build/global-state/routing";
import { useAuth } from "../context/authContext";

export default function TabOneScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const passwordRef = useRef<TextInput>(null);

  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const { login } = useAuth();

  const apiUrl = process.env.EXPO_PUBLIC_API_URL;
  console.log("API URL:", apiUrl);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Sign In</Text>
      </View>

      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          contentContainerStyle={styles.loginContainer}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.logoContainer}>
            <Image
              source={require("../../assets/images/New_Fridge_Logo.png")}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.headline}>KitchenCloud</Text>
          </View>
          <View style={styles.loginCard}>
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
                onChangeText={setEmail}
                placeholder="Email"
                placeholderTextColor="#94a3b8"
                value={email}
                style={styles.loginInput}
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
                style={styles.loginInput}
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
            <CustomButton
              title="Sign In"
              onPress={async () => {
                try {
                  const result = await login(email, password);

                  if (!result.success) {
                    setErrorMessage(
                      result.error ||
                        "We're sorry, but something went wrong. Please try again."
                    );
                    setShowErrorModal(true);
                  }
                } catch (e) {
                  setErrorMessage(
                    "We're sorry, but something went wrong. Please try again."
                  );
                  setShowErrorModal(true);
                  console.log(e);
                }
              }}
              style={styles.loginButton}
              className=""
              disabled={false}
            />
            <TouchableOpacity
              style={styles.createAccountButton}
              onPress={() => {
                navigate("/account/CreateAccount");
              }}
            >
              <Text style={styles.createAccountText}>
                Don't have an account?{" "}
                <Text style={styles.createAccountLink}>Create Account</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>

      <Modal
        visible={showErrorModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowErrorModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.errorModal}>
            <Text style={styles.errorTitle}>Error</Text>
            <Text style={styles.errorMessage}>{errorMessage}</Text>
            <TouchableOpacity
              style={styles.errorButton}
              onPress={() => setShowErrorModal(false)}
            >
              <Text style={styles.errorButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFBFC",
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 24,
    marginTop: 20,
  },
  logo: {
    width: 120,
    height: 120,
  },
  headline: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1e293b",
    marginTop: 16,
  },
  loginContainer: {
    flexGrow: 1,
    justifyContent: "flex-start",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 100,
    paddingTop: 40,
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
  loginCard: {
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
  loginInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: "#1e293b",
  },
  eyeIcon: {
    padding: 4,
  },
  loginButton: {
    width: "100%",
    marginTop: 8,
  },
  createAccountButton: {
    marginTop: 24,
    alignItems: "center",
  },
  createAccountText: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
  },
  createAccountLink: {
    color: "#14b8a6",
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  errorModal: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 24,
    width: "85%",
    maxWidth: 320,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 12,
  },
  errorMessage: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
  },
  errorButton: {
    backgroundColor: "#14b8a6",
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 16,
    minWidth: 100,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  errorButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
});
