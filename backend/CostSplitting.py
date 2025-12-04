from fastapi import APIRouter, HTTPException, Depends
from database import supabase
from service import get_current_user
from typing import Dict, List, Optional, Any
from collections import defaultdict
from datetime import datetime, timezone

app = APIRouter()

SETTLEMENT_TABLE = "cost_balance_settlements"
AMOUNT_TOLERANCE = 0.01


def _round_currency(value: float) -> float:
    result = round(float(value) + 1e-9, 2)
    if abs(result) < AMOUNT_TOLERANCE:
        return 0.0
    return result


def _parse_iso_datetime(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    try:
        if isinstance(value, datetime):
            dt = value
        else:
            text = value
            if text.endswith("Z"):
                text = text[:-1] + "+00:00"
            dt = datetime.fromisoformat(text)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except Exception:
        return None


def _format_iso_datetime(value: Optional[datetime]) -> Optional[str]:
    if not value:
        return None
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc).isoformat()


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
    
    print(f"DEBUG: Starting debt simplification. Initial balances: {working_balances}")
    total_balance = sum(working_balances.values())
    print(f"DEBUG: Sum of balances: {total_balance}")
    
    if abs(total_balance) > 0.1:
        print(f"WARNING: Balances do not sum to zero (sum={total_balance}). This may cause issues.")
    
    transactions = []
    
    loop_count = 0
    MAX_LOOPS = 100
    
    while working_balances:
        loop_count += 1
        if loop_count > MAX_LOOPS:
            print(f"CRITICAL: Infinite loop detected in debt simplification. Breaking after {MAX_LOOPS} iterations.")
            print(f"Current working balances: {working_balances}")
            break
            
        # Find max debtor (most negative) and max creditor (most positive)
        max_debtor = min(working_balances.items(), key=lambda x: x[1])
        max_creditor = max(working_balances.items(), key=lambda x: x[1])

        debtor_id, debtor_balance = max_debtor
        creditor_id, creditor_balance = max_creditor

        if abs(debtor_balance) <= AMOUNT_TOLERANCE and abs(creditor_balance) <= AMOUNT_TOLERANCE:
            break

        settlement_amount = min(abs(debtor_balance), abs(creditor_balance))
        settlement_amount = _round_currency(settlement_amount)

        if settlement_amount > AMOUNT_TOLERANCE:
            transactions.append({
                "from_user_id": debtor_id,
                "to_user_id": creditor_id,
                "from_user": users_map.get(debtor_id, {"email": "Unknown", "first_name": "Unknown"}),
                "to_user": users_map.get(creditor_id, {"email": "Unknown", "first_name": "Unknown"}),
                "amount": round(settlement_amount, 2)
            })

        working_balances[debtor_id] = working_balances.get(debtor_id, 0.0) + settlement_amount
        working_balances[creditor_id] = working_balances.get(creditor_id, 0.0) - settlement_amount

        if abs(working_balances.get(debtor_id, 0.0)) <= AMOUNT_TOLERANCE and debtor_id in working_balances:
            del working_balances[debtor_id]
        if abs(working_balances.get(creditor_id, 0.0)) <= AMOUNT_TOLERANCE and creditor_id in working_balances:
            del working_balances[creditor_id]

    return transactions


