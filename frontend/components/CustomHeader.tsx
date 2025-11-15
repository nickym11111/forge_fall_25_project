import { StyleSheet, View, Text, Image, ImageSourcePropType } from "react-native";

type CustomHeaderProps = {
  title: string;
  logo?: ImageSourcePropType;
  subtitle?: string;
}

const CustomHeader = ({ title, logo, subtitle }: CustomHeaderProps) => {
  return (
    <View style={styles.header}>
      <View style={styles.row}>
        <Text style={styles.headerTitle}>{title}</Text>
        {logo && <Image source={logo} style={styles.logo} />}
      </View>
      {subtitle && <Text style={styles.headerSubtitle}>{subtitle}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: "#14b8a6",
    paddingTop: 20,
    paddingBottom: 20,
    alignItems: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  logo: {
    width: 28,
    height: 28,
    marginRight: 8,
    resizeMode: "contain",
  },
  headerTitle: {
    color: "white",
    fontSize: 20,
    fontWeight: "bold",
  },
  headerSubtitle: {
    color: "white",
    fontSize: 14,
    marginTop: 4,
    opacity: 0.9,
  },
});

export default CustomHeader;