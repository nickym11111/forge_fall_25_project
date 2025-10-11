import React, { useState } from 'react';
import { StyleSheet, TextInput, View, Text, TouchableOpacity, ScrollView } from "react-native";
import { navigate } from "expo-router/build/global-state/routing";


const API_URL = "http://127.0.0.1:8000";

export default function CreateFridge() {
    const [fridgeName, setFridgeName] = useState("");
    const [emails, setEmails] = useState<string[]>([""]);

    const enterEmail = (text:string, index: number) => {
        const newEmails = [...emails];
        newEmails[index] = text;
        setEmails(newEmails);
    }

    const addEmailField = () => {
        setEmails([...emails, ""]);
    };

    const handleCreateFridge = () => {
        /* 
        console.log("Fridge Name:", fridgeName);
        console.log("Emails:", emails);
        alert("Fridge created! (Backend connection coming soon)");
        */
    };

    return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text style={styles.title}>Create a Fridge</Text>

        <Text style={styles.label}>Fridge Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter fridge name"
          placeholderTextColor="gray"
          value={fridgeName}
          onChangeText={setFridgeName}
        />

        <Text style={styles.label}>Invite Friends (Email)</Text>
        {emails.map((email, index) => (
          <TextInput
            key={index}
            style={styles.input}
            placeholder="friend@example.com"
            placeholderTextColor="gray"
            value={email}
            onChangeText={(text) => enterEmail(text, index)}
          />
        ))}

        <TouchableOpacity style={styles.addButton} onPress={addEmailField}>
          <Text style={styles.addButtonText}>+ Add Another Email</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.createButton} onPress={handleCreateFridge}>
          <Text style={styles.createButtonText}>Create Fridge</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
    marginTop: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    backgroundColor: "#fff",
  },
  addButton: {
    marginBottom: 20,
  },
  addButtonText: {
    color: "#007bff",
    fontWeight: "600",
  },
  createButton: {
    backgroundColor: "#28a745",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  createButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  link: {
    marginTop: 25,
    textAlign: "center",
    color: "#007bff",
    textDecorationLine: "underline",
  },
})