def _calculate_fridge_balances(fridge_id: str) -> Dict[str, Any]:
    memberships_response = supabase.table("fridge_memberships").select(
        "users(id, email, first_name, last_name, profile_photo)"
    ).eq("fridge_id", fridge_id).execute()

    all_users: List[dict] = []
    if memberships_response.data:
        for membership in memberships_response.data:
            user_data = membership.get("users")
            if user_data:
                all_users.append(user_data)

    if not all_users:
        return {
            "balances": [],
            "users_map": {},
            "pair_totals": {},
            "balances_map": {},
            "latest_clears": {},
        }

    users_map: Dict[str, dict] = {}
    for user in all_users:
        user_id = user.get("id")
        if not user_id:
            continue
        users_map[user_id] = {
            **user,
            "profile_photo": user.get("profile_photo"),
        }
    user_ids = list(users_map.keys())

    if not user_ids:
        return {
            "balances": [],
            "users_map": {},
            "pair_totals": {},
            "balances_map": {},
            "latest_clears": {},
        }

    items_response = supabase.table("fridge_items").select("*").eq("fridge_id", fridge_id).execute()
    items = items_response.data or []

    settlements: List[dict] = []
    try:
        settlements_response = (
            supabase.table(SETTLEMENT_TABLE)
            .select("id, fridge_id, from_user_id, to_user_id, amount, cleared_at, created_at")
            .eq("fridge_id", fridge_id)
            .order("cleared_at", desc=False)
            .execute()
        )
        settlements = settlements_response.data or []
    except Exception as exc:
        print(f"Warning: unable to fetch settlements for fridge {fridge_id}: {exc}")
        settlements = []

    latest_clears: Dict[str, datetime] = {}
    for settlement in settlements:
        timestamp = settlement.get("cleared_at") or settlement.get("created_at")
        parsed_ts = _parse_iso_datetime(timestamp)
        if not parsed_ts:
            continue
        for key in ("from_user_id", "to_user_id"):
            uid = settlement.get(key)
            if not uid:
                continue
            existing = latest_clears.get(uid)
            if not existing or parsed_ts > existing:
                latest_clears[uid] = parsed_ts

    pair_contributions: Dict[str, Dict[str, List[dict]]] = defaultdict(lambda: defaultdict(list))
    item_details: Dict[str, dict] = {}
    valid_user_set = set(user_ids)

    for item in items:
        try:
            price = float(item.get("price") or 0.0)
        except (TypeError, ValueError):
            price = 0.0

        if price <= AMOUNT_TOLERANCE:
            continue

        added_by = item.get("added_by")
        if not added_by or added_by not in valid_user_set:
            continue

        shared_by_raw = item.get("shared_by")
        if shared_by_raw in (None, [], {}):
            potential_sharers = list(user_ids)
        else:
            potential_sharers = shared_by_raw

        if isinstance(potential_sharers, str):
            potential_sharers = [potential_sharers]
        elif isinstance(potential_sharers, dict):
            potential_sharers = list(potential_sharers.values())
        elif not isinstance(potential_sharers, list):
            potential_sharers = list(potential_sharers)

        valid_sharers = [uid for uid in potential_sharers if uid in valid_user_set]
        if not valid_sharers:
            continue

        cost_per_person = round(price / len(valid_sharers), 2)
        total_after_rounding = cost_per_person * len(valid_sharers)
        remainder = round(price - total_after_rounding, 2)

        item_id = item.get("id")
        if not item_id:
            fallback_created_at = item.get("created_at") or ""
            item_id = f"{added_by}-{fallback_created_at}"

        item_title = item.get("title") or item.get("name") or "Item"
        created_at = item.get("created_at")
        item_details[item_id] = {
            "title": item_title,
            "price": _round_currency(price),
            "split_with": len(valid_sharers),
            "created_at": created_at,
            "added_by_id": added_by,
        }

        remainder_applied = False
        for sharer_id in valid_sharers:
            amount_to_pay = cost_per_person
            if not remainder_applied and abs(remainder) > AMOUNT_TOLERANCE:
                amount_to_pay = round(amount_to_pay + remainder, 2)
                remainder_applied = True

            amount_to_pay = round(amount_to_pay, 2)
            if amount_to_pay <= AMOUNT_TOLERANCE:
                continue

            if sharer_id == added_by:
                continue

            pair_contributions[sharer_id][added_by].append({
                "item_id": item_id,
                "item_title": item_title,
                "amount_original": amount_to_pay,
                "amount_remaining": amount_to_pay,
                "created_at": created_at,
                "added_by_id": added_by,
            })

    fallback_dt = datetime(1970, 1, 1, tzinfo=timezone.utc)
    for creditors_map in pair_contributions.values():
        for contributions_list in creditors_map.values():
            contributions_list.sort(
                key=lambda entry: _parse_iso_datetime(entry.get("created_at")) or fallback_dt
            )

    for settlement in settlements:
        from_id = settlement.get("from_user_id")
        to_id = settlement.get("to_user_id")
        try:
            amount = float(settlement.get("amount") or 0.0)
        except (TypeError, ValueError):
            amount = 0.0

        amount = _round_currency(amount)
        if amount <= AMOUNT_TOLERANCE:
            continue

        debtor_map = pair_contributions.get(from_id)
        if not debtor_map:
            continue

        contributions_list = debtor_map.get(to_id)
        if not contributions_list:
            continue

        remaining_amount = amount
        for contribution in contributions_list:
            if remaining_amount <= AMOUNT_TOLERANCE:
                break

            current_remaining = _round_currency(contribution.get("amount_remaining", 0.0))
            if current_remaining <= AMOUNT_TOLERANCE:
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
            else:
                print(f"WARNING: Item {item.get('title')} added by user {added_by} who is not in the fridge. Adding to balances anyway.")
                balances[added_by] = balances.get(added_by, 0.0) + price
                # We need to add them to users_map so we don't crash later
                if added_by not in users_map:
                    # Try to fetch this user info
                    try:
                        user_resp = supabase.table("users").select("id, email, first_name, last_name").eq("id", added_by).execute()
                        if user_resp.data:
                            users_map[added_by] = user_resp.data[0]
                            all_users.append(user_resp.data[0])
                            user_ids.append(added_by)
                            user_items[added_by] = []
                            transactions[added_by] = {}
                    except Exception as e:
                        print(f"Error fetching missing user {added_by}: {e}")
                        users_map[added_by] = {"id": added_by, "email": "Unknown", "first_name": "Unknown"}
            
            # Each sharer owes their portion
            for idx, sharer_id in enumerate(sharers):
                # Handle missing sharers (e.g. ex-members)
                if sharer_id not in balances:
                    print(f"WARNING: Sharer {sharer_id} for item {item.get('title')} is not in the fridge. Adding to balances.")
                    balances[sharer_id] = 0.0
                    # Add to users_map and other structures
                    if sharer_id not in users_map:
                        try:
                            user_resp = supabase.table("users").select("id, email, first_name, last_name").eq("id", sharer_id).execute()
                            if user_resp.data:
                                users_map[sharer_id] = user_resp.data[0]
                                all_users.append(user_resp.data[0])
                                user_ids.append(sharer_id)
                                user_items[sharer_id] = []
                                transactions[sharer_id] = {}
                        except Exception as e:
                            print(f"Error fetching missing sharer {sharer_id}: {e}")
                            users_map[sharer_id] = {"id": sharer_id, "email": "Unknown", "first_name": "Unknown"}
                            # Ensure structures exist even if fetch fails
                            if sharer_id not in user_items: user_items[sharer_id] = []
                            if sharer_id not in transactions: transactions[sharer_id] = {}

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
            "balances": result["balances"],
        }

    except HTTPException:
        raise
    except Exception as exc:
        print(f"Error calculating balances: {exc}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to calculate balances: {exc}")


