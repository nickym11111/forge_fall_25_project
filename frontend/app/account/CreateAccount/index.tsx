import { StyleSheet, TextInput, View, Text } from 'react-native';
import { useState } from 'react';
import CustomButton from '@/components/CustomButton';
import CustomHeader from '@/components/CustomHeader';
import { navigate } from 'expo-router/build/global-state/routing';
import { CreateAccountRequest } from '../../api/CreateAccount';
import ToastMessage from '@/components/ToastMessage';

export default function CreateAccount() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [dietaryRestrictionsText, setDietaryRestrictionsText] = useState('');
  const dietaryRestrictions = dietaryRestrictionsText.split(',').map(item => item.trim());


  return (
    <View style={styles.container}>
      <CustomHeader title="Fridge Flow 🏠"/>
      <View style={styles.createAccountContainer}>
        <ToastMessage message="Account Created Successfully!" />
        <View style={styles.createAccountForm}>
          <TextInput
            onChangeText={setFirstName}
            placeholder="First Name"
            value={firstName}
            style={styles.createAccountInput}
          />
          <TextInput
            onChangeText={setLastName}
            placeholder="Last Name"
            value={lastName}
            style={styles.createAccountInput}
          />
          <TextInput
            onChangeText={setEmail}
            placeholder="Email"
            value={email}
            style={styles.createAccountInput}
          />
          <TextInput
            onChangeText={setPassword}
            placeholder="Password"
            value={password}
            secureTextEntry
            style={styles.createAccountInput}
          />
          <TextInput
            onChangeText={setDietaryRestrictionsText}
            placeholder="Dietary Restrictions"
            value={dietaryRestrictionsText}
            style={styles.createAccountInput}
          />
          <CustomButton
            title="Create Account"
            onPress={() => {
              console.log("Create Account");
              CreateAccountRequest(email, password);
            }}
            disabled={!firstName|| !lastName || !email || !password}
            style={styles.createAccountButton}
            className=''
            />
          {
            dietaryRestrictions.map((restriction, index) => (
              <Text key={index}>{restriction}</Text>
            ))
          }
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FF",
  },
  createAccountContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 200,
  },
  createAccountForm: {
    alignItems: "center",
    width: 280,
  },
  createAccountInput: {
    width: "100%",
    marginVertical: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    fontSize: 15,
  },
  createAccountButton: {
    width: "100%",
  },
});
