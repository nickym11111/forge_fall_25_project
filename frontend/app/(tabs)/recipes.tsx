import {
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  ScrollView, 
} from "react-native";
import { type SetStateAction, type Dispatch } from "react";
import Ionicons from '@expo/vector-icons/Ionicons';
import { Text, View } from "@/components/Themed";
import React, { useState, useRef, useEffect } from "react";
import type { PropsWithChildren } from "react";
import CustomHeader from "@/components/CustomHeader";
import CustomButton from "@/components/CustomButton";
import ProfileIcon from "@/components/ProfileIcon";
import { useAuth } from "../context/authContext";

interface ItemProps {
  title: string;
}

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
  const [selectedIngredientsPrompt, setSelectedIngredientsPrompt] = useState<string>('');
  const [selectedRecipePrompt, setSelectedRecipePrompt] = useState<string>('');
  const [isLoading1, setIsLoading1] = useState<boolean>(false);
  const [isLoading2, setIsLoading2] = useState<boolean>(false);
  const [recipes, setRecipes] = useState<any[]>([]);
  const { user } = useAuth();

  const currentUserId = user?.id || '';
  const currentFridgeId = user?.fridge_id || '';

  const searchFunction = (text: string) => {
    setInputValue(text);
  };

  const handleSubmit = async () => {
    setIsLoading1(true);
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/find_ingredients`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ recipe: inputValue }), 
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
    setIsLoading1(false);
  };

  const handleFindRecipe = async () => {
    setIsLoading2(true);
    try {
        const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/generate-recipes/`);
        const data2 = await response.json();
        console.log('=== FULL RESPONSE ===');
        console.log(JSON.stringify(data2, null, 2));
        console.log('=== END RESPONSE ===');
      
        if (!response.ok) {
            throw new Error(data2.detail || "Failed to fetch recipes.");
        }
        if (data2.status === "success") {
          if (Array.isArray(data2.recipes)) {
            setRecipes(data2.recipes);
          } else if (data2.recipes && data2.recipes.message) {
            setRecipes([{ recipe_name: data2.recipes.message }]);
          }
        } else if (data2.status === "info") {
          setRecipes([{ recipe_name: data2.message }]);
        } else {
          setRecipes([{ message: "No recipes found" }]);
        }
      
      } catch (error) {
        console.error('Error fetching recipes:', error);
        setRecipes([{ message: 'Error sending data to backend.' }]);
      }
      setIsLoading2(false);
    };

const RecipeItem = ({ 
    item, 
    currentUserId,
    currentFridgeId
}: { 
    item: any, 
    currentUserId: string, 
    currentFridgeId: string,
    currentUserName: string
}) => { 
    const [isFavorite, setIsFavorite] = useState(false);

    const handleHeartPress = async () => {
        const newState = !isFavorite;
        setIsFavorite(newState);
        console.log(`Attempting to set '${item.recipe_name}' favorite status to: ${newState}`);
        const dataToSend = {
            recipe: {
                name: item.recipe_name,
                added_by: currentUserId,
            },
            user: {
                id: currentUserId,
                fridge_id: currentFridgeId,
            }
        };
        
        try {
            if (newState) {
                const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/favorite-recipes/add-favorite-recipe/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(dataToSend),
                });

                if (!response.ok) {
                    setIsFavorite(false);
                    throw new Error('Failed to add recipe to favorites.');
                }
                const result = await response.json();
                console.log("Favorite added successfully:", result);

            } else {
                console.warn("Unfavoriting needs the unique DB record ID. Skipping DELETE API call.");
            }
        } catch (error) {
            console.error('Error in API call:', error);
            setIsFavorite(!newState); 
            alert(`Could not ${newState ? 'add' : 'remove'} favorite. Please check your connection.`);
        }
    };

    if (item.recipe_name) {
        return (
            <View style={styles.itemContainer}> 
                <View style={{ flex: 1, backgroundColor: 'transparent' }}>
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
                
                <TouchableOpacity 
                    onPress={handleHeartPress}
                    style={styles.heartButton}
                >
                    <Ionicons 
                        name={isFavorite ? "heart" : "heart-outline"} 
                        size={28} 
                        color={isFavorite ? "#E91E63" : "#888"} 
                    />
                </TouchableOpacity>
            </View>
        );
    }
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
      title="             Share Recipes!  "
      />
      <ProfileIcon className="profileIcon" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.contentSection}>
          <View style={styles.boxContainer}>
            <View>
              <Text>Generate a list of ingredients for a certain recipe!</Text>
              <Text></Text>
              <Text>NOTE: the list only shows what you don't already have</Text>
              <TextInput
                style={styles.search_bar}
                onChangeText={searchFunction}
                value={inputValue}
                placeholder="Enter a Dish..."
              />
            </View>
            <CustomButton
              title= {isLoading1 ? "Getting Ingredients..." : "Get Ingredients"}
              onPress={handleSubmit}
              className=""
              disabled={isLoading1}
            />
            <FlatList
              data={responseMessage}
              renderItem={({ item }) => <Item title={item} />}
              keyExtractor={(item, index) => index.toString()}
              scrollEnabled={false} 
            />
          </View>
        </View>
        <View style={styles.contentSection}>
          <View style={styles.boxContainer}>
            <Text>Generate recipes you can make based on your current food inventory!</Text>
            <Text></Text>
            <CustomButton
              title={isLoading2 ? "Getting Recipes..." : "Get Recipes"}
              onPress={handleFindRecipe}
              className=""
              disabled={isLoading2}
            />
            <FlatList
              data={recipes}
              renderItem={({ item }) => (
                <RecipeItem 
                  item={item} 
                  currentUserId={currentUserId} 
                  currentFridgeId={currentFridgeId}
                  currentUserName={user?.email || 'User'}
                />
              )} 
              keyExtractor={(item, index) => item.recipe_name || index.toString()}
              scrollEnabled={false}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  item: {
    backgroundColor: "#f0f0f0",
    padding: 15,
    marginVertical: 5,
    marginHorizontal: 0,
    borderRadius: 8,
    width: "100%",
  },
  
  itemContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between', 
    alignItems: 'center', 
    backgroundColor: "#f0f0f0",
    padding: 15,
    marginVertical: 5,
    marginHorizontal: 0,
    borderRadius: 8,
    width: "100%", 
  },
  
  heartButton: {
    paddingLeft: 10,
  },
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
    flex: 1, // Full screen height
    backgroundColor: "#F8F9FF",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20, 
    paddingBottom: 40,
    alignItems: 'center', 
  },
  contentSection: {
    width: '100%', 
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    padding: 20,
  },
  itemText: {
    fontSize: 18,
    color: "#333",
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
  search_bar: {
    height: 40,
    marginVertical: 12,
    marginHorizontal: 0,
    borderWidth: 1,
    paddingHorizontal: 10,
    width: "100%",
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