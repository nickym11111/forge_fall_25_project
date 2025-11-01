import {
  StyleSheet,
  Button,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { type SetStateAction, type Dispatch } from "react";
import axios from 'axios';

import EditScreenInfo from "@/components/EditScreenInfo";
import { Text, View } from "@/components/Themed";
import React, { useState, useRef, useEffect } from "react";
import type { PropsWithChildren } from "react";

// Defines props type for the Item component
interface ItemProps {
  title: string;
}

// Recipe items component
const RecipeItem = ({ item }: { item: any }) => {
  // Handles cases where the backend sends an error or a message like "Need more ingredients"
  if (!item.recipe_name) {
      return (
          <View style={styles.item}>
              <Text style={styles.itemText}>{item.message || "Could not generate recipes. Check fridge contents."}</Text>
          </View>
      );
  }
  return (
    <View style={styles.item}>
      <Text style={styles.recipeTitle}>{item.recipe_name}</Text>
      <Text style={styles.recipeDescription}>{item.description}</Text>
      <Text style={styles.recipeIngredients}>
        Ingredients: {Array.isArray(item.ingredients_used) ? item.ingredients_used.join(", ") : 'N/A'}
      </Text>
    </View>
  );
};

// Individual item component
const Item = ({
  title
}: ItemProps) => {

  return (
    <View style={styles.item}>
      <Text style={[styles.itemText]}>
        <Text style={{ fontWeight: "bold" }}>{title}</Text>
      </Text>
    </View>
  );
};

export default function recipes() {
  const [inputValue, setInputValue] = useState<string>('');
  const [responseMessage, setResponseMessage] = useState<string[]>();
  const [selectedPrompt, setSelectedPrompt] = useState<string>('');

  const [recipes, setRecipes] = useState<any[]>([]);

   const searchFunction = (text: string) => {
    setInputValue(text);
  };

  const handleSubmit = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/find_ingredients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: inputValue }), // Send data as JSON
      });
      const data = await response.json();
      setResponseMessage(data.message);
    } catch (error) {
      console.error('Error sending data:', error);
      setResponseMessage(['Error sending data to backend.']);
    }
  };

  const handleFindRecipe = async () => {

    try {
        const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/recipes/generate-recipes/`);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || "Failed to fetch recipes.");
        }
        
        // Sets the state with either the list of recipes or the message from the backend
        setRecipes(data.recipes || [{ message: data.detail }]);

    } catch (error) {
        console.error('Error fetching recipes:', error);
        setRecipes([{ message: String(error) }]);
    }
  };
  
  type PreviewLayoutProps = PropsWithChildren<{
  values: string[];
  selectedValue: string;
  setSelectedValue: Dispatch<SetStateAction<string>>;
  onPress: () => void; 
}>;

const PreviewLayout = ({
  values,
  selectedValue,
  setSelectedValue,
  onPress,
}: PreviewLayoutProps) => (
  <View style={{ padding: 10 }}>
    <View style={styles.row}>
      {values.map((value) => (
        <TouchableOpacity
          key={value}
          onPress={onPress}
          style={[
            styles.filter_button,
            selectedValue.includes(value) && styles.selected_filter_button,
          ]}
        >
          <Text
            style={[
              styles.buttonLabel,
              selectedValue.includes(value) &&
                styles.selected_filter_button &&
                styles.selectedLabel,
            ]}
          >
            {value}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  </View>
);

return (
    <View style={styles.container}>
      
      <Text style={styles.title}>Share Recipes!</Text>
      <View
        style={styles.separator}
        lightColor="#eee"
        darkColor="rgba(255,255,255,0.1)"
      />
      <View style={styles.boxContainer}>
      <View>
        <TextInput
          style={styles.search_bar}
          onChangeText={searchFunction}
          value={inputValue}
          placeholder="Recipe Item..."
          
        />
      </View>
    
      <PreviewLayout
        values={["Find Ingredients"]}
        selectedValue={selectedPrompt}
        setSelectedValue={setSelectedPrompt}
        onPress={handleSubmit}
      ></PreviewLayout>
      <Text>Response: {responseMessage}</Text>

      <FlatList
        data={responseMessage}
        renderItem={({ item }) => (
          <Item
            title={item}
          />
        )}
        keyExtractor={(item) => item}
      />
      </View>
      <View
        style={styles.separator2}
        lightColor="#eee"
        darkColor="rgba(255,255,255,0.1)"
      />
      <View style={styles.boxContainer}>
      <PreviewLayout
        values={["Find Recipe"]}
        selectedValue={selectedPrompt}
        setSelectedValue={setSelectedPrompt}
        onPress={handleFindRecipe}
      ></PreviewLayout>

        <FlatList
        data={recipes}
        renderItem={({ item }) => (
          <RecipeItem 
            item={item} />
        )}

        keyExtractor={(item, index) => `recipe-${index}`}
      />
      </View>
    </View>
  );
};


const styles = StyleSheet.create({
  box: {
    width: 50,
    height: 50,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  filter_button: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 4,
    backgroundColor: "purple",
    alignSelf: "flex-start",
    marginHorizontal: "1%",
    marginBottom: 6,
    minWidth: "48%",
    textAlign: "center",
  },
  selected_filter_button: {
    backgroundColor: "grey",
    borderWidth: 0,
  },
  buttonLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "white",
  },
  selectedLabel: {
    color: "white",
  },
  label: {
    textAlign: "center",
    marginBottom: 10,
    fontSize: 24,
  },
  container: {
    flex: 1,
    alignItems: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    padding: 20,
  },
  separator: {
    marginVertical: 20,
    height: 1,
    width: "80%",
    backgroundColor: "#F8F9FF",
  },
  separator2: {
    marginVertical: 20,
    height: 1,
    width: "80%",
    backgroundColor: "#F8F9FF",
  },
  item: {
    backgroundColor: "#f0f0f0",
    padding: 15,
    marginVertical: 5,
    marginHorizontal: 16,
    borderRadius: 8,
    width: 350,
  },
  itemText: {
    fontSize: 18,
    color: "#333",
  },
  search_bar: {
    height: 40,
    margin: 12,
    borderWidth: 1,
    padding: 10,
    width: 350,
  },
  redText: {
    color: "#d32f2f",
    fontWeight: "bold",
  },
  recipeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  recipeDescription: {
    fontSize: 14,
    color: '#666',
    marginVertical: 4,
  },
  recipeIngredients: {
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
  },
  boxContainer: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "white",
    borderRadius: 12,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  }
});
