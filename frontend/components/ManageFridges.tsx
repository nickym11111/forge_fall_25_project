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
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { supabase } from "../app/utils/client";
import { useAuth } from "../app/context/authContext";
import CustomButton from "./CustomButton";

interface FridgeMate {
  id: string;
  email?: string;
  first_name?: string;
  last_name?: string;
}

interface Fridge {
  created_at: string;
  created_by: string;
  id: string;
  name: string;
  fridgeMates: FridgeMate[];
  isActive?: boolean;
}

interface ManageFridgesScreenProps {
  onClose: () => void;
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
  onLeaveFridge,
  onSwitchFridge,
  isActive,
}: {
  fridge: Fridge;
  onLeaveFridge: (fridgeId: string) => void;
  onSwitchFridge: (fridgeId: string) => void;
  isActive: boolean;
}) => {
  const [expanded, setExpanded] = useState(false);
  const fridgeMates = fridge.fridgeMates || [];
  const INITIAL_SHOW = 3;
  const hasMore = fridgeMates.length > INITIAL_SHOW;
  const displayedMates = expanded
    ? fridgeMates
    : fridgeMates.slice(0, INITIAL_SHOW);

  return (
    <View style={[styles.fridgeCard, isActive && styles.activeFridgeCard]}>
      <View style={styles.fridgeInfo}>
        <View style={styles.fridgeHeader}>
          <Text style={styles.fridgeName}>{fridge.name}</Text>
          {isActive && (
            <View style={styles.activeBadge}>
              <Text style={styles.activeBadgeText}>Active</Text>
            </View>
          )}
        </View>
        <Text style={styles.fridgeId}>ID: {fridge.id}</Text>

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

      <View style={styles.buttonRow}>
        {!isActive && (
          <CustomButton
            className="Switch Fridge"
            onPress={() => onSwitchFridge(fridge.id)}
            title="Switch to This"
            style={styles.switchButton}
          />
        )}
        <CustomButton
          className="Leave Fridge"
          onPress={() => onLeaveFridge(fridge.id)}
          title="Leave Fridge"
          style={[styles.leaveButton, !isActive && styles.leaveButtonSmall]}
        />
      </View>
    </View>
  );
};

const ManageFridgesScreen = ({ onClose }: ManageFridgesScreenProps) => {
  const [fridges, setFridges] = useState<Fridge[]>([]);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
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
        onClose();
        return;
      }

      const response = await fetch(`${API_URL}/users/allFridges`, {
        headers: {
          "Authorization": `Bearer ${session.access_token}`
        }
      });

      const data = await response.json();

      if (response.ok && data.fridges) {
        const fridgesWithActive = data.fridges.map((f: Fridge) => ({
          ...f,
          isActive: f.id === user?.active_fridge_id
        }));
        setFridges(fridgesWithActive);
      } else {
        throw new Error("Failed to fetch fridges");
      }
    } catch (err) {
      console.error("Error fetching fridges:", err);
      Alert.alert("Error", "Could not load your fridges");
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchFridge = async (fridgeId: string) => {
    try {
      setSwitching(true);
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
        throw new Error("Failed to switch fridge");
      }
  
      await refreshUser();
      
      onClose();
  
    } catch (err) {
      console.error("Error switching fridge:", err);
      Alert.alert("Error", "Could not switch fridge");
    } finally {
      setSwitching(false);
    }
  };


  const handleLeaveFridge = async (fridgeId: string) => {
    const isActiveFridge = fridgeId === user?.active_fridge_id;
    
    Alert.alert(
      "Leave Fridge?",
      isActiveFridge 
        ? "This is your active fridge. Are you sure you want to leave?"
        : "Are you sure you want to leave this fridge?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Leave",
          style: "destructive",
          onPress: async () => {
            try {
              setSwitching(true);
              const { data: { session }, error } = await supabase.auth.getSession();
  
              if (error || !session) {
                Alert.alert("Error", "Please log in again");
                return;
              }
  
              const response = await fetch(`${API_URL}/fridge/leave-fridge`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({ 
                  fridgeId: fridgeId, 
                  userId: session.user.id 
                })
              });
  
              const data = await response.json();
  
              if (!response.ok || data.status !== "success") {
                throw new Error(data.message || "Failed to leave fridge");
              }
  
              await refreshUser();
  
              if (isActiveFridge) {
                // Check if they have other fridges
                await fetchAllFridges();
                
                if (fridges.length === 1) {
                  // Was their only fridge, go to create fridge
                  onClose();
                  router.replace("/(tabs)/create_fridge");
                } else {
                  // They have other fridges, refresh the list
                  await fetchAllFridges();
                }
              } else {
                // Just refresh the list
                await fetchAllFridges();
              }
  
              Alert.alert("Success", "Left fridge successfully");
  
            } catch (err) {
              console.error("Error leaving fridge:", err);
              Alert.alert("Error", err instanceof Error ? err.message : "Could not leave fridge");
            } finally {
              setSwitching(false);
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#7C3AED" />
          <Text style={styles.loadingText}>Loading your fridges...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with X button */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Manage Fridges</Text>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Ionicons name="close-circle" size={36} color="#333" />
        </TouchableOpacity>
      </View>

      {/* Action buttons */}
      <View style={styles.actionButtons}>
        <CustomButton
          className="Create Fridge"
          onPress={() => {
            onClose();
            router.push("/(tabs)/create_fridge");
          }}
          title="Create Fridge"
          style={styles.actionButton}
        />
        <CustomButton
          className="Join Fridge"
          onPress={() => {
            onClose();
            router.push("/(tabs)/Join-Fridge");
          }}
          title="Join Fridge"
          style={styles.actionButton}
        />
      </View>

      {/* Content */}
      <ScrollView style={styles.content}>
        {fridges.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No fridges yet</Text>
          </View>
        ) : (
          fridges.map((fridge) => (
            <FridgeCard
              key={fridge.id}
              fridge={fridge}
              onLeaveFridge={handleLeaveFridge}
              onSwitchFridge={handleSwitchFridge}
              isActive={fridge.isActive || false}
            />
          ))
        )}
      </ScrollView>

      {switching && (
        <View style={styles.switchingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.switchingText}>Switching fridge...</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#333",
  },
  closeButton: {
    position: "absolute",
    right: 20,
    top: 60,
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 20,
    paddingHorizontal: 20,
    gap: 16,
  },
  actionButton: {
    width: 150,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 100,
  },
  emptyText: {
    fontSize: 16,
    color: "#999",
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
  activeFridgeCard: {
    borderWidth: 2,
    borderColor: "#7C3AED",
  },
  fridgeInfo: {
    marginBottom: 16,
  },
  fridgeHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  fridgeName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
    flex: 1,
  },
  activeBadge: {
    backgroundColor: "#7C3AED",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  fridgeId: {
    fontSize: 14,
    color: "#666",
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
  buttonRow: {
    flexDirection: "row",
    gap: 12,
  },
  switchButton: {
    flex: 1,
  },
  leaveButton: {
    width: "100%",
  },
  leaveButtonSmall: {
    flex: 1,
  },
  switchingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  switchingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#fff",
  },
});

export default ManageFridgesScreen;