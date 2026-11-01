from pydantic import BaseModel, Field, ConfigDict, field_validator
from enum import Enum
from typing import Optional, List
from datetime import date, datetime, timedelta, timezone

class RoleEnum(str, Enum):
    admin = 'admin'
    contributer = 'contributer'
    reader = 'reader'

class MealType(str, Enum):
    Breakfast = 'Breakfast'
    Lunch = 'Lunch'
    Dinner = 'Dinner'

class DayOfWeek(str, Enum):
    Monday = 'Monday'
    Tuesday = 'Tuesday'
    Wednesday = 'Wednesday'
    Thursday = 'Thursday'
    Friday = 'Friday'
    Saturday = 'Saturday'
    Sunday = 'Sunday'

# --- Menu Items ---

class MenuItemBase(BaseModel):
    name: str = Field(..., max_length=255)
    description: Optional[str] = None
    is_vegetarian: bool = True
    calories: Optional[int] = None

class MenuItemCreate(MenuItemBase):
    pass

class MenuItem(MenuItemBase):
    item_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

# --- Daily Menu Schedule ---

class DailyMenuBase(BaseModel):
    day: DayOfWeek
    meal_type: MealType
    item_id: int

class DailyMenuCreate(DailyMenuBase):
    pass

class DailyMenu(DailyMenuBase):
    menu_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class CalendarMeal(BaseModel):
    menu_id: int
    meal_type: MealType
    menu_item: MenuItem

    model_config = ConfigDict(from_attributes=True)

class CalendarDay(BaseModel):
    date: str
    day_of_week: DayOfWeek
    meals: List[CalendarMeal]

    model_config = ConfigDict(from_attributes=True)

# --- Feedback ---

FEEDBACK_LOOKBACK_DAYS = 13

def today_ist() -> date:
    """Today's date in India Standard Time (UTC+05:30)."""
    return datetime.now(timezone(timedelta(hours=5, minutes=30))).date()

class FeedbackBase(BaseModel):
    rating: int = Field(..., ge=1, le=5, description="Rating from 1 to 5")
    comment: Optional[str] = None
    meal_date: date
    meal_type: Optional[MealType] = None

class FeedbackCreate(FeedbackBase):
    @field_validator("meal_date")
    @classmethod
    def check_meal_date_window(cls, value: date) -> date:
        today = today_ist()
        if value > today:
            raise ValueError("Feedback cannot be given for a future date")
        if value < today - timedelta(days=FEEDBACK_LOOKBACK_DAYS):
            raise ValueError("Feedback can only be given for the last 2 weeks")
        return value

class FeedbackUpdate(BaseModel):
    rating: int = Field(..., ge=1, le=5, description="Rating from 1 to 5")
    comment: Optional[str] = None

class Feedback(FeedbackBase):
    feedback_id: int
    user_id: Optional[int] = None
    user_name: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# --- Users ---

class UserBase(BaseModel):
    name: Optional[str] = None

class UserCreate(UserBase):
    firebase_uid: str
    email: str
    role: Optional[RoleEnum] = RoleEnum.reader

class UserUpdateProfile(BaseModel):
    name: str

class UserUpdateRole(BaseModel):
    role: RoleEnum

class User(UserBase):
    user_id: int
    firebase_uid: str
    email: str
    role: RoleEnum
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
