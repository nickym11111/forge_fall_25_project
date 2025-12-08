import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: "default" | "cancel" | "destructive";
}

interface AlertOptions {
  title?: string;
  message: string;
  buttons?: AlertButton[];
}

interface AlertContextType {
  showAlert: (options: AlertOptions) => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const useCustomAlert = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error("useCustomAlert must be used within AlertProvider");
  }
  return context;
};

export const AlertProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [alert, setAlert] = useState<AlertOptions | null>(null);
  const [visible, setVisible] = useState(false);

  const showAlert = useCallback((options: AlertOptions) => {
    // Default buttons if none provided
    const buttons: AlertButton[] =
      options.buttons && options.buttons.length > 0
        ? options.buttons
        : [{ text: "OK", style: "default" }];

    setAlert({ ...options, buttons });
    setVisible(true);
  }, []);

  // Set global instance on mount
  useEffect(() => {
    setGlobalAlertInstance({ showAlert });
  }, [showAlert]);

  const hideAlert = useCallback(() => {
    setVisible(false);
    // Clear alert after animation
    setTimeout(() => setAlert(null), 200);
  }, []);

  const handleButtonPress = (button: AlertButton) => {
    hideAlert();
    if (button.onPress) {
      setTimeout(() => button.onPress!(), 200);
    }
  };

  const getIcon = () => {
    if (!alert) return null;
    
    // Determine icon based on title or first button style
    const hasDestructive = alert.buttons?.some((b) => b.style === "destructive");
    const hasCancel = alert.buttons?.some((b) => b.style === "cancel");
    
    if (alert.title?.toLowerCase().includes("error") || hasDestructive) {
      return <Ionicons name="alert-circle" size={48} color="#ef4444" />;
    }
    if (alert.title?.toLowerCase().includes("success")) {
      return <Ionicons name="checkmark-circle" size={48} color="#14b8a6" />;
    }
    if (hasCancel) {
      return <Ionicons name="information-circle" size={48} color="#14b8a6" />;
    }
    return <Ionicons name="information-circle" size={48} color="#14b8a6" />;
  };

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
      <Modal
        visible={visible}
        transparent={true}
        animationType="fade"
        onRequestClose={hideAlert}
      >
        <Pressable style={styles.overlay} onPress={hideAlert}>
          <Pressable style={styles.modal} onPress={(e) => e.stopPropagation()}>
            {alert && (
              <>
                {getIcon()}
                {alert.title && (
                  <Text style={styles.title}>{alert.title}</Text>
                )}
                <Text style={styles.message}>{alert.message}</Text>
                <View
                  style={[
                    styles.buttonContainer,
                    alert.buttons!.length === 1 && styles.singleButtonContainer,
                    alert.buttons!.length > 2 && styles.verticalButtonContainer,
                  ]}
                >
                  {alert.buttons?.map((button, index) => {
                    const isDestructive = button.style === "destructive";
                    const isCancel = button.style === "cancel";
                    const isPrimary =
                      !isDestructive && !isCancel && index === alert.buttons!.length - 1;

                    return (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.button,
                          isPrimary && styles.primaryButton,
                          isDestructive && styles.destructiveButton,
                          isCancel && styles.cancelButton,
                          alert.buttons!.length === 1 && styles.fullWidthButton,
                          alert.buttons!.length > 2 && styles.fullWidthButton,
                          index < alert.buttons!.length - 1 && alert.buttons!.length > 2 && styles.buttonMargin,
                        ]}
                        onPress={() => handleButtonPress(button)}
                      >
                        <Text
                          style={[
                            styles.buttonText,
                            isPrimary && styles.primaryButtonText,
                            isDestructive && styles.destructiveButtonText,
                            isCancel && styles.cancelButtonText,
                          ]}
                        >
                          {button.text}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </AlertContext.Provider>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modal: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 32,
    width: "100%",
    maxWidth: 380,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1e293b",
    marginTop: 16,
    marginBottom: 12,
    textAlign: "center",
  },
  message: {
    fontSize: 16,
    color: "#64748b",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    gap: 12,
  },
  singleButtonContainer: {
    justifyContent: "center",
  },
  verticalButtonContainer: {
    flexDirection: "column",
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  fullWidthButton: {
    flex: 0,
    width: "100%",
  },
  buttonMargin: {
    marginBottom: 8,
  },
  primaryButton: {
    backgroundColor: "#14b8a6",
    shadowColor: "#14b8a6",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 2,
  },
  destructiveButton: {
    backgroundColor: "#ef4444",
    shadowColor: "#ef4444",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 2,
  },
  cancelButton: {
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  primaryButtonText: {
    color: "#ffffff",
  },
  destructiveButtonText: {
    color: "#ffffff",
  },
  cancelButtonText: {
    color: "#64748b",
  },
});

// Global alert instance - will be set by AlertProvider
let globalAlertInstance: AlertContextType | null = null;

export const setGlobalAlertInstance = (instance: AlertContextType) => {
  globalAlertInstance = instance;
};

// Helper function to match React Native Alert.alert API for easy migration
// Usage: CustomAlert.alert(title, message?, buttons?)
export const CustomAlert = {
  alert: (
    title: string,
    message?: string,
    buttons?: Array<{
      text?: string;
      onPress?: (() => void) | null;
      style?: "default" | "cancel" | "destructive";
    }>
  ) => {
    if (globalAlertInstance) {
      // Convert message - if no message provided, use title as message
      const alertMessage = message !== undefined ? message : title;
      const alertTitle = message !== undefined ? title : undefined;
      
      // Process buttons
      let processedButtons: AlertButton[] | undefined;
      if (buttons && buttons.length > 0) {
        processedButtons = buttons.map((b) => ({
          text: b.text || "OK",
          onPress: b.onPress || undefined,
          style: b.style || "default",
        }));
      }

      globalAlertInstance.showAlert({
        title: alertTitle,
        message: alertMessage,
        buttons: processedButtons,
      });
    } else {
      // Fallback to native alert if context not available (during initialization)
      const { Alert } = require("react-native");
      Alert.alert(title, message, buttons);
    }
  },
};

