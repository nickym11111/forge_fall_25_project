import React, { useState, useCallback } from "react";
import {
  StyleSheet,
  ScrollView,
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Image,
} from "react-native";
import { supabase } from "../utils/client";
import CustomHeader from "@/components/CustomHeader";

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
  item_id?: string;
  created_at?: string;
  item_title: string;
  price?: number;
  split_with?: number;
  amount_owed?: number;
  added_by?: string;
  added_by_id?: string;
  outstanding_amount?: number;
}

interface Balance {
  user_id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  balance: number;
  breakdown: BreakdownItem[];
  items: ContributingItem[];
  last_cleared_at?: string;
  profile_photo?: string;
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
  const [payingUserId, setPayingUserId] = useState<string | null>(null);

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

  const fetchBalances = useCallback(async () => {
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
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchBalances();
    }, [fetchBalances])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchBalances();
  };

  const payBalance = async (userId: string) => {
    try {
      setPayingUserId(userId);

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        throw new Error("You must be logged in to pay balances");
      }

      const response = await fetch(
        `${API_URL}/cost-splitting/balances/${userId}/clear`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      let result: any = null;
      try {
        result = await response.json();
      } catch (parseErr) {
        console.warn("Failed to parse pay balance response", parseErr);
      }

      if (!response.ok) {
        const message =
          result?.detail || result?.message || `HTTP error! status: ${response.status}`;
        throw new Error(message);
      }

      if (result?.balances) {
        setBalances(result.balances);
      } else {
        fetchBalances();
      }
    } catch (err: any) {
      console.error("Error paying balance:", err);
    } finally {
      setPayingUserId(null);
    }
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

  const formatAmount = (value?: number): string => {
    if (value === undefined || value === null) {
      return "0.00";
    }
    return Number(value).toFixed(2);
  };

  const formatDateTime = (value?: string): string => {
    if (!value) return "";
    try {
      return new Date(value).toLocaleString();
    } catch (err) {
      console.warn("Unable to format date", err);
      return value;
    }
  };

  const fixProfilePhotoUrl = (url?: string | null): string => {
    if (!url) return "";
    if (url.includes("/object/") && !url.includes("/object/public/")) {
      return url.replace("/object/", "/object/public/");
    }
    return url;
  };

  const getInitials = (user: { first_name?: string; last_name?: string; email?: string }): string => {
    const first = user.first_name?.trim();
    const last = user.last_name?.trim();
    if (first && last) {
      return `${first[0]}${last[0]}`.toUpperCase();
    }
    if (first) {
      return first[0].toUpperCase();
    }
    if (last) {
      return last[0].toUpperCase();
    }
    if (user.email) {
      return user.email[0].toUpperCase();
    }
    return "?";
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <View style={styles.centerContainer}>
        <CustomHeader title="Settle Up"/>
        </View>
        <ActivityIndicator size="large" color="purple" />
        <Text style={styles.loadingText}>Loading balances...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <View style={{ width: "100%", alignItems: "center" }}>
        <CustomHeader title="Settle Up" />
        </View>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchBalances}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View>
        <CustomHeader title="Settle Up" />
      </View>
      
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
                  <View style={styles.userIdentity}>
                    {(() => {
                      const avatarUri = fixProfilePhotoUrl(balance.profile_photo);
                      if (avatarUri) {
                        return (
                          <Image
                            source={{ uri: avatarUri }}
                            style={styles.userAvatar}
                            accessibilityLabel={`${getDisplayName(balance)} profile photo`}
                          />
                        );
                      }
                      return (
                        <View style={styles.userAvatarFallback}>
                          <Text style={styles.userAvatarFallbackText}>
                            {getInitials(balance)}
                          </Text>
                        </View>
                      );
                    })()}
                    <Text style={styles.userName}>{getDisplayName(balance)}</Text>
                  </View>
                  <View style={styles.headerActions}>
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
                    <TouchableOpacity
                      style={[
                        styles.payButton,
                        payingUserId === balance.user_id && styles.payButtonDisabled,
                      ]}
                      onPress={() => payBalance(balance.user_id)}
                      disabled={payingUserId === balance.user_id}
                    >
                      {payingUserId === balance.user_id ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : (
                        <Text style={styles.payButtonText}>Pay</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>

                {balance.last_cleared_at && (
                  <Text style={styles.lastPaidText}>
                    Last paid {formatDateTime(balance.last_cleared_at)}
                  </Text>
                )}
                
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
                                  Outstanding ${formatAmount(item.outstanding_amount)} of ${
                                    formatAmount(item.price)
                                  }
                                  {item.split_with !== undefined && (
                                    <Text>
                                      {" "}
                                      • Split with {item.split_with}{" "}
                                      {item.split_with === 1 ? "person" : "people"}
                                    </Text>
                                  )}
                                </Text>
                              )}
                              {item.type === "shared" && (
                                <Text style={styles.itemSubtext}>
                                  Shared from {item.added_by ?? "Unknown"} • Your share: $
                                  {formatAmount(item.amount_owed)}
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
    textAlign: "center"
  },
  centerContainer: {
    width: "100%",
    flex: 1,
    backgroundColor: "#F8F9FF",
    justifyContent: "center",
    alignItems: "center",
    textAlign: "center"
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
    marginLeft: "auto",
    marginRight: "auto",
  },
  errorText: {
    fontSize: 16,
    textAlign: "center",
    color: "#dc2626",
    paddingHorizontal: 20,
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: "#14b8a6",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    shadowColor: "#0f766e",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
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
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  userName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    flexShrink: 1,
  },
  userIdentity: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 12,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: "#d1fae5",
  },
  userAvatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: "#14b8a6",
    justifyContent: "center",
    alignItems: "center",
  },
  userAvatarFallbackText: {
    color: "white",
    fontWeight: "700",
    fontSize: 16,
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
  payButton: {
    marginLeft: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: "#14b8a6",
    shadowColor: "#0f766e",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  payButtonDisabled: {
    opacity: 0.5,
  },
  payButtonText: {
    color: "#ffffff",
    fontWeight: "700",
  },
  lastPaidText: {
    fontSize: 12,
    color: "#888",
    marginBottom: 8,
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
