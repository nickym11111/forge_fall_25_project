import { navigate } from "expo-router/build/global-state/routing";
import React from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  StyleProp,
  ViewStyle,
  Image,
} from "react-native";

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
});

export default ProfileIcon;
