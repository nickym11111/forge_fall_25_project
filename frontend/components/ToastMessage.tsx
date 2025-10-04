import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StyleProp, ViewStyle } from 'react-native';

const ToastMessage = (props: { message: string }) => {
    return (
        <View style={styles.container}>
            <Text style={styles.text}>{props.message}</Text>
        </View>
    ); 
};

const styles = StyleSheet.create({
    container: {
        padding: 10,
        backgroundColor: "black",
        borderRadius: 6,
    },
    text: {
        color: "white",
    },
});

export default ToastMessage;
