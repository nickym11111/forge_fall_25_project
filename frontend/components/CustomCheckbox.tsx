import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, View, Text, TouchableOpacity } from "react-native";




// --- Custom Checkbox Component ---
const CustomCheckbox = ({
  value,
  onToggle,
  checkedColor = "#14b8a6",
  uncheckedColor = "white",
  size = 24,
  borderRadius = 4,
}: {
  value: boolean;
  onToggle: () => void;
  checkedColor?: string;
  uncheckedColor?: string;
  size?: number;
  borderRadius?: number;
}) => (
  <TouchableOpacity
    onPress={onToggle}
    style={{
      width: size,
      height: size,
      borderWidth: 2,
      borderColor: value ? checkedColor : "black",
      borderRadius,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: value ? checkedColor : uncheckedColor,
    }}
  >
    {value && <Ionicons name="checkmark" size={size * 0.7} color="white" />}
  </TouchableOpacity>
);

export default CustomCheckbox;