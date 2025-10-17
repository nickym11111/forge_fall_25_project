
import { StyleSheet, TextInput, View, Text, Alert, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity, Animated, Modal } from "react-native";
import { useState, useRef, useEffect } from "react";
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import CustomButton from "@/components/CustomButton";
import CustomHeader from "@/components/CustomHeader";

interface ApiResponse {
  data?: any;
  message: string;
  detail?: string;
}

interface User {
  id: string;
  email: string;
  user_metadata?: {
    first_name?: string;
    last_name?: string;
  };
}

const API_URL = 'http://127.0.0.1:8000';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FF",
  },

  scrollContent: {
    flexGrow: 1,
  },

  formContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 40,
  },

  form: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "white",
    borderRadius: 12,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  label: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
    marginBottom: 6,
    marginTop: 12,
  },

  required: {
    color: "#FF6B6B",
  },

  input: {
    width: "100%",
    padding: 12,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    fontSize: 15,
    backgroundColor: "#F9F9F9",
  },

  buttonContainer: {
    alignItems: "center",
    marginTop: 24,
  },

  addButton: {
    width: 217,
  },

  helperText: {
    marginTop: 4,
    fontSize: 12,
    color: "#666",
    fontStyle: "italic",
  },

  datePickerButton: {
    width: "100%",
    padding: 12,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    backgroundColor: "#F9F9F9",
    justifyContent: "center",
  },

  datePickerText: {
    fontSize: 15,
    color: "#333",
  },

  datePickerPlaceholder: {
    fontSize: 15,
    color: "#999",
  },

  successOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },

  successContainer: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },

  checkmarkCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },

  successText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },

  pickerContainer: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    backgroundColor: "#F9F9F9",
    overflow: "hidden",
  },

  picker: {
    width: "100%",
  },

  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },

  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
  },

  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },

  modalButton: {
    padding: 8,
  },

  modalButtonText: {
    fontSize: 17,
    color: '#007AFF',
    fontWeight: '600',
  },

  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
  },

  datePickerButtonText: {
    fontSize: 15,
    color: '#333',
  },

  userPickerButton: {
    width: "100%",
    padding: 12,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    backgroundColor: "#F9F9F9",
    justifyContent: "center",
  },

  userPickerButtonText: {
    fontSize: 15,
    color: "#333",
  },

  userPickerPlaceholder: {
    fontSize: 15,
    color: "#999",
  },

  userListContainer: {
    maxHeight: 300,
  },

  userOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },

  userOptionText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },

  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#007AFF',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },

  checkboxSelected: {
    backgroundColor: '#007AFF',
  },

  checkmarkText: {
    color: 'white',
    fontSize: 50,
    fontWeight: 'bold',
  },
});

