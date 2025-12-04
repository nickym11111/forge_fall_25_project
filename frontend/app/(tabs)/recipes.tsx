import {
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  ScrollView, 
} from "react-native";
import { type SetStateAction, type Dispatch } from "react";
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Text, View } from "@/components/Themed";
import React, { useState, useRef, useEffect } from "react";
import type { PropsWithChildren } from "react";
import CustomHeader from "@/components/CustomHeader";
import CustomButton from "@/components/CustomButton";
import { useAuth } from "../context/authContext";


interface ItemProps {
  title: string;
  onAdd?: () => viod;
}

const Item = ({ title, onAdd }: ItemProps) => {
  return (
    <View style={styles.ingredientItem}> 
      <Text style={styles.ingredientText}>{title}</Text>
      {onAdd && (
        <TouchableOpacity style={styles.addButton} onPress={onAdd}>
          <Text style={styles.addButtonText}>+ Add</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

export default function recipes() {
  const [activeTab, setActiveTab] = useState<'ingredients' | 'recipes' | 'saved'>('ingredients');

  const [inputValue, setInputValue] = useState<string>('');
  const [responseMessage, setResponseMessage] = useState<string[]>([]);

  const [selectedIngredientsPrompt, setSelectedIngredientsPrompt] = useState<string>(''); // could probably delete
  const [selectedRecipePrompt, setSelectedRecipePrompt] = useState<string>('');
  const [isLoadingRecipes, setIsLoadingRecipes] = useState<boolean>(false); 
  const [isLoadingIngredients, setIsLoadingIngredients] = useState<boolean>(false); 
  const [recipes, setRecipes] = useState<any[]>([]);

  const { user, supabase } = useAuth();
  const currentUserId = user?.id || '';
  const currentFridgeId = user?.fridge_id || '';


  useEffect(() => {
    if (activeTab === 'recipes' && recipes.length === 0) {
      handleFindRecipe();
    }
  }, [activeTab]);

  const handleSubmit = async () => {
    if (!inputValue.trim()) {
      alert("Enter a dish to see which ingredients you're missing");
      return;
    }
    
    setIsLoadingIngredients(true);
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/find_ingredients`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json',},
        body: JSON.stringify({ 
          dataToSend.recipe,
          dataToSend.user
        }), 
      });

      if (!response.ok) {
        throw new Error('Failed to fetch ingredients');
      }

      const data = await response.json();
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
    } finally {
      setIsLoadingIngredients(false);
    }
  };

  const handleFindRecipe = async () => {
    setIsLoadingRecipes(true);
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/generate-recipes/`);
      const data2 = await response.json();
      
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
    } finally {
      setIsLoadingRecipes(false);
    }
  };

  const handleAddToGroceryList = async (ingredient: string, retryCount = 0) => {
    const MAX_RETRIES = 1; // Will try twice total
    
    if (!ingredient.trim()) {
      alert("Invalid ingredient");
      return;
    }

    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error || !session) {
        alert("You must be logged in to add items");
        return;
      }

      console.log(`Attempting to add "${ingredient}" to grocery list (attempt ${retryCount + 1})`);
      
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/add_to_grocery_list`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ 
          ingredient: ingredient.trim(),
          userId: currentUserId,
          fridgeId: currentFridgeId
        }),
      });
      
      const data = await response.json();
      console.log('Response:', data);
      
      if (response.ok) {
        // Success!
        alert(`✓ ${ingredient} added to grocery list!`);
        
        setResponseMessage(prev => prev.filter(item => item !== ingredient));
      } else {
        throw new Error(data.detail || data.message || 'Failed to add item');
      }
      
    } catch (error) {
      console.error(`Failed to add to grocery list (attempt ${retryCount + 1}):`, error);
      
      if (retryCount < MAX_RETRIES) {
        console.log(`🔄 Retrying...`);
        alert(`Connection issue. Retrying...`);

        await new Promise(resolve => setTimeout(resolve, 1000));
        return handleAddToGroceryList(ingredient, retryCount + 1);
      } else {
        alert(
          error instanceof Error 
            ? error.message 
            : "Could not add to grocery list. Please check your internet connection."
        );
      }
    }
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
      title="Share Recipes!  "
      logo={require('../../assets/images/FridgeIcon.png')}
    />

  <View style={styles.tabContainer}>
    <TouchableOpacity
      style={[styles.tabButton, activeTab === 'ingredients' && styles.activeIconTab]}
      onPress={() => setActiveTab('ingredients')}
      >
        <MaterialCommunityIcons
          name={activeTab === 'ingredients' ? "shaker" : "shaker-outline"}
          size={28}
          color={activeTab === 'ingredients' ? '#666' : 'white'}
        />
        <Text style={[styles.tabText, activeTab === 'ingredients' && styles.activeTabText]}>
              Get Ingredients
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'recipes' && styles.activeIconTab]}
            onPress={() => setActiveTab('recipes')}
          >
            <MaterialCommunityIcons
              name={activeTab === 'recipes' ? "food" : "food-outline"}
              size={28}
              color={activeTab === 'recipes' ? '#666' : 'white'}
            />
            <Text style={[styles.tabText, activeTab === 'recipes' && styles.activeTabText]}>
              Get Recipes
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'saved' && styles.activeIconTab]}
            onPress={() => setActiveTab('saved')}
          >
            <Ionicons 
              name={activeTab === 'saved' ? "heart" : "heart-outline"}
              size={28} 
              color={activeTab === 'saved' ? '#666' : 'white'} 
            />
            <Text style={[styles.tabText, activeTab === 'saved' && styles.activeTabText]}>
              Saved
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {activeTab === 'ingredients' && (
            <View style={styles.contentSection}>
              <View style={styles.boxContainer}>
                <Text>Generate a list of ingredients for a certain recipe!</Text>
              <Text style={styles.noteText}>
                <Text>NOTE: the list only shows what you don't already have</Text>
              </Text>
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              onChangeText={setInputValue}
              value={inputValue}
              placeholder="Enter a Dish..."
              onSubmitEditing={handleSubmit}
            />
            <TouchableOpacity 
              style={styles.submitButton}
              onPress={handleSubmit}
              disabled={isLoadingIngredients}
            >
              <Text style={styles.submitButtonText}>
                {isLoadingIngredients ? "..." : "→"}
              </Text>
            </TouchableOpacity>
          </View>

          {responseMessage.length > 0 && (
                  <FlatList
                    data={responseMessage}
                    renderItem={({ item }) => (
                      <Item 
                        title={item} 
                        onAdd={() => handleAddToGroceryList(item)}
                      />
                    )}
                    keyExtractor={(item, index) => index.toString()}
                    scrollEnabled={false}
                  />
                )}
              </View>
            </View>
          )}

          {activeTab === 'recipes' && (
            <View style={styles.contentSection}>
              <View style={styles.boxContainer}>
                <Text style={styles.instructionText}>
                  Generate recipes you can make based on your current food inventory!
                </Text>

                {isLoadingRecipes ? (
                  <Text style={styles.loadingText}>Loading recipes...</Text>
                ) : (
                  <FlatList
                    data={recipes}
                    renderItem={({ item }) => <RecipeItem item={item} />}
                    keyExtractor={(item, index) => item.recipe_name || index.toString()}
                    scrollEnabled={false}
                  />
                )}
              </View>
            </View>
          )}

          {activeTab === 'saved' && (
            <View style={styles.contentSection}>
              <View style={styles.boxContainer}>
                <Text style={styles.instructionText}>
                  Your saved recipes will appear here
                </Text>
                {/* TODO: Load saved recipes from database */}
              </View>
            </View>
          )}
        </ScrollView>
      </View>
    );
  }
  
const styles = StyleSheet.create({
  container: {
    flex: 1, // Full screen height
    backgroundColor: "#F8F9FF",
  },

  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'transparent',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
    justifyContent: 'space-around',
  },
  
  iconTabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  
  activeIconTab: {
    borderBottomColor: '#666',
  },
  
  iconTabLabel: {
    fontSize: 12,
    marginTop: 4,
    color: 'red',
  },
  
  activeIconTabLabel: {
    color: '#666',
    fontWeight: '600',
  },

  tabContainer: {
    flexDirection: 'row',
    flexWrap: "warp",
    justifyContent: "center",
  },

  tabButton: {
    minWidth: "33%",
    height: 60,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#14b8a6',//change
    marginHorizontal: 4,
    marginTop: 8,
    borderRadius: 8,
    borderBottomColor: 'transparent',
  }, 

  activeTab: {
    borderBottomColor: '#666',
  },

  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'white',
  },

  activeTabText: {
    color: '#666',
    fontWeight: '700',
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
  },

 instructionText: {
    fontSize: 15,
    color: '#333',
    marginBottom: 8,
  },
  
  noteText: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 16,
  },
  
  loadingText: {
    textAlign: 'center',
    color: '#666',
    marginTop: 20,
  },
  
  // Search container
  searchContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    alignItems: 'center',
    gap: 10,
  },
  
  searchInput: {
    flex: 1,
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    backgroundColor: 'white',
  },
  
  submitButton: {
    width: 50,
    height: 50,
    backgroundColor: '#14b8a6',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  submitButtonText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  
  // Ingredient item
  ingredientItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  
  ingredientText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  
  addButton: {
    backgroundColor: '#14b8a6',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
  },
  
  addButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  
  // Recipe items
  item: {
    backgroundColor: "#f0f0f0",
    padding: 15,
    marginVertical: 5,
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
    borderRadius: 8,
    width: "100%", 
  },
  
  heartButton: {
    paddingLeft: 10,
  },
  
  itemText: {
    fontSize: 18,
    color: "#333",
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
});