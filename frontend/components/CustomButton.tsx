import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StyleProp, ViewStyle } from 'react-native';

const CustomButton = (props: { title: string, onPress: () => void, style?: StyleProp<ViewStyle>, className: string, disabled?: boolean }) => {
  return (
<TouchableOpacity onPress={props.onPress} style={props.style} className={props.className} disabled={props.disabled}> 
  <View style={{
    ...styles.button, backgroundColor: props.disabled ? '#88d08a72' : '#3cca41ff'}}
  >
    <Text style={{ color: 'white' }}>{props.title}</Text>
  </View>
</TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
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