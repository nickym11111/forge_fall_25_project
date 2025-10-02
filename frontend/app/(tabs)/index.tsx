import { Button, StyleSheet, TextInput } from 'react-native';

import CustomButton from '@/components/CustomButton';
import { Text, View } from '@/components/Themed';
import { useState } from 'react';
import "./page-one-style.css"

export default function TabOneScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  return (
    <View className='container'>
      <header className='header'>
       <Text className='header-title'>Fridge Flow 🏠</Text>
       </header>
       <div className='login-container'>
        <div className='login-form'>
      <TextInput
          onChangeText={setUsername}
          placeholder='Username'
          value={username}
          className='login-input'
        />
        <TextInput
          onChangeText={setPassword}
          placeholder='Password'
          value={password}
          className='login-input'
        />
        <CustomButton
        title="Press Me"
        onPress={() => {}}
        className='login-button'
      />
        <a className='create-account-button'>Create Account</a>
        </div>
        </div>
    </View>
  );
}
