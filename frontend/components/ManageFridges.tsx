import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import CustomButton from "./CustomButton";

interface Fridge {
  created_at: string;
  created_by: string;
  id: string;
  name: string;
}

interface ManageFridgesScreenProps {
  fridges: Fridge[];
  onClose: () => void;
  onLeaveFridge: (fridgeId: string) => void;
}

const ManageFridgesScreen = ({
  fridges,
  onClose,
  onLeaveFridge,
}: ManageFridgesScreenProps) => {
  return (
    <View style={styles.container}>
      {/* Header with X button */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Manage Fridges</Text>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Ionicons name="close-circle" size={36} color="#333" />
        </TouchableOpacity>
      </View>

      {/* ✅ ADD: Action buttons */}
      <View style={styles.actionButtons}>
        <CustomButton
          className="Create Fridge"
          onPress={() => {
            onClose(); // Close manage screen
            router.push("/(tabs)/create_fridge"); // Navigate to create fridge
          }}
          title="Create Fridge"
          style={styles.actionButton}
        />
        <CustomButton
          className="Join Fridge"
          onPress={() => {
            onClose(); // Close manage screen
            router.push("/(tabs)/Join-Fridge"); // Navigate to join fridge
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
            <View key={fridge.id} style={styles.fridgeCard}>
              <View style={styles.fridgeInfo}>
                <Text style={styles.fridgeName}>{fridge.name}</Text>
                <Text style={styles.fridgeId}>ID: {fridge.id}</Text>
              </View>
              <CustomButton
                className="Leave Fridge"
                onPress={() => onLeaveFridge(fridge.id)}
                title="Leave Fridge"
                style={styles.leaveButton}
              />
            </View>
          ))
        )}
      </ScrollView>
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
  // ✅ ADD: Action buttons styles
  actionButtons: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 20,
    paddingHorizontal: 20,
    gap: 16, // Spacing between buttons
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
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
    marginBottom: 8,
  },
  fridgeId: {
    fontSize: 14,
    color: "#666",
  },
  leaveButton: {
    width: "100%",
  },
});

export default ManageFridgesScreen;