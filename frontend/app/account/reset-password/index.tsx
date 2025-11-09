import { supabase } from "@/app/utils/client";
import React, { useEffect, useState } from "react";
import { StyleSheet, TextInput, View, Text } from "react-native";
import CustomButton from "@/components/CustomButton";
import CustomHeader from "@/components/CustomHeader";
import ToastMessage from "@/components/ToastMessage";
import { useAuth } from "../../context/authContext";
import { navigate } from "expo-router/build/global-state/routing";

export default function ResetPassword() {
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [isToastVisible, setIsToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  
  const { forgotPassword } = useAuth();

  /**
   * Step 2: Once the user is redirected back to your application,
   * ask the user to reset their password.
   */
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecoveryMode(true);
      }
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
      const { data, error } = await supabase.auth.updateUser({ 
        password: newPassword 
      });

      if (error) {
        setToastMessage(`Error: ${error.message}`);
        setIsToastVisible(true);
        setTimeout(() => setIsToastVisible(false), 3000);
        return;
      }

      if (data) {
        setToastMessage("Password updated successfully!");
        setIsToastVisible(true);
        setTimeout(() => {
          setIsToastVisible(false);
          navigate("/");
        }, 2000);
      }
    } catch (error) {
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