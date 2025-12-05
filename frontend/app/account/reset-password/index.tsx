import { supabase } from "@/app/utils/client";
import React, { useEffect, useState, useRef } from "react";
import { StyleSheet, TextInput, View, Text, TouchableOpacity, Keyboard, TouchableWithoutFeedback, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import CustomButton from "@/components/CustomButton";
import CustomHeader from "@/components/CustomHeader";
import ToastMessage from "@/components/ToastMessage";
import { useAuth } from "../../context/authContext";
import { router, useLocalSearchParams } from "expo-router";
import { navigate } from "expo-router/build/global-state/routing";

export default function ResetPassword() {
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [isToastVisible, setIsToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [sessionInitialized, setSessionInitialized] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const confirmPasswordRef = useRef<TextInput>(null);
  
  const { forgotPassword } = useAuth();
  const params = useLocalSearchParams();

  /**
   * Check for error parameters in URL (e.g., expired or invalid links)
   * Also check for recovery type to enable password reset mode
   */
  useEffect(() => {
    console.log("URL Params:", params);
    
    // Parse hash fragment if it exists (expo-router puts URL hash in "#" key)
    let hashParams: Record<string, string> = {};
    if (params["#"]) {
      const hashString = params["#"] as string;
      const searchParams = new URLSearchParams(hashString);
      searchParams.forEach((value, key) => {
        hashParams[key] = value;
      });
      console.log("Parsed Hash Params:", hashParams);
    }
    
    // Check for errors first (in both params and hashParams)
    const error = params.error || hashParams.error;
    const errorCode = params.error_code || hashParams.error_code;
    const errorDescription = params.error_description || hashParams.error_description;
    
    if (error) {
      let errorMessage = "An error occurred";
      
      if (error === "access_denied") {
        if (errorCode === "otp_expired") {
          errorMessage = "This reset link has expired. Please request a new one.";
        } else if (errorDescription) {
          errorMessage = decodeURIComponent(errorDescription as string);
        }
      }
      
      setToastMessage(errorMessage);
      setIsToastVisible(true);
      setTimeout(() => setIsToastVisible(false), 5000);
      return;
    }

    // Check if this is a recovery link (type=recovery in URL)
    const type = params.type || hashParams.type;
    const accessToken = params.access_token || hashParams.access_token;
    const refreshToken = params.refresh_token || hashParams.refresh_token;
    
    if (type === "recovery" && accessToken && refreshToken && !sessionInitialized) {
      console.log("Setting session from URL tokens");
      setSessionInitialized(true);
      
      // Set the session manually using the tokens from the URL
      supabase.auth.setSession({
        access_token: accessToken as string,
        refresh_token: refreshToken as string,
      }).then(({ data, error }) => {
        if (error) {
          console.error("Error setting session:", error);
          setToastMessage(`Error: ${error.message}`);
          setIsToastVisible(true);
          setTimeout(() => setIsToastVisible(false), 5000);
          setSessionInitialized(false); // Reset on error so user can retry
        } else {
          console.log("Session set successfully:", data);
          setIsRecoveryMode(true);
          setToastMessage("Please enter your new password");
          setIsToastVisible(true);
          setTimeout(() => setIsToastVisible(false), 3000);
        }
      });
    }
  }, [params, sessionInitialized]);

  /**
   * Step 2: Once the user is redirected back to your application,
   * ask the user to reset their password.
   * This listener catches the PASSWORD_RECOVERY event from Supabase
   */
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state changed:", event, session);
      
      if (event === "PASSWORD_RECOVERY") {
        console.log("PASSWORD_RECOVERY event detected");
        setIsRecoveryMode(true);
        setToastMessage("Please enter your new password");
        setIsToastVisible(true);
        setTimeout(() => setIsToastVisible(false), 3000);
      }
    });

    // Check current session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log("Current session on mount:", session);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  /**
   * Step 1: Send the user an email to get a password reset token.
   * This email contains a link which sends the user back to your application.
   */
  const handleSendResetEmail = async () => {
    if (!email) {
      setToastMessage("Please enter your email");
      setIsToastVisible(true);
      setTimeout(() => setIsToastVisible(false), 3000);
      return;
    }

    const result = await forgotPassword(email);
    
    if (result.success) {
      setToastMessage("Password reset email sent! Check your inbox.");
    } else {
      setToastMessage(result.error || "Failed to send reset email");
    }
    
    setIsToastVisible(true);
    setTimeout(() => setIsToastVisible(false), 3000);
  };

  const handleUpdatePassword = async () => {
    console.log("handleUpdatePassword called");
    
    if (!newPassword || !confirmPassword) {
      setToastMessage("Please fill in all fields");
      setIsToastVisible(true);
      setTimeout(() => setIsToastVisible(false), 3000);
      return;
    }

    if (newPassword !== confirmPassword) {
      setToastMessage("Passwords do not match");
      setIsToastVisible(true);
      setTimeout(() => setIsToastVisible(false), 3000);
      return;
    }

    if (newPassword.length < 6) {
      setToastMessage("Password must be at least 6 characters");
      setIsToastVisible(true);
      setTimeout(() => setIsToastVisible(false), 3000);
      return;
    }

    try {
      console.log("Calling supabase.auth.updateUser");
      const { data, error } = await supabase.auth.updateUser({ 
        password: newPassword 
      });

      console.log("Update response:", { data, error });

      if (error) {
        console.error("Update error:", error);
        setToastMessage(`Error: ${error.message}`);
        setIsToastVisible(true);
        setTimeout(() => setIsToastVisible(false), 3000);
        return;
      }

      if (data) {
        console.log("Password updated successfully");
        setToastMessage("Password updated successfully!");
        setIsToastVisible(true);
        setTimeout(() => {
          setIsToastVisible(false);
          navigate("/");
        }, 2000);
      }
    } catch (error) {
      console.error("Catch block error:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to update password";
      setToastMessage(`Error: ${errorMessage}`);
      setIsToastVisible(true);
      setTimeout(() => setIsToastVisible(false), 3000);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Reset Password</Text>
        <TouchableOpacity 
          style={styles.closeButton} 
          onPress={() => router.back()}
        >
          <Ionicons name="close" size={28} color="#64748b" />
        </TouchableOpacity>
      </View>

      <ToastMessage message={toastMessage} visible={isToastVisible} />

      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView 
          contentContainerStyle={styles.formContainer}
          keyboardShouldPersistTaps="handled"
        >
          {!isRecoveryMode ? (
            // Step 1: Request password reset email
            <View style={styles.form}>
              <Text style={styles.title}>Forgot Password?</Text>
              <Text style={styles.description}>
                Enter your email address and we'll send you a link to reset your password.
              </Text>
              <View style={[
                styles.inputContainer,
                focusedInput === "email" && styles.inputContainerFocused
              ]} collapsable={false}>
                <Ionicons name="mail-outline" size={20} color="#94a3b8" style={styles.inputIcon} />
                <TextInput
                  onChangeText={setEmail}
                  placeholder="Email"
                  placeholderTextColor="#94a3b8"
                  value={email}
                  style={styles.input}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  onFocus={() => setFocusedInput("email")}
                  onBlur={() => setFocusedInput(null)}
                  onSubmitEditing={Keyboard.dismiss}
                  returnKeyType="default"
                  blurOnSubmit={true}
                />
              </View>
              <CustomButton
                title="Send Reset Email"
                onPress={handleSendResetEmail}
                style={styles.button}
                className=""
                disabled={false}
              />
            </View>
          ) : (
            // Step 2: Update password after clicking email link
            <View style={styles.form}>
              <Text style={styles.title}>Create New Password</Text>
              <Text style={styles.description}>
                Please enter your new password below.
              </Text>
              <View style={[
                styles.inputContainer,
                focusedInput === "newPassword" && styles.inputContainerFocused
              ]} collapsable={false}>
                <Ionicons name="lock-closed-outline" size={20} color="#94a3b8" style={styles.inputIcon} />
                <TextInput
                  onChangeText={setNewPassword}
                  placeholder="New Password"
                  placeholderTextColor="#94a3b8"
                  value={newPassword}
                  secureTextEntry={!showPassword}
                  style={styles.input}
                  onFocus={() => setFocusedInput("newPassword")}
                  onBlur={() => setFocusedInput(null)}
                  onSubmitEditing={() => confirmPasswordRef.current?.focus()}
                  returnKeyType="next"
                  blurOnSubmit={false}
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
              <View style={[
                styles.inputContainer,
                focusedInput === "confirmPassword" && styles.inputContainerFocused
              ]} collapsable={false}>
                <Ionicons name="lock-closed-outline" size={20} color="#94a3b8" style={styles.inputIcon} />
                <TextInput
                  ref={confirmPasswordRef}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirm Password"
                  placeholderTextColor="#94a3b8"
                  value={confirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  style={styles.input}
                  onFocus={() => setFocusedInput("confirmPassword")}
                  onBlur={() => setFocusedInput(null)}
                  onSubmitEditing={Keyboard.dismiss}
                  returnKeyType="default"
                  blurOnSubmit={true}
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={styles.eyeIcon}
                >
                  <Ionicons
                    name={showConfirmPassword ? "eye-outline" : "eye-off-outline"}
                    size={20}
                    color="#94a3b8"
                  />
                </TouchableOpacity>
              </View>
              <CustomButton
                title="Update Password"
                onPress={handleUpdatePassword}
                style={styles.button}
                className=""
                disabled={false}
              />
            </View>
          )}
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
  closeButton: {
    position: "absolute",
    right: 20,
    top: 58,
    zIndex: 1000,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  formContainer: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 100,
    paddingTop: 20,
  },
  form: {
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
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 12,
    textAlign: "center",
    color: "#1e293b",
  },
  description: {
    fontSize: 15,
    color: "#64748b",
    marginBottom: 24,
    textAlign: "center",
    lineHeight: 22,
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
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: "#1e293b",
  },
  eyeIcon: {
    padding: 4,
  },
  button: {
    width: "100%",
    marginTop: 8,
  },
});