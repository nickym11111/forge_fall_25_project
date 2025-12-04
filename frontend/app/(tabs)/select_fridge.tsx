import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { supabase } from "../utils/client";
import { useAuth } from "../context/authContext";
import CustomButton from "@/components/CustomButton";

interface FridgeMate {
  id: string;
  email?: string;
  first_name?: string;
  last_name?: string;
}

interface Fridge {
  id: string;
  name: string;
  created_at: string;
  created_by: string;
  fridgeMates: FridgeMate[];
}

const API_URL = process.env.EXPO_PUBLIC_API_URL;

const getDisplayName = (mate: FridgeMate): string => {
  if (mate.first_name && mate.last_name) {
    return `${mate.first_name} ${mate.last_name}`;
  }
  return mate.email || "Unknown";
};

const FridgeCard = ({
  fridge,
  onSelect,
}: {
  fridge: Fridge;
  onSelect: (fridgeId: string) => void;
}) => {
  const [expanded, setExpanded] = useState(false);
  const fridgeMates = fridge.fridgeMates || [];
  const INITIAL_SHOW = 3;
  const hasMore = fridgeMates.length > INITIAL_SHOW;
  const displayedMates = expanded
    ? fridgeMates
    : fridgeMates.slice(0, INITIAL_SHOW);

  return (
    <View style={styles.fridgeCard}>
      <View style={styles.fridgeInfo}>
        <Text style={styles.fridgeName}>{fridge.name}</Text>

        {fridgeMates.length > 0 && (
          <View style={styles.fridgeMatesSection}>
            <Text style={styles.fridgeMatesTitle}>
              Fridgemates ({fridgeMates.length}):
            </Text>
            {displayedMates.map((mate) => (
              <Text key={mate.id} style={styles.fridgeMateName}>
                • {getDisplayName(mate)}
              </Text>
            ))}
            {hasMore && !expanded && (
              <TouchableOpacity onPress={() => setExpanded(true)}>
                <Text style={styles.showMoreText}>
                  Show {fridgeMates.length - INITIAL_SHOW} more...
                </Text>
              </TouchableOpacity>
            )}
            {expanded && hasMore && (
              <TouchableOpacity onPress={() => setExpanded(false)}>
                <Text style={styles.showMoreText}>Show less</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      <CustomButton
        className="Select Fridge"
        onPress={() => onSelect(fridge.id)}
        title="Select This Fridge"
        style={styles.selectButton}
      />
    </View>
  );
};

export default function SelectFridgeScreen() {
  const [fridges, setFridges] = useState<Fridge[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState(false);
  const { user, refreshUser } = useAuth();

  useEffect(() => {
    fetchAllFridges();
  }, []);

  const fetchAllFridges = async () => {
    try {
      setLoading(true);
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error || !session) {
        Alert.alert("Error", "Please log in again");
        router.replace("/(tabs)");
        return;
      }

      const response = await fetch(`${API_URL}/users/allFridges`, {
        headers: {
          "Authorization": `Bearer ${session.access_token}`
        }
      });

      const data = await response.json();

      if (response.ok && data.fridges) {
        setFridges(data.fridges);
        if (data.fridges.length === 1) {
            console.log("Only one fridge, auto-selecting...");
            await handleSelectFridge(data.fridges[0].id);
            return;
        }
      } else {
        throw new Error("Failed to fetch fridges");
      }
    } catch (err) {
      console.error("Error fetching fridges:", err);
      Alert.alert(
        "Error",
        "Could not load your fridges. Please try again.",
        [
          {
            text: "Retry",
            onPress: () => fetchAllFridges()
          },
          {
            text: "Logout",
            onPress: () => router.replace("/(tabs)")
          }
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSelectFridge = async (fridgeId: string) => {
    try {
      setSelecting(true);
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error || !session) {
        Alert.alert("Error", "Please log in again");
        return;
      }

      const response = await fetch(`${API_URL}/users/active-fridge`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ fridge_id: fridgeId })
      });

      if (!response.ok) {
        throw new Error("Failed to set active fridge");
      }

      await refreshUser();

      router.replace("/(tabs)/two");

    } catch (err) {
      console.error("Error selecting fridge:", err);
      Alert.alert("Error", "Could not select fridge. Please try again.");
    } finally {
      setSelecting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#7C3AED" />
          <Text style={styles.loadingText}>Loading your kitchens...</Text>
        </View>
      </View>
    );
  }

  if (fridges.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No Fridges Found</Text>
          <Text style={styles.emptyText}>
            Create or join a fridge to get started
          </Text>
          <CustomButton
            className="Create Fridge"
            onPress={() => router.replace("/(tabs)/create_fridge")}
            title="Create or Join Fridge"
            style={styles.actionButton}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Select Your Fridge</Text>
        <Text style={styles.headerSubtitle}>
          Choose which fridge you'd like to use
        </Text>
      </View>

      {/* Fridge List */}
      <ScrollView style={styles.content}>
        {fridges.map((fridge) => (
          <FridgeCard
            key={fridge.id}
            fridge={fridge}
            onSelect={handleSelectFridge}
          />
        ))}
      </ScrollView>

      {/* Loading overlay when selecting */}
      {selecting && (
        <View style={styles.selectingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.selectingText}>Setting up your fridge...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FF",
  },
  header: {
    paddingTop: 80,
    paddingBottom: 30,
    paddingHorizontal: 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#333",
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: "#666",
  },
  content: {
    flex: 1,
    padding: 20,
  },
  fridgeCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  fridgeInfo: {
    marginBottom: 16,
  },
  fridgeName: {
    fontSize: 22,
    fontWeight: "700",
    color: "#333",
    marginBottom: 12,
  },
  fridgeMatesSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  fridgeMatesTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  fridgeMateName: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
    marginLeft: 8,
  },
  showMoreText: {
    fontSize: 14,
    color: "#7C3AED",
    fontWeight: "600",
    marginTop: 6,
    marginLeft: 8,
  },
  selectButton: {
    width: "100%",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#333",
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
  },
  actionButton: {
    width: 200,
  },
  selectingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  selectingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#fff",
  },
});