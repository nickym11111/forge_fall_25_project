import { StyleSheet, View, Text, Image, TouchableOpacity, Platform, ActivityIndicator, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import CustomHeader from "@/components/CustomHeader";
import CustomButton from "@/components/CustomButton";
import { useAuth } from "@/app/context/authContext";
import { navigate } from "expo-router/build/global-state/routing";
import { useEffect, useState } from "react";
import { fetchUserDetails, leaveFridge } from "@/app/api/UserDetails";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { uploadProfilePhotoDirectly } from "@/app/api/AddProfilePhotoDirectly";
import { supabase } from "@/app/utils/client";
import ManageFridgesScreen from "@/components/ManageFridges";

export default function ManageAccount() {
  type Fridge = {
    created_at: string;
    created_by: string;
    id: string;
    name: string;
  };

  const [userFirstName, setUserFirstName] = useState<string>("");
  const [userLastName, setUserLastName] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");
  const [fridges, setFridges] = useState<Fridge[]>([]);
  type FridgeMate = {
    first_name: string;
    last_name: string;
  };
  const [fridgeMates, setFridgeMates] = useState<FridgeMate[]>([]);
  const [reload, setReload] = useState<boolean>(false);
  const [showManageFridges, setShowManageFridges] = useState<boolean>(false);
  const [profileImageUri, setProfileImageUri] = useState<string>("");
  const [isPhotoloading, setisPhotoloading] = useState<boolean>(false);

  const { logout } = useAuth();

  const pickProfileImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: true,
      quality: 1,
      aspect: [1, 1],
    });

    if (!result.canceled) {
      setisPhotoloading(true);
      
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error || !session) {
        console.log("Error fetching session:", error);
        setisPhotoloading(false);
        return;
      }

      const imageUri = result.assets[0].uri;

      try {
        // Upload directly to Supabase Storage (no base64 conversion!)
        const result = await uploadProfilePhotoDirectly(imageUri, session.user.id);
        
        if (result.success) {
          console.log("Profile photo uploaded successfully:", result.url);
          setReload(!reload);
        } else {
          alert(`Upload failed: ${result.error}`);
        }
      } catch (error) {
        console.error("Error converting image to base64:", error);
      } finally {
        setisPhotoloading(false);
      }
    }
  };

  useEffect(() => {
    setisPhotoloading(true);
    fetchUserDetails().then((userData) => {
      if (userData) {
        console.log("Fetched user data:", userData);
        setUserFirstName(userData.first_name);
        setUserLastName(userData.last_name);
        setUserEmail(userData.email);
        setProfileImageUri(userData.profile_photo || "");
        const fridgeData = userData.fridge;
        setFridges(
          Array.isArray(fridgeData)
            ? fridgeData
            : fridgeData
            ? [fridgeData]
            : []
        );
        setisPhotoloading(false);
        const mates = userData.fridgeMates;
        setFridgeMates(Array.isArray(mates) ? mates : mates ? [mates] : []);
      } else {
        setUserFirstName("");
        setUserLastName("");
        setUserEmail("");
        setFridges([]);
        setFridgeMates([]);
      }
    });
  }, [reload]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Manage Account 🧾</Text>
      </View>
      <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
        <Ionicons name="close-circle" size={36} color="#333" />
      </TouchableOpacity>
      
      <View style={styles.content}>
        {/* Profile Section */}
        <View style={styles.profileSection}>
          <TouchableOpacity 
            style={styles.profilePhotoContainer}
            onPress={pickProfileImage}
            disabled={isPhotoloading}
          >
            {isPhotoloading ? (
              <ActivityIndicator size="large" color="#5D5FEF" />
            ) : profileImageUri ? (
              <Image
                source={{ uri: profileImageUri }}
                style={styles.profilePhoto}
                onError={() => {
                  console.log("Error loading profile photo, using default icon");
                  setProfileImageUri("");
                }}
              />
            ) : (
              <Image
                source={require("../../../assets/images/profile-icon.png")}
                style={styles.profilePhoto}
              />
            )}
          </TouchableOpacity>
          
          <Text style={styles.nameText}>
            {userFirstName} {userLastName}
          </Text>
          <Text style={styles.emailText}>{userEmail}</Text>
          
          {!showManageFridges && fridgeMates.length > 0 && (
            <View style={styles.fridgeMatesContainer}>
              <Text style={styles.fridgeMatesLabel}>Fridge Mates:</Text>
              <Text style={styles.fridgeMatesText}>
                {fridgeMates
                  .map((f) => `${f.first_name} ${f.last_name}`)
                  .join(", ")}
              </Text>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonSection}>
          <CustomButton
            className="Reset Password"
            onPress={() => {
              navigate("/account/reset-password");
            }}
            title="Reset Password"
            style={styles.actionButton}
          />
          
          <CustomButton
            className="Manage Fridges"
            onPress={() => {
              setShowManageFridges(true);
            }}
            title="Manage Fridges"
            style={styles.actionButton}
          />
          
          <CustomButton
            className="sign-out-button"
            onPress={async () => {
              logout();
              setReload(!reload);
            }}
            title="Sign Out"
            style={styles.signOutButton}
          />
        </View>
      </View>

      <Modal
        visible={showManageFridges}
        animationType="slide"
        onRequestClose={() => setShowManageFridges(false)}
      >
        <ManageFridgesScreen
          onClose={() => setShowManageFridges(false)}
        />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#333",
  },
  closeButton: {
    position: "absolute",
    right: 20,
    top: 80,
    zIndex: 1000,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  profileSection: {
    alignItems: "center",
    marginBottom: 30,
    backgroundColor: "white",
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profilePhotoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#E8EAFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 15,
    borderWidth: 3,
    borderColor: "#5D5FEF",
  },
  profilePhoto: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  nameText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 5,
  },
  emailText: {
    fontSize: 16,
    color: "#666",
    marginBottom: 15,
  },
  fridgeMatesContainer: {
    alignItems: "center",
    marginTop: 10,
  },
  fridgeMatesLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#555",
    marginBottom: 5,
  },
  fridgeMatesText: {
    fontSize: 14,
    color: "#777",
    textAlign: "center",
  },
  fridgesSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 15,
  },
  fridgeCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  fridgeName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 5,
  },
  fridgeId: {
    fontSize: 12,
    color: "#999",
    marginBottom: 10,
  },
  leaveFridgeButton: {
    width: "100%",
    marginTop: 5,
  },
  noFridgesText: {
    fontSize: 16,
    color: "#999",
    textAlign: "center",
    marginTop: 20,
  },
  buttonSection: {
    gap: 15,
  },
  actionButton: {
    width: "100%",
  },
  signOutButton: {
    width: "100%",
    marginTop: 10,
  },
});
