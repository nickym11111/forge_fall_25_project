import {
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Text, View } from "@/components/Themed";
import React, { useState, useEffect } from "react";
import { useAuth } from "../context/authContext";
import { supabase } from "../utils/client";
import ProfileIcon from "@/components/ProfileIcon";

interface ItemProps {
  title: string;
  onAdd?: () => void;
}

interface FridgeMate {
  first_name?: string;
  last_name?: string;
  name?: string;
  email?: string;
  profile_photo_url?: string;
}

interface FavoriteRecipe {
  id: number;
  recipe_name: string;
  added_by?: FridgeMate | null;
}

interface FavoriteRecipeItemProps {
  recipe_name: string;
  added_by?: FridgeMate | null;
  onRemove: (id: number, name: string) => void;
  recipeId: number;
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

const FavoriteRecipeItem = ({
  recipe_name,
  added_by,
  onRemove,
  recipeId,
}: FavoriteRecipeItemProps) => {
  const getDisplayName = (mate: FridgeMate) => {
    if (!mate) return "Unknown";
    if (mate.first_name && mate.last_name)
      return `${mate.first_name} ${mate.last_name}`;
    if (mate.first_name) return mate.first_name;
    if (mate.last_name) return mate.last_name;
    if (mate.name) return mate.name;
    if (mate.email) return mate.email.split("@")[0];
    return "Unknown";
  };

  const getInitials = (mate: FridgeMate) => {
    if (!mate) return "?";
    if (mate.first_name && mate.last_name) {
      return `${mate.first_name[0]}${mate.last_name[0]}`.toUpperCase();
    }
    if (mate.first_name) return mate.first_name[0].toUpperCase();
    if (mate.last_name) return mate.last_name[0].toUpperCase();
    if (mate.email) return mate.email[0].toUpperCase();
    return "?";
  };

  const addedByName = added_by ? getDisplayName(added_by) : "Unknown";

  return (
    <View style={styles.favoriteRecipeCard}>
      <View style={{ flex: 1, backgroundColor: "transparent" }}>
        <Text style={styles.favoriteRecipeTitle}>{recipe_name}</Text>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginTop: 8,
            backgroundColor: "transparent",
          }}
        >
          {added_by?.profile_photo_url ? (
            <Image
              source={{ uri: added_by.profile_photo_url }}
              style={styles.profilePhoto}
            />
          ) : added_by ? (
            <View style={[styles.profilePhoto, styles.defaultProfileIcon]}>
              <Text style={styles.profileInitials}>
                {getInitials(added_by)}
              </Text>
            </View>
          ) : null}
          <Text style={styles.favoriteRecipeMeta}>Added by {addedByName}</Text>
        </View>
      </View>

      <TouchableOpacity
        onPress={() => onRemove(recipeId, recipe_name)}
        style={styles.removeButton}
      >
        <Ionicons name="heart" size={28} color="#E91E63" />
      </TouchableOpacity>
    </View>
  );
};

