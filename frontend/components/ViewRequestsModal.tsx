import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../app/utils/client";
import CustomButton from "./CustomButton";

interface FridgeRequest {
  id: string;
  fridge_id: string;
  requested_by: string;
  acceptance_status: "PENDING" | "ACCEPTED" | "REJECTED";
  created_at: string;
  users: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
  };
  fridges: {
    id: string;
    name: string;
  };
}

interface ViewRequestsModalProps {
  fridgeId: string;
  fridgeName: string;
  onClose: () => void;
}

const API_URL = process.env.EXPO_PUBLIC_API_URL;

const RequestCard = ({
  request,
  onStatusChange,
}: {
  request: FridgeRequest;
  onStatusChange: () => void;
}) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleResponse = async (status: "ACCEPTED" | "REJECTED") => {
    try {
      setIsProcessing(true);

      const endpoint =
        status === "ACCEPTED" ? "/fridge/accept-request/" : "/decline-request/";

      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        Alert.alert("Error", "Please log in again");
        return;
      }

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          request_id: request.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to process request");
      }

      const result = await response.json();

      Alert.alert("Success", result.message);
      onStatusChange();

    } catch (error) {
      console.error(
        `Error ${status === "ACCEPTED" ? "accepting" : "declining"} request:`,
        error
      );
      Alert.alert(
        "Error",
        error instanceof Error 
          ? error.message 
          : `Failed to ${status === "ACCEPTED" ? "accept" : "decline"} request`
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const getUserName = () => {
    const user = request.users;
    if (user?.first_name && user?.last_name) {
      return `${user.first_name} ${user.last_name}`;
    }
    if (user?.first_name) return user.first_name;
    return user?.email || "Unknown User";
  };

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Join Request</Text>
      <Text style={styles.cardText}>
        <Text style={styles.label}>User:</Text> {getUserName()}
      </Text>
      <Text style={styles.cardText}>
        <Text style={styles.label}>Kitchen:</Text> {request.fridges?.name || "Unknown Kitchen"}
      </Text>
      <Text style={styles.cardText}>
        <Text style={styles.label}>Email:</Text> {request.users?.email || "N/A"}
      </Text>
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[
            styles.button,
            styles.acceptButton,
            isProcessing && styles.disabledButton,
          ]}
          onPress={() => handleResponse("ACCEPTED")}
          disabled={isProcessing}
        >
          <Text style={styles.buttonText}>
            {isProcessing ? "Processing..." : "Accept"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.button,
            styles.declineButton,
            isProcessing && styles.disabledButton,
          ]}
          onPress={() => handleResponse("REJECTED")}
          disabled={isProcessing}
        >
          <Text style={styles.buttonText}>
            {isProcessing ? "Processing..." : "Decline"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const ViewRequestsModal = ({ fridgeId, fridgeName, onClose }: ViewRequestsModalProps) => {
  const [requests, setRequests] = useState<FridgeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRequests = async () => {
    try {
      if (!refreshing) setLoading(true);
      setRefreshing(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("No active session");
      }

      const response = await fetch(
        `${API_URL}/api/fridge-requests/by-fridge/${fridgeId}`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) throw new Error("Failed to fetch requests");

      const result = await response.json();
      setRequests(result.data || []);

    } catch (err) {
      console.error("Error fetching requests:", err);
      Alert.alert("Error", "Failed to load requests");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [fridgeId]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Join Requests</Text>
          <Text style={styles.headerSubtitle}>{fridgeName}</Text>
        </View>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Ionicons name="close" size={28} color="#64748b" />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={fetchRequests}
            colors={["#14b8a6"]}
            tintColor="#14b8a6"
          />
        }
      >
        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#14b8a6" />
            <Text style={styles.loadingText}>Loading requests...</Text>
          </View>
        ) : requests.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No pending requests</Text>
          </View>
        ) : (
          requests.map((request) => (
            <RequestCard
              key={request.id}
              request={request}
              onStatusChange={fetchRequests}
            />
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
  closeButton: {
    position: "absolute",
    top: 80,
    right: 20,
    zIndex: 1000,
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
    position: "relative",
  },
  headerContent: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1e293b",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#64748b",
    marginTop: 4,
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
  content: {
    flex: 1,
    padding: 20,
  },
  loadingContainer: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },
  emptyState: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#999",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  cardText: {
    fontSize: 14,
    color: "#555",
    marginBottom: 8,
  },
  label: {
    fontWeight: "600",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
    gap: 12,
  },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
  acceptButton: {
    backgroundColor: "#4CAF50",
  },
  declineButton: {
    backgroundColor: "#f44336",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  disabledButton: {
    opacity: 0.6,
  },
});

export default ViewRequestsModal;