import { StyleSheet, View, Text } from "react-native";

const CustomHeader = (props: {title: string}) => {

  return (
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{props.title}</Text>
      </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: "#4caf50",
    paddingTop: 20,
    paddingBottom: 20,
    alignItems: "center",
  },
  headerTitle: {
    color: "white",
    fontSize: 20,
    fontWeight: "bold",
}});

export default CustomHeader;