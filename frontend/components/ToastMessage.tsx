import React, { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet } from 'react-native';

const ToastMessage = (props: { message: string, visible: boolean }) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (props.visible) {
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }).start();
        } else {
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 500,
                useNativeDriver: true,
            }).start();
        }
    }, [props.visible, fadeAnim]);

    return (
        <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
            <Text style={styles.text}>{props.message}</Text>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginLeft: "auto",
        display: "flex",
        top: 10,
        right: 0,
        width: 250,
        padding: 10,
        backgroundColor: "gray",
        borderRadius: 6,
    },
    text: {
        color: "black",
    },
});

export default ToastMessage;