export default function AddItemManual() {
  const [title, setTitle] = useState("");
  const [quantity, setQuantity] = useState("");
  const [expiryDate, setExpiryDate] = useState<Date>(new Date());
  const [tempExpiryDate, setTempExpiryDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showUserPicker, setShowUserPicker] = useState(false);
  const [sharedByUserIds, setSharedByUserIds] = useState<string[]>([]); // Array for multiple users
  const [users, setUsers] = useState<User[]>([]); // List of users
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showSuccess, setShowSuccess] = useState<boolean>(false);
  
  // TODO: Get this from your auth context when you implement login
  const currentUserId = "TEMP_USER_ID"; // This will be replaced with actual logged-in user
  
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Fetch users on component mount
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch(`${API_URL}/users/`);
      const data = await response.json();
      if (data.data) {
        setUsers(data.data);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const getUserDisplayName = (user: User) => {
    if (user.user_metadata?.first_name) {
      return `${user.user_metadata.first_name} ${user.user_metadata.last_name || ''}`.trim();
    }
    return user.email;
  };

  const handleAddItem = async () => {
    // Validation
    if (!title.trim()) {
      Alert.alert("Error", "Please enter an item name.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/fridge_items/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: title.trim(),
          quantity: quantity ? Number(quantity) : 1,
          expiry_date: expiryDate.toISOString().split('T')[0],
          added_by: currentUserId, // Automatic - logged in user
          shared_by: sharedByUserIds.length > 0 ? sharedByUserIds : null, // Array of user IDs or null
        }),
      });

      const data: ApiResponse = await response.json();

      if (response.ok && data.message) {
        // Show success animation
        setShowSuccess(true);
        
        // Animate checkmark
        Animated.parallel([
          Animated.spring(scaleAnim, {
            toValue: 1,
            tension: 50,
            friction: 3,
            useNativeDriver: true,
          }),
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start();

        // Reset everything after 1.5 seconds
        setTimeout(() => {
          // Reset animations
          scaleAnim.setValue(0);
          fadeAnim.setValue(0);
          setShowSuccess(false);
          
          // Clear form - back to normal
          setTitle("");
          setQuantity("");
          setExpiryDate(new Date());
          setSharedByUserIds([]);
        }, 1500);
      } else {
        Alert.alert("Error", data.detail || data.message || "Failed to add item.");
      }
    } catch (error) {
      console.error("Network request failed:", error);
      Alert.alert("Connection Error", "Could not connect to the server. Please check your internet connection.");
    } finally {
      setIsLoading(false);
    }
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
      if (selectedDate) {
        setExpiryDate(selectedDate);
      }
    } else {
      // iOS - update temp date as user scrolls
      if (selectedDate) {
        setTempExpiryDate(selectedDate);
      }
    }
  };

  const confirmDateSelection = () => {
    setExpiryDate(tempExpiryDate);
    setShowDatePicker(false);
  };

  const cancelDateSelection = () => {
    setTempExpiryDate(expiryDate);
    setShowDatePicker(false);
  };

  const confirmUserSelection = () => {
    setShowUserPicker(false);
  };

  const toggleUserSelection = (userId: string) => {
    setSharedByUserIds(prev => {
      if (prev.includes(userId)) {
        // Remove user if already selected
        return prev.filter(id => id !== userId);
      } else {
        // Add user if not selected
        return [...prev, userId];
      }
    });
  };

  const getSelectedUsersText = () => {
    if (sharedByUserIds.length === 0) return "Select who's sharing (optional)...";
    if (sharedByUserIds.length === 1) {
      const user = users.find(u => u.id === sharedByUserIds[0]);
      return user ? getUserDisplayName(user) : "1 person selected";
    }
    return `${sharedByUserIds.length} people selected`;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <CustomHeader title="Add Item 🍎" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.formContainer}>
          <View style={styles.form}>
            <Text style={styles.label}>
              Item Name <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Milk, Eggs, Chicken"
              value={title}
              onChangeText={setTitle}
              editable={!isLoading}
            />

            <Text style={styles.label}>Quantity</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., 2 (default: 1)"
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="numeric"
              editable={!isLoading}
            />

            <Text style={styles.label}>Expiry Date</Text>
            <TouchableOpacity
              style={styles.datePickerButton}
              onPress={() => {
                setTempExpiryDate(expiryDate);
                setShowDatePicker(true);
              }}
              disabled={isLoading}
            >
              <Text style={styles.datePickerButtonText}>
                {formatDate(expiryDate)}
              </Text>
            </TouchableOpacity>
            <Text style={styles.helperText}>
              Tap to select expiry date
            </Text>

            <Text style={styles.label}>Shared By</Text>
            <TouchableOpacity
              style={styles.userPickerButton}
              onPress={() => setShowUserPicker(true)}
              disabled={isLoading}
            >
              <Text style={sharedByUserIds.length > 0 ? styles.userPickerButtonText : styles.userPickerPlaceholder}>
                {getSelectedUsersText()}
              </Text>
            </TouchableOpacity>
            <Text style={styles.helperText}>
              Tap to select people who are sharing this item
            </Text>

            <View style={styles.buttonContainer}>
              <CustomButton
                title={isLoading ? "Adding..." : "Add Item"}
                onPress={handleAddItem}
                style={styles.addButton}
                className=""
                disabled={isLoading}
              />
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Date Picker Modal for iOS */}
      {showDatePicker && Platform.OS === 'ios' && (
        <Modal
          transparent={true}
          animationType="slide"
          visible={showDatePicker}
          onRequestClose={cancelDateSelection}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={cancelDateSelection} style={styles.modalButton}>
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Select Date</Text>
                <TouchableOpacity onPress={confirmDateSelection} style={styles.modalButton}>
                  <Text style={styles.modalButtonText}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={tempExpiryDate}
                mode="date"
                display="spinner"
                onChange={onDateChange}
                minimumDate={new Date()}
              />
            </View>
          </View>
        </Modal>
      )}

      {/* Android Date Picker */}
      {showDatePicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={expiryDate}
          mode="date"
          display="default"
          onChange={onDateChange}
          minimumDate={new Date()}
        />
      )}

      {/* User Picker Modal */}
      <Modal
        transparent={true}
        animationType="slide"
        visible={showUserPicker}
        onRequestClose={() => setShowUserPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity 
                onPress={() => {
                  setSharedByUserIds([]);
                  setShowUserPicker(false);
                }} 
                style={styles.modalButton}
              >
                <Text style={styles.modalButtonText}>Clear All</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Select Users</Text>
              <TouchableOpacity onPress={confirmUserSelection} style={styles.modalButton}>
                <Text style={styles.modalButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.userListContainer}>
              {users.map((user) => (
                <TouchableOpacity
                  key={user.id}
                  style={styles.userOption}
                  onPress={() => toggleUserSelection(user.id)}
                >
                  <View style={[
                    styles.checkbox,
                    sharedByUserIds.includes(user.id) && styles.checkboxSelected
                  ]}>
                    {sharedByUserIds.includes(user.id) && (
                      <Text style={styles.checkmarkText}>✓</Text>
                    )}
                  </View>
                  <Text style={styles.userOptionText}>
                    {getUserDisplayName(user)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Success Animation Overlay */}
      {showSuccess && (
        <View style={styles.successOverlay}>
          <Animated.View 
            style={[
              styles.successContainer,
              {
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            <View style={styles.checkmarkCircle}>
              <Text style={styles.checkmarkText}>✓</Text>
            </View>
            <Text style={styles.successText}>Item Added!</Text>
          </Animated.View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}