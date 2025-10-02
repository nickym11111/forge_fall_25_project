import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StyleProp, ViewStyle } from 'react-native';

const CustomButton = (props: { title: string, onPress: () => void, style?: StyleProp<ViewStyle>, className: string }) => {
  return (
<TouchableOpacity onPress={props.onPress} style={props.style} className={props.className}>
  <View style={{
    ...styles.button}}
  >
    <Text style={{ color: 'white' }}>{props.title}</Text>
  </View>
</TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#88D08B',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default CustomButton;