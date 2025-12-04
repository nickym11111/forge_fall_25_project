import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  ScrollView,
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { supabase } from "../utils/client";
import CustomHeader from "@/components/CustomHeader";
import ProfileIcon from "@/components/ProfileIcon";

const API_URL = `${process.env.EXPO_PUBLIC_API_URL}`;

interface BreakdownItem {
  type: "owes" | "owed_by";
  user_id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  amount: number;
}

interface ContributingItem {
  type: "paid" | "shared";
  item_title: string;
  price: number;
  split_with?: number;
  amount_owed?: number;
  added_by?: string;
}

interface Balance {
  user_id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  balance: number;
  breakdown: BreakdownItem[];
  items: ContributingItem[];
}

interface BalanceResponse {
  status: string;
  fridge_id: string;
  balances: Balance[];
}

export default function SettleUpScreen() {
  const [balances, setBalances] = useState<Balance[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string>("");
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchBalances();
  }, []);

  const toggleItemsExpanded = (userId: string) => {
    setExpandedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const fetchBalances = async () => {
    try {
      setLoading(true);
      setError("");

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        throw new Error("You must be logged in to view balances");
      }

      const response = await fetch(`${API_URL}/cost-splitting/balances`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const result: BalanceResponse = await response.json();
      setBalances(result.balances);
    } catch (err) {
      console.error("Error fetching balances:", err);
      setError(`${err}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchBalances();
  };

  const getDisplayName = (balance: Balance | BreakdownItem): string => {
    if (balance.first_name && balance.last_name) {
      return `${balance.first_name} ${balance.last_name}`;
    }
    if (balance.first_name) return balance.first_name;
    if (balance.last_name) return balance.last_name;
    return balance.email;
  };

  const formatBalance = (amount: number): string => {
    const absAmount = Math.abs(amount).toFixed(2);
    // Add minus sign for negative amounts (what they owe)
    return amount < 0 ? `-$${absAmount}` : `$${absAmount}`;
  };

  const getBalanceColor = (amount: number): string => {
    if (amount > 0) return "#4CAF50"; // Green for positive (owed to them)
    if (amount < 0) return "#F44336"; // Red for negative (they owe)
    return "#666"; // Gray for zero
  };

  const getBalanceText = (amount: number): string => {
    if (amount > 0) return "is owed";
    if (amount < 0) return "owes";
    return "settled";
  };

  // Remove full screen loading - show header and load in background

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <CustomHeader title="Settle Up 💰" />
        <ProfileIcon className="profileIcon" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchBalances}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <CustomHeader title="Settle Up 💰" />
        <ProfileIcon className="profileIcon" />
      </View>
      {loading && !refreshing && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color="#14b8a6" />
        </View>
      )}
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {balances.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              No items with prices yet!
            </Text>
            <Text style={styles.emptyStateSubtext}>
              Add items with prices to see balances here.
            </Text>
          </View>
        ) : (
          <View style={styles.balanceList}>
            {balances.map((balance) => (
              <View key={balance.user_id} style={styles.balanceCard}>
                <View style={styles.balanceCardHeader}>
                  <Text style={styles.userName}>{getDisplayName(balance)}</Text>
                  <View
                    style={[
                      styles.balanceBadge,
                      { backgroundColor: getBalanceColor(balance.balance) },
                    ]}
                  >
                    <Text style={styles.balanceAmount}>
                      {formatBalance(balance.balance)}
                    </Text>
                  </View>
                </View>
                
                {/* Detailed Breakdown */}
                {balance.breakdown && balance.breakdown.length > 0 && (
                  <View style={styles.breakdownContainer}>
                    <Text style={styles.breakdownTitle}>Details:</Text>
                    {balance.breakdown.map((item, index) => (
                      <View key={index} style={styles.breakdownItem}>
                        <Text style={styles.breakdownText}>
                          {item.type === "owes" ? "→ Owes " : "← Owed by "}
                          <Text style={styles.breakdownName}>
                            {getDisplayName(item)}
                          </Text>
                        </Text>
                        <Text
                          style={[
                            styles.breakdownAmount,
                            item.type === "owes"
                              ? styles.breakdownOwes
                              : styles.breakdownOwed,
                          ]}
                        >
                          ${item.amount.toFixed(2)}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Contributing Items */}
                {balance.items && balance.items.length > 0 && (
                  <View style={styles.itemsContainer}>
                    <TouchableOpacity
                      onPress={() => toggleItemsExpanded(balance.user_id)}
                      style={styles.itemsHeaderButton}
                    >
                      <Text style={styles.itemsTitle}>
                        Contributing Items ({balance.items.length})
                      </Text>
                      <Text style={styles.expandIcon}>
                        {expandedItems.has(balance.user_id) ? "▼" : "▶"}
                      </Text>
                    </TouchableOpacity>

                    {expandedItems.has(balance.user_id) && (
                      <View style={styles.itemsList}>
                        {balance.items.map((item, index) => (
                          <View key={index} style={styles.itemRow}>
                            <View style={styles.itemMainInfo}>
                              <Text style={styles.itemTitle}>
                                {item.item_title}
                              </Text>
                              {item.type === "paid" && (
                                <Text style={styles.itemSubtext}>
                                  Paid ${item.price.toFixed(2)} • Split with{" "}
                                  {item.split_with} {item.split_with === 1 ? "person" : "people"}
                                </Text>
                              )}
                              {item.type === "shared" && (
                                <Text style={styles.itemSubtext}>
                                  Shared from {item.added_by} • Your share: $
                                  {item.amount_owed?.toFixed(2)}
                                </Text>
                              )}
                            </View>
                            <View
                              style={[
                                styles.itemTypeBadge,
                                item.type === "paid"
                                  ? styles.paidBadge
                                  : styles.sharedBadge,
                              ]}
                            >
                              <Text style={styles.itemTypeText}>
                                {item.type === "paid" ? "PAID" : "SHARED"}
                              </Text>
                            </View>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FF",
  },
  headerContainer: {
    position: "relative",
  },
  centerContainer: {
    width: "100%",
    flex: 1,
    backgroundColor: "#F8F9FF",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingOverlay: {
    position: "absolute",
    top: 100,
    right: 20,
    zIndex: 1000,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
  errorText: {
    color: "#F44336",
    fontSize: 16,
    textAlign: "center",
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: "purple",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  emptyState: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 32,
    alignItems: "center",
    marginVertical: 16,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#666",
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
  },
  balanceList: {
    marginBottom: 16,
  },
  balanceCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  balanceCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  userName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    flex: 1,
  },
  balanceBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  balanceAmount: {
    fontSize: 16,
    fontWeight: "bold",
    color: "white",
  },
  balanceStatus: {
    fontSize: 14,
    color: "#666",
  },
  breakdownContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  breakdownTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  breakdownItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
    paddingLeft: 8,
  },
  breakdownText: {
    fontSize: 13,
    color: "#666",
    flex: 1,
  },
  breakdownName: {
    fontWeight: "600",
    color: "#333",
  },
  breakdownAmount: {
    fontSize: 13,
    fontWeight: "600",
    marginLeft: 8,
  },
  breakdownOwes: {
    color: "#F44336",
  },
  breakdownOwed: {
    color: "#4CAF50",
  },
  itemsContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  itemsHeaderButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  itemsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  expandIcon: {
    fontSize: 12,
    color: "#666",
  },
  itemsList: {
    marginTop: 8,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 8,
    backgroundColor: "#F8F9FF",
    borderRadius: 6,
    marginBottom: 6,
  },
  itemMainInfo: {
    flex: 1,
    marginRight: 8,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
    marginBottom: 2,
  },
  itemSubtext: {
    fontSize: 11,
    color: "#666",
  },
  itemTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  paidBadge: {
    backgroundColor: "#4CAF50",
  },
  sharedBadge: {
    backgroundColor: "#2196F3",
  },
  itemTypeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "white",
  },
});
