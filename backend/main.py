# EXAMPLE TEMPLATE SETUP
from fastapi import FastAPI
from database import supabase  
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from Join import app as join_router
from Users import app as users_router
from typing import Optional, Any

app = FastAPI()

# Allow CORS origin policy to allow requests from local origins.
origins = [
    "http://localhost:8081", # React/Next dev server
    "http://127.0.0.1:8081",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"], # allow POST, GET, OPTIONS, etc.
    allow_headers=["*"],
)

app.include_router(join_router, prefix="/fridge")  # ← now /fridge/join works
app.include_router(users_router, prefix="/users")  # ← now /user/ endpoints work

@app.get("/")
def read_root():
    return {"message": "Hello from backend with Supabase!"}

class FridgeItem(BaseModel):
    title: str
    added_by: Optional[Any] = None  # store JSON (user info)
    shared_by: Optional[Any] = None # store JSON (list or user info)
    quantity: Optional[int] = None
    days_till_expiration: Optional[int] = None

@app.post("/fridge_items/")
def create_fridge_item(item: FridgeItem):
    try:
        response = supabase.table("fridge_items").insert({
            "title": item.title,
            "added_by": item.added_by,
            "shared_by": item.shared_by,
            "quantity": item.quantity,
            "days_till_expiration": item.days_till_expiration
        }).execute()

        return {"data": response.data, "status": "Fridge item added successfully"}
    except Exception as e:
        return {"error": str(e)}
    
@app.get("/fridge_items/")
def get_fridge_items():
    response = supabase.table("fridge_items").select("*").execute()
    return {"data": response.data}

# Gets items by user 
@app.get("/fridge_items/added-by/{user_name}")
def get_items_added_by(user_name: str):
    response = supabase.table("fridge_items") \
        .select("*") \
        .contains("added_by", {"name": user_name}) \
        .execute()
    return {"data": response.data}


# Get items expiring soon
@app.get("/fridge_items/expiring-soon/")
def get_expiring_items():
    response = supabase.table("fridge_items") \
        .select("*") \
        .lte("days_till_expiration", 3) \
        .execute()
    return {"data": response.data}

# Delete an item 
@app.delete("/fridge_items/{item_id}")
def delete_fridge_item(item_id: int):
    response = supabase.table("fridge_items").delete().eq("id", item_id).execute()
    return {"data": response.data}#TEMPLATE to get started :)
@app.post("/users")
def create_user(name: str, email: str):
    response = supabase.table("users").insert({"name": name, "email": email}).execute()
    return {"data": response.data, "error": response.error}

@app.get("/users")
def get_users():
    response = supabase.table("users").select("*").execute()
    print(response)
    return {"data": response.data}

class UserCreate(BaseModel):
    email: str
    password: str
    firstName: str | None = None
    lastName: str | None = None
    dietaryRestrictions: list[str] | None = None
    
    
def findAccount(email: str):
    response = supabase.auth.get_user(email)
    return response

@app.post("/sign-up/")
async def create_user(user: UserCreate):
    try:
        # Example of using the database session
        supabase.auth.sign_up({
            "email": user.email,
            "password": user.password,
            "options": {
                "data": {
                    "first_name": user.firstName,
                    "last_name": user.lastName,
                    "dietary_restrictions": user.dietaryRestrictions
                },
                "email_redirect_to": "http://localhost:8081/" # Redirect to this URL after email confirmation
            }
        })
        return {"email": user.email, 
                "firstName": user.firstName,
                "lastName": user.lastName,
                "dietaryRestrictions": user.dietaryRestrictions,
                "status": "User created successfully"}
    except Exception as e:
        return {"error": str(e)}
    
class UserLogin(BaseModel):
    email: str
    password: str

@app.post("/log-in/")
async def login_user(user: UserLogin):
    try:
        res = supabase.auth.sign_in_with_password({
            "email": user.email,
            "password": user.password
        })

        # The response contains user + session data if valid
        return {
            "user": res.user,
            "session": res.session,  # includes access_token, refresh_token, etc.
            "status": "Login successful"
        }
    except Exception as e:
        return {"error": str(e)}

