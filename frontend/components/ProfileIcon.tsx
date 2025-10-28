import { fetchUserDetails } from "@/app/api/UserDetails";
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

const ProfileIcon = (props: {
  style?: StyleProp<ViewStyle>;
  className: string;
}) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [userFirstName, setUserFirstName] = useState<string>("");
  const [userLastName, setUserLastName] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");
  const [reload, setReload] = useState<boolean>(false);
  const { logout } = useAuth();
  useEffect(() => {
    if (isModalVisible) {
      fetchUserDetails().then((userData) => {
        if (userData) {
          console.log("Fetched user data:", userData);
          setUserFirstName(userData.first_name);
          setUserLastName(userData.last_name);
          setUserEmail(userData.email);
        } else {
          setUserFirstName("");
          setUserLastName("");
          setUserEmail("");
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
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <View
            style={{
              backgroundColor: "gray",
              width: 300,
              height: 400,
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
            }}
          >
            <Text>Hello!</Text>
            <Text>First Name: {userFirstName}</Text>
            <Text>Last Name: {userLastName}</Text>
            <Text>Email: {userEmail}</Text>
            <Button
              onPress={async () => {
                logout();
                setReload(!reload);
              }}
              title="SignOut"
            />
          </View>
        </View>
      </Modal>
      <View
        style={{
          ...styles.button,
        }}
      >
        <Image
          source={require("../assets/images/profile-icon.svg")}
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
});

export default ProfileIcon;
