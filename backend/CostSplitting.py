from fastapi import APIRouter, HTTPException, Depends
from database import supabase
from service import get_current_user
from typing import Dict, List

app = APIRouter()


def _simplify_debts(balances: Dict[str, float], users_map: Dict[str, dict]) -> List[dict]:
    """
    Simplify debts using a greedy algorithm to minimize number of transactions.
    
    Algorithm:
    1. Find person who owes the most (most negative balance)
    2. Find person who is owed the most (most positive balance)
    3. Settle between them with the minimum of the two amounts
    4. Repeat until all balances are ~0
    """
    # Create a working copy of balances
    working_balances = {k: v for k, v in balances.items() if abs(v) > 0.01}
    
    transactions = []
    
    while working_balances:
        # Find max debtor (most negative) and max creditor (most positive)
        max_debtor = min(working_balances.items(), key=lambda x: x[1])
        max_creditor = max(working_balances.items(), key=lambda x: x[1])
        
        debtor_id, debtor_balance = max_debtor
        creditor_id, creditor_balance = max_creditor
        
        # If both are essentially zero, we're done
        if abs(debtor_balance) < 0.01 and abs(creditor_balance) < 0.01:
            break
        
        # Calculate settlement amount (minimum of what debtor owes and creditor is owed)
        settlement_amount = min(abs(debtor_balance), abs(creditor_balance))
        
        if settlement_amount > 0.01:
            transactions.append({
                "from_user_id": debtor_id,
                "to_user_id": creditor_id,
                "from_user": users_map[debtor_id],
                "to_user": users_map[creditor_id],
                "amount": round(settlement_amount, 2)
            })
        
        # Update balances
        working_balances[debtor_id] += settlement_amount
        working_balances[creditor_id] -= settlement_amount
        
        # Remove users with zero balance
        if abs(working_balances[debtor_id]) < 0.01:
            del working_balances[debtor_id]
        if creditor_id in working_balances and abs(working_balances[creditor_id]) < 0.01:
            del working_balances[creditor_id]
    
    return transactions


