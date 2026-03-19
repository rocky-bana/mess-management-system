from sqlalchemy import Column, Integer, String, Boolean, Text, Enum as SQLAlchemyEnum, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
import enum
import schemas

class MealTypeEnum(enum.Enum):
    Breakfast = 'Breakfast'
    Lunch = 'Lunch'
    Dinner = 'Dinner'

class RoleEnum(enum.Enum):
    admin = 'admin'
    contributer = 'contributer'
    reader = 'reader'

class DayOfWeekEnum(enum.Enum):
    Monday = 'Monday'
    Tuesday = 'Tuesday'
    Wednesday = 'Wednesday'
    Thursday = 'Thursday'
    Friday = 'Friday'
    Saturday = 'Saturday'
    Sunday = 'Sunday'

class MenuItem(Base):
    __tablename__ = "menu_items"

    item_id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    is_vegetarian = Column(Boolean, default=True)
    calories = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    daily_menus = relationship("DailyMenu", back_populates="menu_item", cascade="all, delete-orphan")


class DailyMenu(Base):
    __tablename__ = "daily_menu"

    menu_id = Column(Integer, primary_key=True, index=True)
    day = Column(SQLAlchemyEnum(schemas.DayOfWeek, name="day_of_week", create_type=False), nullable=False)
    meal_type = Column(SQLAlchemyEnum(schemas.MealType, name="meal_type", create_type=False), nullable=False)
    item_id = Column(Integer, ForeignKey("menu_items.item_id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    menu_item = relationship("MenuItem", back_populates="daily_menus")

class Feedback(Base):
    __tablename__ = "feedback"

    feedback_id = Column(Integer, primary_key=True, index=True)
    rating = Column(Integer, nullable=False)
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class User(Base):
    __tablename__ = "users"

    user_id = Column(Integer, primary_key=True, index=True)
    firebase_uid = Column(String(255), unique=True, index=True, nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=True)
    role = Column(SQLAlchemyEnum(RoleEnum, name="role_enum", create_type=False), nullable=False, default=RoleEnum.reader)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
