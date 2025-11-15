import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { supabase } from "../utils/client";
import { useUser } from "../hooks/useUser";

interface FridgeRequest {
  id: string;
  user_id: string;
  fridge_id: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED";
  created_at: string;
  user: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
  };
  fridge: {
    id: string;
    name: string;
  };
}

const RequestCard = ({ request }: { request: FridgeRequest }) => (
  <View style={styles.card}>
    <Text style={styles.cardTitle}>Join Request</Text>
    <Text style={styles.cardText}>
      <Text style={styles.label}>User:</Text> {request.userName}
    </Text>
    <Text style={styles.cardText}>
      <Text style={styles.label}>Fridge:</Text> {request.fridgeName}
    </Text>
    <Text style={styles.cardText}>
      <Text style={styles.label}>Requested on:</Text> {request.requestDate}
    </Text>
    <View style={styles.buttonContainer}>
      <View style={[styles.button, styles.acceptButton]}>
        <Text style={styles.buttonText}>Accept</Text>
      </View>
      <View style={[styles.button, styles.declineButton]}>
        <Text style={styles.buttonText}>Decline</Text>
      </View>
    </View>
  </View>
);

export default function RequestsScreen() {
  const { user } = useUser();
  const [requests, setRequests] = useState<FridgeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRequests = async () => {
      if (!user?.fridge_id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        console.log("Searching for requests...");
        console.log("User fridge ID:", user.fridge_id);
        const { data, error: fetchError } = await supabase
          .from("fridge_requests")
          .select(
            `
            *,
            users (id, email, first_name, last_name),
            fridges (name)
          `
          )
          .eq("fridge_id", user.fridge_id)
          .eq("acceptance_status", "PENDING");

        console.log("Full response:", data);

        if (fetchError) throw fetchError;
        console.log("Requests fetched successfully:", data);
        setRequests(data || []);
      } catch (err) {
        console.error("Error fetching requests:", err);
        setError("Failed to load requests. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, [user?.fridge_id]);

  if (loading) {
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

  if (!user?.fridge_id) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text>You are not a member of any fridge.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
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

      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Pending Join Requests</Text>
          <Text style={styles.headerSubtitle}>
            Review and manage fridge join requests
          </Text>
        </View>

        {requests.length === 0 ? (
          <View style={styles.emptyState}>
            <Text>No pending requests found.</Text>
          </View>
        ) : (
          requests.map((request) => (
            <RequestCard key={request.id} request={request} />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
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
  label: {
    fontWeight: "600",
    color: "#333",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 16,
  },
  button: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    marginLeft: 8,
    minWidth: 100,
    alignItems: "center",
  },
  acceptButton: {
    backgroundColor: "#4CAF50",
  },
  declineButton: {
    backgroundColor: "#f44336",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "500",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    color: "#f44336",
    textAlign: "center",
    padding: 20,
  },
  emptyState: {
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
  },
});
