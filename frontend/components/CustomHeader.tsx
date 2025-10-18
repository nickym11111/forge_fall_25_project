import { StyleSheet, View, Text, Image, ImageSourcePropType } from "react-native";

type CustomHeaderProps = {
  title: string;
  logo?: ImageSourcePropType;
}

const CustomHeader = ({ title, logo }: CustomHeaderProps) => {
  return (
    <View style={styles.header}>
      <View style={styles.row}>
        <Text style={styles.headerTitle}>{title}</Text>
        {logo && <Image source={logo} style={styles.logo} />}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: "#4caf50",
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
}});

export default CustomHeader;