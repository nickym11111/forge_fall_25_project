import {
  StyleSheet,
  View,
  Text,
  Image,
  ImageSourcePropType,
  Platform,
  StatusBar,
} from "react-native";
import ProfileIcon from "./ProfileIcon";

type CustomHeaderProps = {
  title: string;
  logo?: ImageSourcePropType;
  subtitle?: string;
  noShadow?: boolean;
};

const CustomHeader = ({
  title,
  logo,
  subtitle,
  noShadow = false,
}: CustomHeaderProps) => {
  return (
    <View style={[styles.header, noShadow && styles.headerNoShadow]}>
      <StatusBar barStyle="light-content" backgroundColor="#14b8a6" />
      <View style={styles.content}>
        <View style={styles.titleRow}>
          {logo && <Image source={logo} style={styles.logo} />}
          <View style={styles.titleContainer}>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>{title}</Text>
              {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
            </View>
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
    display: "flex",
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
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