@app.post("/balances/{user_id}/clear")
async def clear_user_balance(user_id: str, current_user=Depends(get_current_user)):
    try:
        fridge_id = current_user.get("fridge_id") if isinstance(current_user, dict) else None

        if not fridge_id:
            raise HTTPException(status_code=403, detail="User has no fridge assigned")

        calculation = _calculate_fridge_balances(fridge_id)
        users_map = calculation["users_map"]

        if user_id not in users_map:
            raise HTTPException(status_code=404, detail="User not found in this fridge")

        pair_totals = calculation["pair_totals"]

        settlements_to_insert: List[dict] = []
        timestamp = datetime.now(timezone.utc).isoformat()
        for to_user_id, amount in pair_totals.get(user_id, {}).items():
            amount = _round_currency(amount)
            if amount <= AMOUNT_TOLERANCE:
                continue

            payload = {
                "fridge_id": fridge_id,
                "from_user_id": user_id,
                "to_user_id": to_user_id,
                "amount": amount,
                "cleared_at": timestamp,
            }

            settlements_to_insert.append(payload)

        for debtor_id, creditors in pair_totals.items():
            if debtor_id == user_id:
                continue

            amount = creditors.get(user_id)
            if amount:
                amount = _round_currency(amount)
                if amount > AMOUNT_TOLERANCE:
                    payload = {
                        "fridge_id": fridge_id,
                        "from_user_id": debtor_id,
                        "to_user_id": user_id,
                        "amount": amount,
                        "cleared_at": timestamp,
                    }

                    settlements_to_insert.append(payload)

        if not settlements_to_insert:
            return {
                "status": "success",
                "message": "Balance is already paid for this user.",
                "balances": calculation["balances"],
                "cleared_user_id": user_id,
            }

        try:
            supabase.table(SETTLEMENT_TABLE).insert(settlements_to_insert).execute()
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"Failed to record settlements: {exc}")

        updated = _calculate_fridge_balances(fridge_id)

        return {
            "status": "success",
            "message": f"Marked balance as paid for user {user_id}",
            "balances": updated["balances"],
            "cleared_user_id": user_id,
            "cleared_at": timestamp,
        }

    except HTTPException:
        raise
    except Exception as exc:
        print(f"Error clearing balance for user {user_id}: {exc}")
        import traceback
        traceback.print_exc()
    raise HTTPException(status_code=500, detail=f"Failed to mark balance as paid: {exc}")
