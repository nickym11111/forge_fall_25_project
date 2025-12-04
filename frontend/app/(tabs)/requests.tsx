import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  RefreshControl,
  SafeAreaView,
} from "react-native";
import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { supabase } from "../utils/client";
import { useUser } from "../hooks/useUser";

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
  // Add these fields to match your UI expectations
  user?: {
    id: string;
    first_name: string;
    last_name: string;
  };
  fridge?: {
    name: string;
  };
}

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

      const API_URL = `${process.env.EXPO_PUBLIC_API_URL}`;

      const endpoint =
        status === "ACCEPTED" ? "/fridge/accept-request/" : "/decline-request/";

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${
            (
              await supabase.auth.getSession()
            ).data.session?.access_token
          }`,
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

      // Show success message
      Alert.alert("Success", result.message);

      // Refresh the requests list
      onStatusChange();
    } catch (error) {
      console.error(
        `Error ${status === "ACCEPTED" ? "accepting" : "declining"} request:`,
        error
      );
      Alert.alert(
        "Error",
        (error as Error)?.message ||
          `Failed to ${
            status === "ACCEPTED" ? "accept" : "decline"
          } request. Please try again.`
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Join Request</Text>
      <Text style={styles.cardText}>
        <Text style={styles.cardLabel}>User:</Text>{" "}
        {request.user?.first_name || "Unknown User"}
      </Text>
      <Text style={styles.cardText}>
        <Text style={styles.cardLabel}>Fridge:</Text>{" "}
        {request.fridge?.name || "Unknown Fridge"}
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

export default function RequestsScreen() {
  const { user } = useUser();
  const [requests, setRequests] = useState<FridgeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRequests = async () => {
    if (!user?.fridge_id) {
      setLoading(false);
      return;
    }

    try {
      setRefreshing(true);
      if (!refreshing) setLoading(true);

      console.log("Searching for requests...");
      console.log("User fridge ID:", user.fridge_id);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("No active session");
      }

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/api/fridge-requests/pending`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch requests");
      }

      const result = await response.json();
      setRequests(result.data || []);
      setError(null);
    } catch (err) {
      console.error("Error fetching requests:", err);
      setError("Failed to load requests. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [user?.fridge_id]);

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#f4511e" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  const handleStatusChange = () => {
    fetchRequests();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#f4511e" />
      <Stack.Screen
        options={{
          title: "Join Requests",
          headerStyle: {
            backgroundColor: "#f4511e",
          },
          headerTintColor: "#fff",
          headerTitleStyle: {
            fontWeight: "bold",
          },
        }}
      />

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={fetchRequests}
            colors={["#f4511e"]}
            tintColor="#f4511e"
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Pending Join Requests</Text>
          <Text style={styles.headerSubtitle}>
            Review and manage fridge join requests
          </Text>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#f4511e" />
          </View>
        ) : requests.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.emptyStateText}>No pending requests found.</Text>
          </View>
        ) : (
          requests.map((request) => (
            <RequestCard
              key={request.id}
              request={request}
              onStatusChange={handleStatusChange}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  scrollView: {
    padding: 16,
  },
  header: {
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#666",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
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
  errorText: {
    color: "#f44336",
    textAlign: "center",
  },
  disabledButton: {
    opacity: 0.6,
  },
  loadingContainer: {
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  cardLabel: {
    fontWeight: "600",
    color: "#333",
  },
  emptyStateText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
});
