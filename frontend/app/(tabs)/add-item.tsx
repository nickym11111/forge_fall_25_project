import { StyleSheet, TextInput, View, Text, Alert, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity, Modal, ActivityIndicator } from "react-native";
import { useState, useEffect } from "react";
import DateTimePicker from '@react-native-community/datetimepicker';
import CustomButton from "@/components/CustomButton";
import CustomHeader from "@/components/CustomHeader";
import { supabase } from "../utils/client";
import { useAuth } from "../context/authContext";
import { AddItemToFridge, PredictExpiryDate } from "../api/AddItemToFridge";

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

const API_URL = `${process.env.EXPO_PUBLIC_API_URL}`;

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

  aiSuggestionBadge: {
    backgroundColor: "#E8F5E9",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 4,
    alignSelf: "flex-start",
  },

  aiSuggestionText: {
    fontSize: 11,
    color: "#2E7D32",
    fontWeight: "600",
  },

  loadingIndicator: {
    marginTop: 4,
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
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  popupBox: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 16,
    width: '85%',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },

  pickerWrapper: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },

  datePickerIOS: {
    alignSelf: 'center',
    width: '100%',
    transform: [{ scale: 0.95 }],
  },
  
});

export default function AddItemManual() {
  const [title, setTitle] = useState("");
  const [quantity, setQuantity] = useState("");
  const [expiryDate, setExpiryDate] = useState<Date>(new Date());
  const [tempExpiryDate, setTempExpiryDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showUserPicker, setShowUserPicker] = useState(false);
  const [sharedByUserIds, setSharedByUserIds] = useState<string[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLoadingAI, setIsLoadingAI] = useState<boolean>(false);
  const [aiSuggested, setAiSuggested] = useState<boolean>(false);
  
  const currentUserId = "TEMP_USER_ID";

  useEffect(() => {
    fetchUsers();
  }, []);

  // AI Expiry Date Prediction
  useEffect(() => {
    if (!title.trim()) {
      setAiSuggested(false);
      return;
    }

    const timeoutId = setTimeout(() => {
      getAIExpiryPrediction(title.trim());
    }, 2000); // Debounce for 2000ms

    return () => clearTimeout(timeoutId);
  }, [title]);

  const getAIExpiryPrediction = async (itemName: string) => {
    console.log("🤖 Starting AI prediction for:", itemName);
    setIsLoadingAI(true);
    setAiSuggested(false);

    // Fallback shelf life database for common items
    const commonShelfLife: { [key: string]: number } = {
      'milk': 7, 'eggs': 35, 'cheese': 21, 'yogurt': 14, 'butter': 90,
      'chicken': 2, 'beef': 5, 'pork': 5, 'fish': 2, 'lettuce': 7,
      'broccoli': 7, 'carrots': 21, 'apples': 30, 'strawberries': 7,
      'bananas': 5, 'bread': 7, 'tomatoes': 7, 'potatoes': 30, 'onions': 30,
      'orange': 14, 'lemon': 21, 'cucumber': 7, 'spinach': 5, 'mushrooms': 7,
      'bacon': 7, 'ham': 7, 'turkey': 2, 'salmon': 2, 'shrimp': 2,
    };

    try {
      // First try the backend API
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
      const response = await PredictExpiryDate(itemName);

      clearTimeout(timeoutId);
      console.log("📥 Response status:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("📦 Response data:", data);

        if (data.days) {
          const days = parseInt(data.days);
          console.log("✅ AI predicted", days, "days for", itemName);
          const newExpiryDate = new Date();
          newExpiryDate.setDate(newExpiryDate.getDate() + days);
          setExpiryDate(newExpiryDate);
          setTempExpiryDate(newExpiryDate);
          setAiSuggested(true);
          setIsLoadingAI(false);
          return; // Exit early on success
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log("⏱️ Backend API timeout, using fallback");
      } else {
        console.error("❌ Backend API failed, trying fallback:", error);
      }
    }

    // Fallback to local database
    const normalizedName = itemName.toLowerCase().trim();
    let days = 7; // default

    // Check exact match
    if (commonShelfLife[normalizedName]) {
      days = commonShelfLife[normalizedName];
      console.log("✅ Found exact match:", days, "days");
    } else {
      // Check partial matches
      for (const [food, foodDays] of Object.entries(commonShelfLife)) {
        if (normalizedName.includes(food) || food.includes(normalizedName)) {
          days = foodDays;
          console.log("✅ Found partial match:", food, "->", days, "days");
          break;
        }
      }
    }

    const newExpiryDate = new Date();
    newExpiryDate.setDate(newExpiryDate.getDate() + days);
    setExpiryDate(newExpiryDate);
    setTempExpiryDate(newExpiryDate);
    setAiSuggested(true);
    setIsLoadingAI(false); // Make sure to clear loading state
    console.log("✅ Using fallback prediction:", days, "days");
    console.log("🏁 AI prediction finished");
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch(`${API_URL}/users/`);
      const data = await response.json();
      if (data.data && data.data.length > 0) {
        setUsers(data.data);
      } else {
        setUsers([
          {
            id: "1",
            user_metadata: { first_name: "Alice", last_name: "Johnson" },
            email: "alice@example.com"
          },
          {
            id: "2",
            user_metadata: { first_name: "Bob", last_name: "Smith" },
            email: "bob@example.com",
          },
          {
            id: "3",
            user_metadata: { first_name: "Charlie", last_name: "Brown" },
            email: "charlie@example.com"
          },
          {
            id: "4",
            user_metadata: { first_name: "Diana", last_name: "Lee" },
            email: "diana@example.com",
          }
        ]);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      setUsers([
        {
          id: "1",
          email: "alice@example.com",
          user_metadata: { first_name: "Alice", last_name: "Johnson" }
        },
        {
          id: "2",
          email: "bob@example.com",
          user_metadata: { first_name: "Bob", last_name: "Smith" }
        },
        {
          id: "3",
          email: "charlie@example.com",
          user_metadata: { first_name: "Charlie", last_name: "Brown" }
        },
        {
          id: "4",
          email: "diana@example.com",
          user_metadata: { first_name: "Diana", last_name: "Lee" }
        }
      ]);
    }
  };

  const getUserDisplayName = (user: User) => {
    if (user.user_metadata?.first_name) {
      return `${user.user_metadata.first_name} ${user.user_metadata.last_name || ''}`.trim();
    }
    return user.email;
  };

  const handleAddItem = async () => {
    if (!title.trim()) {
      Alert.alert("Error", "Please enter an item name.");
      return;
    }

    console.log("Starting to add item");
    setIsLoading(true);
    const { data: { session }, error } = await supabase.auth.getSession();

    const sharedByUsers = sharedByUserIds.map(userId => {
      const user = users.find(u => u.id === userId);
      if (user) {
        return {
          first_name: user.user_metadata?.first_name || "",
          last_name: user.user_metadata?.last_name || "",
          email: user.email
        };
      }
      return null;
    }).filter(u => u !== null);

    try {
      console.log("Sending to:", `${API_URL}/fridge_items/`);
      console.log("Data:", {
        title: title.trim(),
        quantity: quantity ? Number(quantity) : 1,
        expiry_date: expiryDate.toISOString().split('T')[0],
        added_by: currentUserId,
        shared_by: sharedByUsers.length > 0 ? sharedByUsers : null,
      });

      if (error || !session) {
        Alert.alert("Error", "You must be logged in to add items");
        setIsLoading(false);
        return;
      }

      const response = await AddItemToFridge(
        session.access_token,
        title,
        quantity,
        expiryDate,
        currentUserId,
        sharedByUserIds
      );

      const data: ApiResponse = await response.json();
      console.log("Response status:", response.status);
      console.log("Response data:", data);

      if (response.ok) {
        Alert.alert("Success!", "Item added to fridge!");
        
        setTitle("");
        setQuantity("");
        setExpiryDate(new Date());
        setSharedByUserIds([]);
        setAiSuggested(false);
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
        setAiSuggested(false); // User manually changed it
      }
    } else {
      if (selectedDate) {
        setTempExpiryDate(selectedDate);
      }
    }
  };

  const confirmDateSelection = () => {
    setExpiryDate(tempExpiryDate);
    setShowDatePicker(false);
    setAiSuggested(false); // User manually changed it
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
        return prev.filter(id => id !== userId);
      } else {
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
            
            {isLoadingAI && (
              <View style={styles.loadingIndicator}>
                <ActivityIndicator size="small" color="#4CAF50" />
              </View>
            )}
            
            {aiSuggested && !isLoadingAI && (
              <View style={styles.aiSuggestionBadge}>
                <Text style={styles.aiSuggestionText}>✨ AI Suggested</Text>
              </View>
            )}
            
            <Text style={styles.helperText}>
              {aiSuggested ? "AI predicted this expiry date - tap to adjust if needed" : "Tap to select expiry date"}
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

      {showDatePicker && Platform.OS === 'ios' && (
        <Modal
          transparent={true}
          animationType="fade"
          visible={showDatePicker}
          onRequestClose={cancelDateSelection}
        >
          <View style={styles.modalContainer}>
            <View style={styles.popupBox}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={cancelDateSelection} style={styles.modalButton}>
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Select Date</Text>
                <TouchableOpacity onPress={confirmDateSelection} style={styles.modalButton}>
                  <Text style={styles.modalButtonText}>Done</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.pickerWrapper}>
                <DateTimePicker
                  value={tempExpiryDate}
                  mode="date"
                  display="inline"
                  onChange={onDateChange}
                  minimumDate={new Date()}
                  style={styles.datePickerIOS}
                />
              </View>
            </View>
          </View>
        </Modal>
      )}

      {showDatePicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={expiryDate}
          mode="date"
          display="default"
          onChange={onDateChange}
          minimumDate={new Date()}
        />
      )}

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
    </KeyboardAvoidingView>
  );
}