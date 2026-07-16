from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional

class SignUpRequest(BaseModel):
    name: str
    email: EmailStr
    phone: str
    age: int
    password: str
    profession: str

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, value):
        if not (value.isdigit() and len(value) in (8, 10)):
            raise ValueError("Invalid phone number")
        return value


class SignInRequest(BaseModel):
    username: str  # email or phone
    password: str
    ip:Optional[str]=None
    lat:Optional[str]=None
    long:Optional[str]=None
    
class ChangePasswordRequest(BaseModel):
    user_id: int
    current_password: str
    new_password: str
    
class SessionCreate(BaseModel):
    user_id: int
    title: str


class SessionUpdate(BaseModel):
    title: str

class MessageCreate(BaseModel):
    user_id:int
    session_id: int
    sender:str
    content: str

class MessageUpdate(BaseModel):
    content: str

class MessageReaction(BaseModel):
    reaction: Optional[str] = None
    
class JournalEntryCreate(BaseModel):
    user_id: int
    session_id: Optional[int] = None
    entry_date: str
    content: str

class JournalEntryUpdate(BaseModel):
    user_id: int
    content: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    email: EmailStr
    otp: str
    new_password: str
    
class ResendVerificationRequest(BaseModel):
    email: EmailStr