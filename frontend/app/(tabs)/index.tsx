import { StyleSheet, Button, TouchableOpacity, FlatList, TextInput } from 'react-native';
import { type SetStateAction, type Dispatch } from 'react';

// Assuming these are accessible components
import EditScreenInfo from '@/components/EditScreenInfo'; 
import { Text, View } from '@/components/Themed';
import React, { useState, useRef } from 'react'; // Added useRef to imports
import type { PropsWithChildren } from 'react';

// --- Type Definitions ---

interface FridgeMate {
  first_name: string,
  last_name: string,
  email: string
}
// Defines the type for FoodItem
interface FoodItem {
  title: string;
  added_by: FridgeMate;
  shared_by: FridgeMate[],
  quantity: number,
  days_until_expiration: number;
}

// Sample Data
const DATA: FoodItem[] = [
  { title: "Apples", added_by: { first_name: "Jonathan", last_name: "Doe", email: "john.doe@example.com" }, shared_by: [{ first_name: "Jonathan", last_name: "Doe", email: "john.doe@example.com" }, { first_name: "Ploy", last_name: "Nat", email: "ploy.nat@example.com" }, { first_name: "John", last_name: "Doe", email: "john.doe@example.com" }], quantity: 1, days_until_expiration: 50 },
  { title: "Bananas", added_by: { first_name: "Jane", last_name: "Doe", email: "jane.doe@example.com" }, shared_by: [{ first_name: "Jonathan", last_name: "Doe", email: "john.doe@example.com" }, { first_name: "Ploy", last_name: "Nat", email: "ploy.nat@example.com" }], quantity: 1, days_until_expiration: 20 },
  { title: "Tomatoes", added_by: { first_name: "June", last_name: "Park", email: "june.park@example.com" }, shared_by: [{ first_name: "Jonathan", last_name: "Doe", email: "john.doe@example.com" }, { first_name: "Ploy", last_name: "Nat", email: "ploy.nat@example.com" }], quantity: 1, days_until_expiration: 1 },
  { title: "Milk", added_by: { first_name: "John", last_name: "Doe", email: "john.doe@example.com" }, shared_by: [{ first_name: "John", last_name: "Doe", email: "john.doe@example.com" }], quantity: 1, days_until_expiration: 7 },
  { title: "Cheddar Cheese", added_by: { first_name: "June", last_name: "Park", email: "june.park@example.com" }, shared_by: [{ first_name: "John", last_name: "Doe", email: "john.doe@example.com" }], quantity: 1, days_until_expiration: 35 },
  { title: "Lettuce (Romaine)", added_by: { first_name: "Jane", last_name: "Doe", email: "jane.doe@example.com" }, shared_by: [{ first_name: "Johnny", last_name: "Doe", email: "john.doe@example.com" }], quantity: 1, days_until_expiration: 3 },
  { title: "Eggs", added_by: { first_name: "Mahlet", last_name: "Lemma", email: "mahlet.lemma@example.com" }, shared_by: [{ first_name: "Johnny", last_name: "Doe", email: "john.doe@example.com" }, { first_name: "Ploy", last_name: "Nat", email: "ploy.nat@example.com" }], quantity: 1, days_until_expiration: 1 },
  { title: "Ground Beef", added_by: { first_name: "Bob", last_name: "Johnson", email: "bob.johnson@example.com" }, shared_by: [{ first_name: "John", last_name: "Doe", email: "john.doe@example.com" }, { first_name: "Ploy", last_name: "Nat", email: "ploy.nat@example.com" }], quantity: 1, days_until_expiration: 1 },
  { title: "Orange Juice", added_by: { first_name: "John", last_name: "Doe", email: "john.doe@example.com" }, shared_by: [{ first_name: "John", last_name: "Doe", email: "john.doe@example.com" }, { first_name: "Ploy", last_name: "Nat", email: "ploy.nat@example.com" }], quantity: 1, days_until_expiration: 10 },
  { title: "Yogurt", added_by: { first_name: "Ploy", last_name: "Nat", email: "ploy.nat@example.com" }, shared_by: [{ first_name: "John", last_name: "Doe", email: "john.doe@example.com" }, { first_name: "Ploy", last_name: "Nat", email: "ploy.nat@example.com" }], quantity: 1, days_until_expiration: 5 }
];

