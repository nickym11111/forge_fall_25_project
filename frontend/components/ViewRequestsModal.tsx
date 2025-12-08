import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../app/utils/client";
import CustomButton from "./CustomButton";
import { CustomAlert } from "./CustomAlert";

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

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        CustomAlert.alert("Error", "Please log in again");
        return;
      }

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
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

      CustomAlert.alert("Success", result.message);
      onStatusChange();
    } catch (error) {
      console.error(
        `Error ${status === "ACCEPTED" ? "accepting" : "declining"} request:`,
        error
      );
      CustomAlert.alert(
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
    console.log(request);
    const user = request.users;
    if (user?.first_name && user?.last_name) {
      return `${user.first_name} ${user.last_name}`;
    }
    if (user?.first_name) return user.first_name;
    return user?.email || "Unknown User";
  };

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Ionicons name="person-add-outline" size={24} color="#14b8a6" />
      <Text style={styles.cardTitle}>Join Request</Text>
      </View>
      
      <View style={styles.infoSection}>
        <View style={styles.infoRow}>
          <Ionicons name="person-outline" size={18} color="#64748b" style={styles.infoIcon} />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>User</Text>
            <Text style={styles.infoValue}>{getUserName()}</Text>
          </View>
        </View>
        
        <View style={styles.infoRow}>
          <Ionicons name="mail-outline" size={18} color="#64748b" style={styles.infoIcon} />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{request.users?.email || "N/A"}</Text>
          </View>
        </View>
      </View>

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
          {isProcessing ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={20} color="#ffffff" style={styles.buttonIcon} />
              <Text style={styles.buttonText}>Accept</Text>
            </>
          )}
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
          {isProcessing ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <Ionicons name="close-circle-outline" size={20} color="#ffffff" style={styles.buttonIcon} />
              <Text style={styles.buttonText}>Decline</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const ViewRequestsModal = ({
  fridgeId,
  fridgeName,
  onClose,
}: ViewRequestsModalProps) => {
  const [requests, setRequests] = useState<FridgeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRequests = async () => {
    try {
      if (!refreshing) setLoading(true);
      setRefreshing(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();
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
      CustomAlert.alert("Error", "Failed to load requests");
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
            <Ionicons name="document-text-outline" size={64} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>No Pending Requests</Text>
            <Text style={styles.emptyText}>There are no join requests for this kitchen at the moment.</Text>
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
    padding: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#64748b",
    fontWeight: "500",
  },
  emptyState: {
    padding: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1e293b",
    marginTop: 20,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 20,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 24,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1e293b",
    marginLeft: 12,
  },
  infoSection: {
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  infoIcon: {
    marginTop: 2,
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748b",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: "500",
    color: "#1e293b",
    lineHeight: 22,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    gap: 12,
  },
  button: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    minHeight: 48,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  acceptButton: {
    backgroundColor: "#14b8a6",
  },
  declineButton: {
    backgroundColor: "#ef4444",
  },
  buttonIcon: {
    marginRight: 8,
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
