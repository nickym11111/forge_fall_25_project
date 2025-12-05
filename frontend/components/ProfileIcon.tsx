import { navigate } from "expo-router/build/global-state/routing";
import React from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const ProfileIcon = (props: {
  style?: StyleProp<ViewStyle>;
  className: string;
}) => {
  return (
    <TouchableOpacity
      onPress={() => {
        navigate("/account/manage/manage-account");
      }}
      style={[styles.buttonParent, props.style]}
      className={props.className}
    >
      <View
        style={{
          ...styles.button,
        }}
      >
        <Ionicons
          name="person-circle-outline"
          size={32}
          color="#1e293b"
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
    marginBottom: 5,
  },
});

export default ProfileIcon;