@app.get("/balances")
async def get_fridge_balances(current_user=Depends(get_current_user)):
    """
    Calculate the balance for each user in the fridge with detailed breakdown.
    
    Logic:
    - Items added via receipt are shared equally among ALL fridge mates
    - Manually added items are shared among selected users (shared_by field)
    - Each user's balance shows how much they owe (negative) or are owed (positive)
    - Includes detailed breakdown of transactions between users
    """
    try:
        fridge_id = current_user.get("fridge_id") if isinstance(current_user, dict) else None
        
        if not fridge_id:
            raise HTTPException(status_code=403, detail="User has no fridge assigned")

        memberships_response = supabase.table("fridge_memberships").select(
            "users(id, email, first_name, last_name)"
        ).eq("fridge_id", fridge_id).execute()
        
        all_users = []
        if memberships_response.data:
            for membership in memberships_response.data:
                if membership.get("users"):
                    all_users.append(membership["users"])
        
        if not all_users:
            return {
                "status": "success",
                "fridge_id": fridge_id,
                "balances": []
            }
        
        user_ids = [user["id"] for user in all_users]
        
        # Create user lookup
        users_map = {user["id"]: user for user in all_users}
        
        # Get all fridge items with their metadata
        items_response = supabase.table("fridge_items").select("*").eq("fridge_id", fridge_id).execute()
        
        # Initialize balances for each user
        balances: Dict[str, float] = {user["id"]: 0.0 for user in all_users}
        
        # Track detailed transactions: transactions[debtor][creditor] = amount
        transactions: Dict[str, Dict[str, float]] = {user_id: {} for user_id in user_ids}
        
        # Track items contributing to each user's balance
        user_items: Dict[str, List[dict]] = {user_id: [] for user_id in user_ids}
        
        # Process each item
        for item in items_response.data:
            price = item.get("price", 0.0)
            added_by = item.get("added_by")
            shared_by = item.get("shared_by")  # List of user IDs or None
            
            if price <= 0 or not added_by:
                continue  # Skip items with no price or no owner
            
            # Determine who shares this item
            if shared_by is None or len(shared_by) == 0:
                # Receipt items: shared by ALL fridge mates
                sharers = user_ids
            else:
                # Manual items: shared by selected users
                sharers = shared_by
            
            if len(sharers) == 0:
                continue
            
            # Calculate cost per person (rounded down to 2 decimals)
            cost_per_person = round(price / len(sharers), 2)
            
            # Calculate total after rounding
            total_after_rounding = cost_per_person * len(sharers)
            
            # Calculate remainder (extra cents due to rounding)
            remainder = round(price - total_after_rounding, 2)
            
            # The person who added the item is owed money
            if added_by in balances:
                balances[added_by] += price
                # Track that this user paid for this item
                user_items[added_by].append({
                    "item_title": item.get("title"),
                    "price": price,
                    "type": "paid",
                    "split_with": len(sharers)
                })
            
            # Each sharer owes their portion
            for idx, sharer_id in enumerate(sharers):
                if sharer_id in balances:
                    # First person gets the extra cents
                    amount_to_pay = cost_per_person + (remainder if idx == 0 else 0)
                    balances[sharer_id] -= amount_to_pay
                    
                    # Track that this user owes for this item (only if they didn't pay for it)
                    if sharer_id != added_by:
                        user_items[sharer_id].append({
                            "item_title": item.get("title"),
                            "price": price,
                            "amount_owed": amount_to_pay,
                            "type": "shared",
                            "added_by": users_map.get(added_by, {}).get("email", "Unknown")
                        })
                    
                    # Track individual transaction (sharer owes added_by)
                    if sharer_id != added_by:  # Don't track self-transactions
                        if added_by not in transactions[sharer_id]:
                            transactions[sharer_id][added_by] = 0.0
                        transactions[sharer_id][added_by] += amount_to_pay
        
        # Format response with user details and transaction breakdown
        balance_list = []
        
        # Create a simplified settlement plan using greedy algorithm
        # This shows who should pay whom to settle all debts with minimum transactions
        simplified_transactions = _simplify_debts(balances, users_map)
        
        for user in all_users:
            user_id = user["id"]
            
            # Build breakdown list from simplified transactions
            breakdown = []
            
            for transaction in simplified_transactions:
                if transaction["from_user_id"] == user_id:
                    # This user needs to pay someone
                    breakdown.append({
                        "type": "owes",
                        "user_id": transaction["to_user_id"],
                        "email": transaction["to_user"]["email"],
                        "first_name": transaction["to_user"].get("first_name"),
                        "last_name": transaction["to_user"].get("last_name"),
                        "amount": transaction["amount"]
                    })
                elif transaction["to_user_id"] == user_id:
                    # Someone needs to pay this user
                    breakdown.append({
                        "type": "owed_by",
                        "user_id": transaction["from_user_id"],
                        "email": transaction["from_user"]["email"],
                        "first_name": transaction["from_user"].get("first_name"),
                        "last_name": transaction["from_user"].get("last_name"),
                        "amount": transaction["amount"]
                    })
            
            # Sort breakdown: owed_by first (what they're owed), then owes (what they owe)
            breakdown.sort(key=lambda x: (x["type"] == "owes", x["amount"]), reverse=False)
            
            balance_list.append({
                "user_id": user_id,
                "email": user["email"],
                "first_name": user.get("first_name"),
                "last_name": user.get("last_name"),
                "balance": round(balances[user_id], 2),
                "breakdown": breakdown,
                "items": user_items.get(user_id, [])
            })
        
        # Sort by balance (highest to lowest)
        balance_list.sort(key=lambda x: x["balance"], reverse=True)
        
        return {
            "status": "success",
            "fridge_id": fridge_id,
            "balances": balance_list
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error calculating balances: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to calculate balances: {str(e)}")
