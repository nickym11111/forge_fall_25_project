import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { supabase } from "../app/utils/client";
import { useAuth } from "../app/context/authContext";
import CustomButton from "./CustomButton";
import CreateFridgeModal from "./CreateFridgeModal";
import JoinFridgeModal from "./JoinFridgeModal";
import ViewRequestsModal from "./ViewRequestsModal";

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
  onViewRequests,
  isActive,
}: {
  fridge: Fridge;
  onLeaveFridge: (fridgeId: string) => void;
  onSwitchFridge: (fridgeId: string) => void;
  onViewRequests: (fridgeId: string, fridgeName: string) => void;
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
        <TouchableOpacity
          onPress={() => onViewRequests(fridge.id, fridge.name)}
          style={styles.viewRequestsButton}
        >
          <Ionicons name="list-outline" size={18} color="#14b8a6" style={styles.buttonIcon} />
          <Text style={styles.viewRequestsButtonText}>View Requests</Text>
        </TouchableOpacity>
      </View>
      
      {!isActive && (
        <View style={[styles.buttonRow, { marginTop: 12 }]}>
          <TouchableOpacity
            onPress={() => onSwitchFridge(fridge.id)}
            style={styles.switchButton}
          >
            <Ionicons name="swap-horizontal-outline" size={18} color="#14b8a6" style={styles.buttonIcon} />
            <Text style={styles.switchButtonText}>Switch to This</Text>
          </TouchableOpacity>
        </View>
      )}
      
      <View style={[styles.buttonRow, { marginTop: 12 }]}>
        <TouchableOpacity
          onPress={() => onLeaveFridge(fridge.id)}
          style={styles.leaveButton}
        >
          <Ionicons name="log-out-outline" size={18} color="#ef4444" style={styles.leaveButtonIcon} />
          <Text style={styles.leaveButtonText}>Leave Kitchen</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const ManageFridgesScreen = ({ onClose }: ManageFridgesScreenProps) => {
  const [fridges, setFridges] = useState<Fridge[]>([]);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showRequestsModal, setShowRequestsModal] = useState(false);
  const [selectedFridge, setSelectedFridge] = useState<{ id: string; name: string } | null>(null);
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
      
      await new Promise(resolve => setTimeout(resolve, 200));
      await fetchAllFridges();
      
      Alert.alert("Success", "Switched to fridge successfully!");

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
      "Leave Kitchen?",
      isActiveFridge
        ? "This is your active kitchen. Are you sure you want to leave?"
        : "Are you sure you want to leave this kitchen?",
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
                throw new Error(data.message || "Failed to leave kitchen");
              }

              await refreshUser();

              if (isActiveFridge && fridges.length === 1) {
                onClose();
                router.replace("/(tabs)/create_fridge");
              } else {
                await fetchAllFridges();
              }

              Alert.alert("Success", "Left kitchen successfully");

            } catch (err) {
              console.error("Error leaving kitchen:", err);
              Alert.alert("Error", err instanceof Error ? err.message : "Could not leave kitchen");
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
          <ActivityIndicator size="large" color="#14b8a6" />
          <Text style={styles.loadingText}>Loading your kitchens...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Manage Kitchens</Text>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Ionicons name="close" size={28} color="#64748b" />
        </TouchableOpacity>
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => setShowCreateModal(true)}
        >
          <View style={styles.buttonContent}>
            <Ionicons name="add-circle-outline" size={22} color="#14b8a6" style={styles.buttonIcon} />
            <Text style={styles.actionButtonText}>Create Kitchen</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => setShowJoinModal(true)}
        >
          <View style={styles.buttonContent}>
            <Ionicons name="key-outline" size={22} color="#14b8a6" style={styles.buttonIcon} />
            <Text style={styles.actionButtonText}>Join Kitchen</Text>
          </View>
        </TouchableOpacity>
      </View>

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
              onViewRequests={(id, name) => {
                setSelectedFridge({ id, name });
                setShowRequestsModal(true);
              }}
              // Calculate logic directly against the live user object
              isActive={fridge.id === user?.active_fridge_id} 
            />
          ))
        )}
      </ScrollView>

      {switching && (
        <View style={styles.switchingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.switchingText}>Processing...</Text>
        </View>
      )}

      {/* Create Kitchen Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <CreateFridgeModal
          onClose={() => setShowCreateModal(false)}
          onSwitchToJoin={() => {
            setShowCreateModal(false);
            setShowJoinModal(true);
          }}
        />
      </Modal>

      {/* Join Kitchen Modal */}
      <Modal
        visible={showJoinModal}
        animationType="slide"
        onRequestClose={() => setShowJoinModal(false)}
      >
        <JoinFridgeModal
          onClose={() => setShowJoinModal(false)}
          onSwitchToCreate={() => {
            setShowJoinModal(false);
            setShowCreateModal(true);
          }}
        />
      </Modal>

      {/* View Requests Modal */}
      <Modal
        visible={showRequestsModal}
        animationType="slide"
        onRequestClose={() => setShowRequestsModal(false)}
      >
        {selectedFridge && (
          <ViewRequestsModal
            fridgeId={selectedFridge.id}
            fridgeName={selectedFridge.name}
            onClose={() => setShowRequestsModal(false)}
          />
        )}
      </Modal>
    </View>
  );
};

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
  closeButton: {
    position: "absolute",
    right: 20,
    top: 58,
    zIndex: 1000,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 20,
    paddingHorizontal: 20,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "white",
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  buttonIcon: {
    marginRight: 8,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1e293b",
  },
  content: {
    flex: 1,
    padding: 20,
    paddingTop: 8,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 100,
  },
  emptyText: {
    fontSize: 16,
    color: "#64748b",
    fontWeight: "500",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#64748b",
    fontWeight: "500",
  },
  fridgeCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  activeFridgeCard: {
    borderWidth: 2.5,
    borderColor: "#14b8a6",
    shadowColor: "#14b8a6",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
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
    fontSize: 22,
    fontWeight: "700",
    color: "#1e293b",
    flex: 1,
  },
  activeBadge: {
    backgroundColor: "#14b8a6",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  activeBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  fridgeId: {
    fontSize: 13,
    color: "#64748b",
    marginBottom: 12,
    fontWeight: "500",
  },
  fridgeMatesSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  fridgeMatesTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748b",
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  fridgeMateName: {
    fontSize: 14,
    color: "#475569",
    marginBottom: 6,
    marginLeft: 8,
    fontWeight: "500",
  },
  showMoreText: {
    fontSize: 14,
    color: "#14b8a6",
    fontWeight: "600",
    marginTop: 6,
    marginLeft: 8,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
  },
  switchButton: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f0fdfa",
    borderWidth: 1.5,
    borderColor: "#99f6e4",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  switchButtonText: {
    color: "#14b8a6",
    fontSize: 15,
    fontWeight: "600",
  },
  viewRequestsButton: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f0fdfa",
    borderWidth: 1.5,
    borderColor: "#99f6e4",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  viewRequestsButtonText: {
    color: "#14b8a6",
    fontSize: 15,
    fontWeight: "600",
  },
  leaveButton: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fef2f2",
    borderWidth: 1.5,
    borderColor: "#fecaca",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  leaveButtonIcon: {
    marginRight: 10,
  },
  leaveButtonText: {
    color: "#ef4444",
    fontSize: 15,
    fontWeight: "600",
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