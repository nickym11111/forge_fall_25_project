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
import CustomHeader from "@/components/CustomHeader";

// Defines props type for the Item component
interface ItemProps {
  title: string;
}

// Recipe items component (potential issue)
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
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/find_ingredients`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ recipe: inputValue }), // Send data as JSON
      });

      if (!response.ok) {
        throw new Error('Failed to fetch ingredients');
      }

      const data = await response.json();
      console.log('Received response from backend:', data);
      const rawText = data.output[0].content[0].text;
      const jsonString = rawText.replace(/^Response:\s*/, '');
      let ingredients: string[] = [];
      try {
        const parsed = JSON.parse(jsonString);
        ingredients = parsed.ingredients;
      } catch (error) {
        console.error("Failed to parse JSON:", error);
        ingredients = ['Error parsing response'];
      }
      setResponseMessage(ingredients);
    } catch (error) {
      console.error('Error sending data:', error);
      setResponseMessage(['Error sending data to backend.']);
    }
  };

  const handleFindRecipe = async () => {
    try {
        const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/generate-recipes/`);
        const data2 = await response.json();

          // DEBUG: Log the entire response
          console.log('=== FULL RESPONSE ===');
          console.log(JSON.stringify(data2, null, 2));
          console.log('=== END RESPONSE ===');
          
        if (!response.ok) {
            throw new Error(data2.detail || "Failed to fetch recipes.");
        }

        // Handle different response types from backend
        if (data2.status === "success") {
          if (Array.isArray(data2.recipes)) {
            setRecipes(data2.recipes);
          } else if (data2.recipes && data2.recipes.message) {
            // Handle "Need more ingredients" case
            setRecipes([{ recipe_name: data2.recipes.message }]);
          }
        } else if (data2.status === "info") {
          // Handle "No items in fridge" case
          setRecipes([{ recipe_name: data2.message }]);
        } else {
          // Fallback
          setRecipes([{ message: "No recipes found" }]);
        }
      
      } catch (error) {
        console.error('Error fetching recipes:', error);
        setRecipes([{ message: 'Error sending data to backend.' }]);
      }
    };

 // Updated Item component to handle both string and object
  const RecipeItem = ({ item }: { item: any }) => {
  // Handle recipe objects
  if (item.recipe_name) {
    return (
      <View style={styles.item}>
        <Text style={styles.recipeTitle}>{item.recipe_name}</Text>
        {item.description && (
          <Text style={styles.recipeDescription}>{item.description}</Text>
        )}
        {item.ingredients_used && Array.isArray(item.ingredients_used) && (
          <Text style={styles.recipeIngredients}>
            Ingredients: {item.ingredients_used.join(', ')}
          </Text>
        )}
      </View>
    );
  }
  // Fallback for any other format
  return (
    <View style={styles.item}>
      <Text style={styles.itemText}>{String(item)}</Text>
    </View>
  );
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
    <CustomHeader 
      title="Share Recipes!  "
      logo={require('../../assets/images/FridgeIcon.png')}
      />
      <View style={styles.separator}>
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
          />

          <FlatList
            data={responseMessage}
            renderItem={({ item }) => <Item title={item} />}
            keyExtractor={(item, index) => index.toString()}
          />
        </View>
        
        <View style={styles.separator2}>
          <View style={styles.boxContainer}>
            <PreviewLayout
              values={["Find Recipe"]}
              selectedValue={selectedPrompt}
              setSelectedValue={setSelectedPrompt}
              onPress={handleFindRecipe}
            />
            <FlatList
              data={recipes}
              renderItem={({ item }) => <RecipeItem item={item} />}
              keyExtractor={(item, index) => index.toString()}
            />
          </View>
        </View>
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
    backgroundColor: "#F8F9FF",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    padding: 20,
  },
  separator: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 40,
    marginVertical: 20,
    backgroundColor: "#F8F9FF",
  },
  separator2: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 20,
    marginVertical: 20,
    backgroundColor: "#F8F9FF"
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
