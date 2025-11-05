import { fetchUserDetails, leaveFridge } from "@/app/api/UserDetails";
import { useAuth } from "@/app/context/authContext";
import { supabase } from "@/app/utils/client";
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
} from "react-native";
import CustomButton from "./CustomButton";

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
  const [fridgeMates, setFridgeMates] = useState<string[]>([]);
  const [reload, setReload] = useState<boolean>(false);
  const [userInfoVisible, setUserInfoVisible] = useState<boolean>(true);

  const { logout } = useAuth();
  useEffect(() => {
    if (isModalVisible) {
      fetchUserDetails().then((userData) => {
        if (userData) {
          console.log("Fetched user data:", userData);
          setUserFirstName(userData.first_name);
          setUserLastName(userData.last_name);
          setUserEmail(userData.email);
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
              {userInfoVisible ? (
                <>
                  <Text style={styles.profileText}>Hello {userFirstName}!</Text>
                  <Text style={styles.profileText}>
                    Full Name: {userFirstName} {userLastName}
                  </Text>
                  <Text style={styles.profileText}>Email: {userEmail}</Text>
                  <Text style={styles.profileText}>
                    Fridges: {fridges.map((f) => f.name).join(", ")}
                  </Text>
                  <Text style={styles.profileText}>
                    Fridge Mates: {fridgeMates.join(", ")}
                  </Text>
                </>
              ) : (
                <>
                {
                  fridges.map((fridge) => (
                    <>
                      <Text style={styles.profileText}>
                        Fridge Name: {fridge.name}
                      </Text>
                      <Text style={styles.profileText}>
                        {fridge.id}
                      </Text>
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
                  ))
                }
                </>
              )}
            </View>
            {userInfoVisible ? (
              <CustomButton
                className="sign-out-button"
                onPress={async () => {
                  logout();
                  setReload(!reload);
                }}
                title="Sign Out"
                style={{ width: 200 }}
              />
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
              title="SignOut"
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
});

export default ProfileIcon;