export default function recipes() {
  const [activeTab, setActiveTab] = useState<
    "ingredients" | "recipes" | "favorites"
  >("ingredients");

  const [inputValue, setInputValue] = useState<string>("");
  const [responseMessage, setResponseMessage] = useState<string[]>([]);

  const [isLoadingRecipes, setIsLoadingRecipes] = useState<boolean>(false);
  const [isLoadingIngredients, setIsLoadingIngredients] =
    useState<boolean>(false);
  const [recipes, setRecipes] = useState<any[]>([]);

  // Favorite recipes state
  const [favoriteRecipes, setFavoriteRecipes] = useState<FavoriteRecipe[]>([]);
  const [isLoadingFavorite, setIsLoadingFavorite] = useState<boolean>(false);
  const [refreshingFavorite, setRefreshingFavorite] = useState<boolean>(false);

  const { user } = useAuth();
  const currentUserId = user?.id || "";
  const currentFridgeId = user?.fridge_id || "";

  useEffect(() => {
    if (activeTab === "recipes" && recipes.length === 0) {
      handleFindRecipe();
    }
    if (activeTab === "favorites") {
      fetchFavoriteRecipes();
    }
  }, [activeTab]);

  interface FridgeItem {
    name: string;
    id?: string;
    quantity?: number;
  }

  const handleSubmit = async () => {
    if (!inputValue.trim()) {
      alert("Enter a dish to see which ingredients you're missing");
      return;
    }

    setIsLoadingIngredients(true);

    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/find_ingredients`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recipe: inputValue.trim(),
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch ingredients");
      }

      const data = await response.json();
      const rawText = data.output[0].content[0].text;

      const jsonString = rawText
        .replace(/^Response:\s*/, "")
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();

      let ingredients: string[] = [];

      try {
        const parsed = JSON.parse(jsonString);
        ingredients = parsed.ingredients || [];

        if (ingredients.length === 0) {
          alert("You already have all ingredients for this recipe! 🎉");
        }
      } catch (error) {
        console.error("Failed to parse JSON:", error);
        console.error("Raw text:", rawText);
        ingredients = ["Error parsing response"];
      }

      setResponseMessage(ingredients);
    } catch (error) {
      console.error("Error sending data:", error);
      setResponseMessage(["Error sending data to backend."]);
    } finally {
      setIsLoadingIngredients(false);
    }
  };

  const handleFindRecipe = async () => {
    setIsLoadingRecipes(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        Alert.alert("Error", "You must be logged in to edit items");
        return;
      }

      const fridgeItems = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/fridge_items/`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      const result = await fridgeItems.json();

      const fridgeItemsFetched = (result.data as FridgeItem[]).map(
        (item: FridgeItem) => item.name
      );

      const body = {
        fridgeItems: fridgeItemsFetched,
      };
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/generate-recipes/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );

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
      console.error("Error fetching recipes:", error);
      setRecipes([{ message: "Error sending data to backend." }]);
    } finally {
      setIsLoadingRecipes(false);
    }
  };

  const fetchFavoriteRecipes = async () => {
    try {
      setIsLoadingFavorite(true);
      console.log("Fetching favorite recipes...");

      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error || !session) {
        console.error("Not logged in");
        setFavoriteRecipes([]);
        return;
      }

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/favorite-recipes/get-favorite-recipes/`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log("Favorite recipes:", result.data);

      setFavoriteRecipes(result.data || []);
    } catch (err) {
      console.error("Error fetching favorite recipes:", err);
      setFavoriteRecipes([]);
    } finally {
      setIsLoadingFavorite(false);
      setRefreshingFavorite(false);
    }
  };

  const onRefreshFavorite = () => {
    setRefreshingFavorite(true);
    fetchFavoriteRecipes();
  };

  const handleRemoveFavoriteRecipe = async (
    recipeId: number,
    recipeName: string
  ) => {
    Alert.alert(
      "Remove Recipe",
      `Are you sure you want to remove "${recipeName}" from favorites?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              console.log("Attempting to delete recipe with ID:", recipeId);

              setFavoriteRecipes((prev) =>
                prev.filter((r) => r.id !== recipeId)
              );

              const response = await fetch(
                `${process.env.EXPO_PUBLIC_API_URL}/favorite-recipes/delete-recipe/${recipeId}`,
                {
                  method: "DELETE",
                  headers: { "Content-Type": "application/json" },
                }
              );

              console.log("Delete response status:", response.status);

              if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error("Delete error response:", errorData);
                throw new Error(
                  errorData.detail ||
                    errorData.error ||
                    "Failed to remove recipe"
                );
              }

              const result = await response.json();
              console.log("Delete successful:", result);
            } catch (err) {
              console.error("Error removing recipe:", err);
              fetchFavoriteRecipes();
              alert(
                `Failed to remove recipe: ${
                  err instanceof Error ? err.message : "Unknown error"
                }`
              );
            }
          },
        },
      ]
    );
  };

  const handleAddToGroceryList = async (ingredient: string, retryCount = 0) => {
    const MAX_RETRIES = 1;

    if (!ingredient.trim()) {
      alert("Invalid ingredient");
      return;
    }

    try {
      console.log(
        `Attempting to add "${ingredient}" to grocery list (attempt ${
          retryCount + 1
        })`
      );

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/add_to_grocery_list`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ingredient: ingredient.trim(),
            userId: currentUserId,
            fridgeId: currentFridgeId,
          }),
        }
      );

      const data = await response.json();
      console.log("Response:", data);

      if (response.ok) {
        Alert.alert(`✓ ${ingredient} added to grocery list!`);
        setResponseMessage((prev) =>
          prev.filter((item) => item !== ingredient)
        );
      } else {
        throw new Error(data.detail || data.message || "Failed to add item");
      }
    } catch (error) {
      console.error(
        `Failed to add to grocery list (attempt ${retryCount + 1}):`,
        error
      );

      if (retryCount < MAX_RETRIES) {
        console.log(`🔄 Retrying...`);
        alert(`Connection issue. Retrying...`);
        await new Promise((resolve) => setTimeout(resolve, 1000));
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
    currentFridgeId,
  }: {
    item: any;
    currentUserId: string;
    currentFridgeId: string;
  }) => {
    const [isFavorite, setIsFavorite] = useState(false);

    const handleHeartPress = async () => {
      const newState = !isFavorite;
      setIsFavorite(newState);

      console.log(
        `Attempting to set '${item.recipe_name}' favorite status to: ${newState}`
      );

      try {
        if (newState) {
          const response = await fetch(
            `${process.env.EXPO_PUBLIC_API_URL}/add-favorite-recipe/`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                recipe: {
                  name: item.recipe_name,
                  added_by: currentUserId,
                },
                user: {
                  id: currentUserId,
                  fridge_id: currentFridgeId,
                },
              }),
            }
          );

          if (!response.ok) {
            const errorData = await response.json();
            console.error("Error response:", errorData);
            setIsFavorite(false);
            throw new Error(
              errorData.detail || "Failed to add recipe to favorites."
            );
          }

          const result = await response.json();
          console.log("Favorite added successfully:", result);
          alert(`✓ ${item.recipe_name} added to favorites!`);

          if (activeTab === "favorites") {
            fetchFavoriteRecipes();
          }
        } else {
          console.warn(
            "Unfavoriting needs the unique DB record ID. Skipping DELETE API call."
          );
          alert("Unfavoriting not yet implemented");
        }
      } catch (error) {
        console.error("Error in API call:", error);
        setIsFavorite(!newState);
        alert(
          `Could not ${
            newState ? "add" : "remove"
          } favorite. Please check your connection.`
        );
      }
    };

    if (item.recipe_name) {
      return (
        <View style={styles.itemContainer}>
          <View style={{ flex: 1, backgroundColor: "transparent" }}>
            <Text style={styles.recipeTitle}>{item.recipe_name}</Text>
            {item.description && (
              <Text style={styles.recipeDescription}>{item.description}</Text>
            )}
            {item.ingredients_used && Array.isArray(item.ingredients_used) && (
              <Text style={styles.recipeIngredients}>
                Ingredients: {item.ingredients_used.join(", ")}
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
              color={isFavorite ? "#E91E63" : "#94a3b8"}
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Share Recipes</Text>
        <ProfileIcon className="" style={styles.profileIconContainer} />
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === "ingredients" && styles.activeIconTab,
          ]}
          onPress={() => setActiveTab("ingredients")}
        >
          <MaterialCommunityIcons
            name={activeTab === "ingredients" ? "shaker" : "shaker-outline"}
            size={24}
            color={activeTab === "ingredients" ? "white" : "#64748b"}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "ingredients" && styles.activeTabText,
            ]}
          >
            Get Ingredients
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === "recipes" && styles.activeIconTab,
          ]}
          onPress={() => setActiveTab("recipes")}
        >
          <MaterialCommunityIcons
            name={activeTab === "recipes" ? "food" : "food-outline"}
            size={24}
            color={activeTab === "recipes" ? "white" : "#64748b"}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "recipes" && styles.activeTabText,
            ]}
          >
            Get Recipes
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === "favorites" && styles.activeIconTab,
          ]}
          onPress={() => setActiveTab("favorites")}
        >
          <Ionicons
            name={activeTab === "favorites" ? "heart" : "heart-outline"}
            size={24}
            color={activeTab === "favorites" ? "white" : "#64748b"}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "favorites" && styles.activeTabText,
            ]}
          >
            Favorites
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {activeTab === "ingredients" && (
          <View style={styles.contentSection}>
            <View style={styles.boxContainer}>
              <View style={styles.sectionHeader}>
                <Ionicons name="restaurant-outline" size={22} color="#14b8a6" />
                <Text style={styles.sectionTitle}>
                  Find Missing Ingredients
                </Text>
              </View>
              <Text style={styles.instructionText}>
                Enter a dish name to see which ingredients you're missing from
                your kitchen.
              </Text>
              <View style={styles.infoBadge}>
                <Ionicons
                  name="information-circle-outline"
                  size={16}
                  color="#64748b"
                />
                <Text style={styles.infoBadgeText}>
                  Only shows ingredients you don't have
                </Text>
              </View>
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

        {activeTab === "recipes" && (
          <View style={styles.contentSection}>
            <View style={styles.boxContainer}>
              <View style={styles.sectionHeader}>
                <Ionicons name="sparkles-outline" size={22} color="#14b8a6" />
                <Text style={styles.sectionTitle}>AI Recipe Generator</Text>
              </View>
              <Text style={styles.instructionText}>
                Get personalized recipe suggestions based on what's in your
                kitchen!
              </Text>

              {isLoadingRecipes ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#14b8a6" />
                  <Text style={styles.loadingText}>Generating recipes...</Text>
                </View>
              ) : (
                <>
                  <FlatList
                    data={recipes}
                    renderItem={({ item }) => (
                      <RecipeItem
                        item={item}
                        currentUserId={currentUserId}
                        currentFridgeId={currentFridgeId}
                      />
                    )}
                    keyExtractor={(item, index) =>
                      item.recipe_name || index.toString()
                    }
                    scrollEnabled={false}
                  />

                  {recipes.length > 0 && (
                    <TouchableOpacity
                      style={styles.retryButton}
                      onPress={handleFindRecipe}
                    >
                      <Ionicons name="refresh" size={20} color="white" />
                      <Text style={styles.retryButtonText}>
                        Generate New Recipes
                      </Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>
          </View>
        )}

        {activeTab === "favorites" && (
          <View style={styles.contentSection}>
            <View style={styles.boxContainer}>
              <View style={styles.sectionHeader}>
                <Ionicons name="heart" size={22} color="#E91E63" />
                <Text style={styles.sectionTitle}>Your Favorite Recipes</Text>
              </View>

              {isLoadingFavorite && !refreshingFavorite ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#14b8a6" />
                  <Text style={styles.loadingText}>Loading favorites...</Text>
                </View>
              ) : favoriteRecipes.length === 0 ? (
                <View style={styles.emptyStateContainer}>
                  <View style={styles.emptyStateIcon}>
                    <Ionicons name="heart-outline" size={48} color="#cbd5e1" />
                  </View>
                  <Text style={styles.emptyText}>No favorite recipes yet</Text>
                  <Text style={styles.emptySubtext}>
                    Tap the heart icon on recipes to save them here
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={favoriteRecipes}
                  renderItem={({ item }) => (
                    <FavoriteRecipeItem
                      recipe_name={item.recipe_name}
                      added_by={item.added_by}
                      recipeId={item.id}
                      onRemove={handleRemoveFavoriteRecipe}
                    />
                  )}
                  keyExtractor={(item) => item.id.toString()}
                  scrollEnabled={false}
                  refreshControl={
                    <RefreshControl
                      refreshing={refreshingFavorite}
                      onRefresh={onRefreshFavorite}
                      colors={["#14b8a6"]}
                      tintColor="#14b8a6"
                    />
                  }
                />
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFBFC",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1e293b",
  },
  profileIconContainer: {
    position: "absolute",
    right: 10,
    top: 50,
  },

  tabContainer: {
    flexDirection: "row",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },

  tabButton: {
    flex: 1,
    height: 60,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f0fdfa",
    marginHorizontal: 4,
    marginTop: 8,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },

  activeIconTab: {
    backgroundColor: "#14b8a6",
    borderColor: "#14b8a6",
  },

  tabText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748b",
    marginTop: 4,
  },

  activeTabText: {
    color: "white",
    fontWeight: "700",
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
    alignItems: "center",
  },

  contentSection: {
    width: "100%",
    alignItems: "center",
    marginBottom: 20,
  },

  boxContainer: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "white",
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },

  instructionText: {
    fontSize: 15,
    color: "#1e293b",
    marginBottom: 8,
    fontWeight: "500",
  },

  noteText: {
    fontSize: 13,
    color: "#64748b",
    fontStyle: "italic",
    marginBottom: 16,
  },

  loadingText: {
    textAlign: "center",
    color: "#64748b",
    marginTop: 20,
    fontSize: 16,
    fontWeight: "500",
  },

  searchContainer: {
    flexDirection: "row",
    marginBottom: 20,
    alignItems: "center",
    gap: 10,
  },

  searchInput: {
    flex: 1,
    height: 50,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    borderRadius: 16,
    paddingHorizontal: 15,
    backgroundColor: "#f8fafc",
    fontSize: 16,
    color: "#1e293b",
  },

  submitButton: {
    width: 50,
    height: 50,
    backgroundColor: "#14b8a6",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },

  submitButtonText: {
    color: "white",
    fontSize: 24,
    fontWeight: "bold",
  },

  ingredientItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },

  ingredientText: {
    flex: 1,
    fontSize: 16,
    color: "#1e293b",
    fontWeight: "500",
  },

  addButton: {
    backgroundColor: "#14b8a6",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },

  addButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 14,
  },

  item: {
    backgroundColor: "#f8fafc",
    padding: 16,
    marginVertical: 6,
    borderRadius: 16,
    width: "100%",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },

  itemContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    backgroundColor: "#fff",
    padding: 20,
    marginVertical: 8,
    borderRadius: 20,
    width: "100%",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  heartButton: {
    paddingLeft: 10,
  },

  itemText: {
    fontSize: 18,
    color: "#1e293b",
  },

  recipeTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 6,
  },

  recipeDescription: {
    fontSize: 14,
    color: "#64748b",
    marginTop: 4,
    marginBottom: 8,
    lineHeight: 20,
  },

  recipeIngredients: {
    fontSize: 13,
    color: "#94a3b8",
    fontStyle: "italic",
    marginTop: 4,
  },

  favoriteRecipeCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    backgroundColor: "#fff",
    padding: 20,
    marginVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  favoriteRecipeTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e293b",
  },

  favoriteRecipeMeta: {
    fontSize: 13,
    color: "#64748b",
    marginLeft: 8,
  },

  profilePhoto: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#f0fdfa",
  },

  defaultProfileIcon: {
    backgroundColor: "#14b8a6",
    justifyContent: "center",
    alignItems: "center",
  },

  profileInitials: {
    color: "white",
    fontSize: 10,
    fontWeight: "bold",
  },

  removeButton: {
    padding: 8,
  },

  emptyStateContainer: {
    alignItems: "center",
    marginTop: 32,
    marginBottom: 20,
    paddingVertical: 32,
  },
  emptyStateIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#f8fafc",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyText: {
    textAlign: "center",
    fontSize: 18,
    color: "#1e293b",
    marginBottom: 8,
    fontWeight: "700",
  },

  emptySubtext: {
    textAlign: "center",
    fontSize: 14,
    color: "#64748b",
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  loadingContainer: {
    alignItems: "center",
    marginTop: 32,
    paddingVertical: 32,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e293b",
  },
  infoBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0fdfa",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 16,
    gap: 6,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  infoBadgeText: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "500",
  },

  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#14b8a6",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 16,
    marginTop: 20,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },

  retryButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});
