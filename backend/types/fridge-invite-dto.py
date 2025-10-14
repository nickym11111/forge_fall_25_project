from pydantic import BaseModel

# Data Transfer Object for fridge invite
class FridgeInviteDTO(BaseModel):
    fridge_id: int
    email_to: str
    invited_by: str
    invite_code: str