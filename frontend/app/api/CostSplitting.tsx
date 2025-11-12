const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000";

export interface BreakdownItem {
  type: "owes" | "owed_by";
  user_id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  amount: number;
}

export interface ContributingItem {
  type: "paid" | "shared";
  item_title: string;
  price: number;
  split_with?: number;
  amount_owed?: number;
  added_by?: string;
}

export interface Balance {
  user_id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  balance: number;
  breakdown: BreakdownItem[];
  items: ContributingItem[];
}

export interface BalanceResponse {
  status: string;
  fridge_id: string;
  balances: Balance[];
}

export async function fetchBalances(accessToken: string): Promise<BalanceResponse> {
  const response = await fetch(`${API_URL}/cost-splitting/balances`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}
