from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from routers.users import app as users_router
from routers.fridge_items import app as fridge_items_router
from routers.invites import app as invites_router
from routers.ai_expiration import app as ai_expiration_router
from routers.receipt_parsing import app as receipt_router
from routers.shopping_list import app as shopping_router
from routers.cost_splitting import app as cost_splitting_router

load_dotenv()
app = FastAPI()

# CORS configuration
origins = [
    "http://localhost:8081",
    "http://localhost:8081",
    "http://127.0.0.1:8081",
    "http://localhost:8082",
    "http://127.0.0.1:8082",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(users_router, prefix="/users")
app.include_router(fridge_items_router, prefix="/fridge_items")
app.include_router(invites_router, prefix="/invites")
app.include_router(ai_expiration_router, prefix="/expiry")
app.include_router(receipt_router, prefix="/receipt")
app.include_router(shopping_router, prefix="/shopping")
app.include_router(cost_splitting_router, prefix="/cost_splitting")


@app.get("/")
def root():
    return {"message": "Hello from Backend from Supabase"}
