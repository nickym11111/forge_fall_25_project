import { supabase } from "@/app/utils/client";
import React, { useEffect, useState } from "react";
import { StyleSheet, TextInput, View, Text } from "react-native";
import CustomButton from "@/components/CustomButton";
import CustomHeader from "@/components/CustomHeader";
import ToastMessage from "@/components/ToastMessage";
import { useAuth } from "../../context/authContext";
import { navigate } from "expo-router/build/global-state/routing";
import { useLocalSearchParams } from "expo-router";

export default function ResetPassword() {
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [isToastVisible, setIsToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [sessionInitialized, setSessionInitialized] = useState(false);
  
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
      <CustomHeader
        title="Reset Password"
        logo={require("../../../assets/images/FridgeIcon.png")}
      />

      <ToastMessage message={toastMessage} visible={isToastVisible} />

      <View style={styles.formContainer}>
        {!isRecoveryMode ? (
          // Step 1: Request password reset email
          <View style={styles.form}>
            <Text style={styles.title}>Forgot Password?</Text>
            <Text style={styles.description}>
              Enter your email address and we'll send you a link to reset your password.
            </Text>
            <TextInput
              onChangeText={setEmail}
              placeholder="Email"
              value={email}
              style={styles.input}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <CustomButton
              title="Send Reset Email"
              onPress={handleSendResetEmail}
              style={styles.button}
              className=""
              disabled={false}
            />
            <Text
              style={styles.backToLogin}
              onPress={() => navigate("/")}
            >
              Back to Login
            </Text>
          </View>
        ) : (
          // Step 2: Update password after clicking email link
          <View style={styles.form}>
            <Text style={styles.title}>Create New Password</Text>
            <Text style={styles.description}>
              Please enter your new password below.
            </Text>
            <TextInput
              onChangeText={setNewPassword}
              placeholder="New Password"
              value={newPassword}
              secureTextEntry
              style={styles.input}
            />
            <TextInput
              onChangeText={setConfirmPassword}
              placeholder="Confirm Password"
              value={confirmPassword}
              secureTextEntry
              style={styles.input}
            />
            <CustomButton
              title="Update Password"
              onPress={handleUpdatePassword}
              style={styles.button}
              className=""
              disabled={false}
            />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FF",
  },
  formContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 200,
  },
  form: {
    alignItems: "center",
    width: 280,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
  },
  description: {
    fontSize: 14,
    color: "#666",
    marginBottom: 20,
    textAlign: "center",
  },
  input: {
    width: "100%",
    marginVertical: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    fontSize: 15,
  },
  button: {
    width: 217,
    marginTop: 10,
  },
  backToLogin: {
    marginTop: 15,
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
});