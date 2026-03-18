from pydantic import BaseModel, Field, ConfigDict
from enum import Enum
from typing import Optional, List
from datetime import datetime

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

class FeedbackBase(BaseModel):
    rating: int = Field(..., ge=1, le=5, description="Rating from 1 to 5")
    comment: Optional[str] = None

class FeedbackCreate(FeedbackBase):
    pass

class Feedback(FeedbackBase):
    feedback_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
