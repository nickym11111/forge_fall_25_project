import {
  StyleSheet,
  View,
  Text,
  Image,
  ImageSourcePropType,
  Platform,
  StatusBar,
  ViewStyle,
} from "react-native";
import ProfileIcon from "./ProfileIcon";

type CustomHeaderProps = {
  title: string;
  logo?: ImageSourcePropType;
  subtitle?: string;
  noShadow?: boolean;
  style?: ViewStyle | ViewStyle[];
};

const CustomHeader = ({
  title,
  logo,
  subtitle,
  noShadow = false,
  style,
}: CustomHeaderProps) => {
  return (
    <View style={[styles.header, noShadow && styles.headerNoShadow, style]}>
      <StatusBar barStyle="light-content" backgroundColor="#14b8a6" />
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <View style={styles.titleContainer}>
            <View style={styles.titleWrapper}>
              <Text style={styles.headerTitle}>{title}</Text>
            </View>
            <View style={styles.profileIconContainer}>
              <ProfileIcon
                className="profile-icon"
                style={{
                  marginLeft: 0,
                }}
              />
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: "#14b8a6",
    paddingTop: Platform.OS === "ios" ? 50 : StatusBar.currentHeight || 20,
    paddingBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  headerNoShadow: {
    shadowColor: "transparent",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  content: {
    paddingHorizontal: 20,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  logo: {
    width: 32,
    height: 32,
    resizeMode: "contain",
  },
  titleContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  titleWrapper: {
    position: "absolute",
    width: "100%",
    alignItems: "center",
    zIndex: 1,
  },
  profileIconContainer: {
    zIndex: 2,
    marginLeft: "auto",
  },
  headerTitle: {
    color: "white",
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  subtitle: {
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: 14,
    marginTop: 4,
    fontWeight: "400",
  },
});

export default CustomHeader;