// Defines props type for the Item component
interface ItemProps {
  title: string;
  added_by: FridgeMate;
  shared_by: FridgeMate[],
  quantity: number;
  days_until_expiration: number;
}

//so that we can apply multiple filters
const temp_data = DATA;

// Individual item component
const Item = ({ title, added_by, shared_by, quantity, days_until_expiration }: ItemProps) => {

  // Split names by commas
  const sharedByString: string = shared_by
    .map(mate => `${mate.first_name} ${mate.last_name}`)
    .join(', ');

  return (
    <View style={styles.item}>
      <Text style={[styles.itemText]}><Text style={{ fontWeight: 'bold' }}>{title}</Text></Text>
      <Text style={[styles.itemText, { fontSize: 10 }]}>
        <Text style={{ fontWeight: 'bold' }}>Quantity:</Text> {quantity} | <Text style={{ fontWeight: 'bold' }}>Expires in</Text> {days_until_expiration} days | <Text style={{ fontWeight: 'bold' }}>Added by</Text> {added_by.first_name}
      </Text>
      <Text style={[styles.itemText, { fontSize: 10 }]}>
        <Text style={{ fontWeight: 'bold' }}>Shared by:</Text> {sharedByString}
      </Text>
    </View>
  );
};

export default function TabOneScreen() {
  const [text, onChangeText] = React.useState('');

  const [data, setData] = React.useState<FoodItem[]>(DATA);
  const [searchValue, setSearchValue] = React.useState<string>("");
  const originalHolder = React.useRef<FoodItem[]>(DATA);
  const [selectedFilters, setSelectedFilters] = useState<string[]>(['All Items']);

  const filterData = (data: FoodItem[], selectedFilters: string[]) => {
    // Current user
    const username = "John Doe";
    var temp_data = data;

    //if user presses 'expiring soon'
    if (selectedFilters.includes('Expiring Soon')) {
      temp_data = temp_data.filter(item => item.days_until_expiration <= 7);
      //if user presses 'my items'
    } if (selectedFilters.includes('My Items')) {
      temp_data = temp_data.filter(item =>
        item.shared_by && item.shared_by.length == 1 &&
        `${item.shared_by[0].first_name} ${item.shared_by[0].last_name}` === username);
      //if user presses 'shared'
    } if (selectedFilters.includes('Shared')) {
      temp_data = temp_data.filter(item =>
        item.shared_by && item.shared_by.length > 1 && item.shared_by.some(mate => {
          const mateFullName = `${mate.first_name} ${mate.last_name}`;
          return mateFullName === username;
        })
      );
    }
    // If user presses 'all items'
    return temp_data;
  };

  // Get the data array based on the selected filter
  const filtered_data = filterData(originalHolder.current, selectedFilters);


  // 2. Apply the search filter to the result of step 1
  const finalListData = filtered_data.filter((item) => {
    // If search bar is empty, show all items from the button filter
    if (!searchValue) return true;

    // Check if the item title includes the search text (case-insensitive)
    const itemData = item.title.toUpperCase();
    const textData = searchValue.toUpperCase();
    return itemData.includes(textData);
  });

  // 3. Simplified searchFunction: ONLY updates the search value state
  const searchFunction = (text: string) => {
    // We no longer call setData here; we only update the search term.
    setSearchValue(text);
  };
  return (
    <View style={styles.container}>
      <CustomHeader title="Fridge Flow 🏠"/>

      <View style={styles.loginContainer}>
        <View style={styles.loginForm}>
          <TextInput
            onChangeText={setEmail}
            placeholder="Username"
            value={email}
            style={styles.loginInput}
          />
          <TextInput
            onChangeText={setPassword}
            placeholder="Password"
            value={password}
            secureTextEntry
            style={styles.loginInput}
          />
          <CustomButton
            title="Login"
            onPress={() => {
              console.log("login");
            }}
            style={styles.loginButton}
            className=""
          />
          <Text
            style={styles.createAccountButton}
            onPress={() => {
              navigate("/account/CreateAccount");
            }}
          >
            Create Account
          </Text>
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
  loginContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 200,
  },
  loginForm: {
    alignItems: "center",
    width: 280,
  },
  loginInput: {
    width: "100%",
    marginVertical: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    fontSize: 15,
  },
  loginButton: {
    width: 217,
  },
  createAccountButton: {
    marginTop: 15,
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
});