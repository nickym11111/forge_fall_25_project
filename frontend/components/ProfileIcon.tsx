import { fetchUserDetails, leaveFridge } from "@/app/api/UserDetails";
import { useAuth } from "@/app/context/authContext";
import { navigate } from "expo-router/build/global-state/routing";
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StyleProp,
  ViewStyle,
  Image,
  Modal,
  Button,
  Platform,
  ActivityIndicator,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import CustomButton from "./CustomButton";
import { uploadProfilePhotoDirectly } from "@/app/api/AddProfilePhotoDirectly";
import { supabase } from "@/app/utils/client";

const ProfileIcon = (props: {
  style?: StyleProp<ViewStyle>;
  className: string;
}) => {
  type Fridge = {
    created_at: string;
    created_by: string;
    id: string;
    name: string;
  };

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [userFirstName, setUserFirstName] = useState<string>("");
  const [userLastName, setUserLastName] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");
  const [fridges, setFridges] = useState<Fridge[]>([]);
  const [base64Profile, setBase64Profile] = useState<string>("");
  type FridgeMate = {
    first_name: string;
    last_name: string;
  };
  const [fridgeMates, setFridgeMates] = useState<FridgeMate[]>([]);
  const [reload, setReload] = useState<boolean>(false);
  const [userInfoVisible, setUserInfoVisible] = useState<boolean>(true);
  const [profileImageUri, setProfileImageUri] = useState<string | null>(null);
  const [isPhotoLoading, setIsPhotoLoading] = useState<boolean>(false);
  const [isDataLoading, setIsDataLoading] = useState<boolean>(false);

  const { logout } = useAuth();

  const pickProfileImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: true,
      quality: 1,
      aspect: [1, 1],
    });

    if (!result.canceled) {
      setIsPhotoLoading(true);
      
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error || !session) {
        console.log("Error fetching session:", error);
        setIsPhotoLoading(false);
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
        setIsPhotoLoading(false);
      }
    }
  };
  useEffect(() => {
    if (isModalVisible) {
      setIsDataLoading(true);
      fetchUserDetails().then((userData) => {
        if (userData) {
          console.log("Fetched user data:", userData);
          setUserFirstName(userData.first_name);
          setUserLastName(userData.last_name);
          setUserEmail(userData.email);
          setBase64Profile(userData.profile_photo || "");
          const fridgeData = userData.fridge;
          setFridges(
            Array.isArray(fridgeData)
              ? fridgeData
              : fridgeData
              ? [fridgeData]
              : []
          );
          const mates = userData.fridgeMates;
          setFridgeMates(Array.isArray(mates) ? mates : mates ? [mates] : []);
        } else {
          setUserFirstName("");
          setUserLastName("");
          setUserEmail("");
          setFridges([]);
          setFridgeMates([]);
        }
        setIsDataLoading(false);
      });
    }
  }, [isModalVisible, reload]);
  return (
    <TouchableOpacity
      onPress={() => {
        setIsModalVisible(!isModalVisible);
      }}
      style={[styles.buttonParent, props.style]}
      className={props.className}
    >
      <Modal
        animationType="slide"
        onRequestClose={() => {
          setIsModalVisible(false);
        }}
        transparent={true}
        visible={isModalVisible}
        style={{
          margin: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setIsModalVisible(false)}
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: "#FFF",
              width: 300,
              height: 400,
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 30,
              borderColor: "lightgray",
              borderWidth: 1,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
            }}
          >
            <View
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
              }}
            >
              {isDataLoading ? (
                <ActivityIndicator size="large" color="#5D5FEF" />
              ) : userInfoVisible ? (
                <>
                  <TouchableOpacity 
                    onPress={pickProfileImage}
                    disabled={isPhotoLoading}
                  >
                    {isPhotoLoading ? (
                      <View style={styles.profilePhoto}>
                        <ActivityIndicator size="large" color="#5D5FEF" />
                      </View>
                    ) : base64Profile ? (
                      <Image
                        source={{ uri: base64Profile }}
                        style={styles.profilePhoto}
                      />
                    ) : (
                      <Image
                        source={require("../assets/images/profile-icon.png")}
                        style={styles.profilePhoto}
                      />
                    )}
                  </TouchableOpacity>
                  <Text style={styles.profileText}>Hello {userFirstName}!</Text>
                  <Text style={styles.profileText}>
                    Full Name: {userFirstName} {userLastName}
                  </Text>
                  <Text style={styles.profileText}>
                    Fridge Mates:{" "}
                    {fridgeMates
                      .map((f) => `${f.first_name} ${f.last_name}`)
                      .join(", ")}
                  </Text>
                </>
              ) : (
                <>
                  {fridges.map((fridge) => (
                    <>
                      <Text style={styles.profileText}>
                        Fridge Name: {fridge.name}
                      </Text>
                      <Text style={styles.profileText}>{fridge.id}</Text>
                      <CustomButton
                        className="Leave Fridge"
                        onPress={() => {
                          leaveFridge(fridge.id).then(() => {
                            setReload(!reload);
                          });
                        }}
                        title="Leave Fridge"
                        style={{ width: 150, marginTop: 5 }}
                      />
                    </>
                  ))}
                </>
              )}
            </View>

            {false ? (
              <>
                {userInfoVisible ? (
                  <>
                    <CustomButton
                      className="sign-out-button"
                      onPress={async () => {
                        logout();
                        setReload(!reload);
                      }}
                      title="Sign Out"
                      style={{ width: 200 }}
                    />
                    <CustomButton
                      className="Reset Password"
                      onPress={() => {
                        navigate("/account/reset-password");
                        setIsModalVisible(false);
                      }}
                      title="Reset Password"
                      style={{ width: 200 }}
                    />
                  </>
                ) : null}

                <CustomButton
                  className="Manage Fridges"
                  onPress={async () => {
                    if (userInfoVisible) {
                      setUserInfoVisible(false);
                    } else {
                      setUserInfoVisible(true);
                    }
                    setReload(!reload);
                  }}
                  title="Manage Fridges"
                  style={{ width: 200 }}
                />
              </>
            ) : null}

            <CustomButton
              className="Manage Account"
              onPress={async () => {
                navigate("/account/manage");
                setIsModalVisible(false);
              }}
              title="Manage Account"
              style={{ width: 200 }}
            />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
      <View
        style={{
          ...styles.button,
        }}
      >
        <Image
          source={require("../assets/images/profile-icon.png")}
          style={styles.profileIcon}
        />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  buttonParent: {
    marginLeft: "auto",
    marginRight: 10,
    marginTop: 5,
  },
  button: {
    borderRadius: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  profileIcon: {
    width: 30,
    height: 30,
    marginBottom: 5,
  },
  profileText: {
    color: "gray",
  },
  profilePhoto: {
    width: 60,
    height: 60,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default ProfileIcon;
