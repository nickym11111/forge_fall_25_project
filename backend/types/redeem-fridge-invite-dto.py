from pydantic import BaseModel

# Data Transfer Object for redeem fridge invite
class RedeemFridgeInviteDTO(BaseModel):
    invite_code: str
    