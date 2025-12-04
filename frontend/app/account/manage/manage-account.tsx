import { StyleSheet, View, Text, Image, TouchableOpacity, Platform, ActivityIndicator, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import CustomHeader from "@/components/CustomHeader";
import CustomButton from "@/components/CustomButton";
import ProfileIcon from "@/components/ProfileIcon";
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
        <Text style={styles.headerTitle}>Manage Account</Text>
      </View>
      <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
        <Ionicons name="close" size={28} color="#64748b" />
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
              <ActivityIndicator size="large" color="#14b8a6" />
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
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              setShowManageFridges(true);
            }}
          >
            <View style={styles.buttonContent}>
              <Ionicons name="restaurant-outline" size={22} color="#14b8a6" style={styles.buttonIcon} />
              <Text style={styles.actionButtonText}>Manage Kitchens</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              navigate("/account/reset-password");
            }}
          >
            <View style={styles.buttonContent}>
              <Ionicons name="lock-closed-outline" size={22} color="#14b8a6" style={styles.buttonIcon} />
              <Text style={styles.actionButtonText}>Reset Password</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.signOutButton}
            onPress={async () => {
              logout();
              setReload(!reload);
            }}
          >
            <Ionicons name="log-out-outline" size={22} color="#ef4444" style={styles.signOutIcon} />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
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
  content: {
    flex: 1,
    padding: 20,
    paddingTop: 24,
  },
  profileSection: {
    alignItems: "center",
    marginBottom: 30,
    backgroundColor: "white",
    borderRadius: 24,
    padding: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  profilePhotoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#f0fdfa",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    borderWidth: 4,
    borderColor: "#14b8a6",
  },
  profilePhoto: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  nameText: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 8,
  },
  emailText: {
    fontSize: 16,
    color: "#64748b",
    marginBottom: 20,
  },
  fridgeMatesContainer: {
    alignItems: "center",
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    width: "100%",
  },
  fridgeMatesLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748b",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  fridgeMatesText: {
    fontSize: 14,
    color: "#475569",
    textAlign: "center",
    lineHeight: 20,
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
    gap: 16,
  },
  actionButton: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "white",
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  buttonIcon: {
    marginRight: 12,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
  },
  signOutButton: {
    width: "100%",
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fef2f2",
    borderWidth: 1.5,
    borderColor: "#fecaca",
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  signOutIcon: {
    marginRight: 10,
  },
  signOutText: {
    color: "#ef4444",
    fontSize: 16,
    fontWeight: "600",
  },
});
