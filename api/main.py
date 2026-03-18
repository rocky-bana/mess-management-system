from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
from datetime import date, timedelta

import models
import schemas
from database import engine, get_db

# We don't usually call create_all if we manage schema via raw .sql files like you did.
# It's safe to run in case tables somehow don't exist yet, but won't overwrite existing tables.
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Mess Management System API")

# Configure CORS for the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"], # React Dev Server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Menu Items CRUD ---

@app.post("/menu-items/", response_model=schemas.MenuItem, tags=["Menu Items"])
def create_menu_item(item: schemas.MenuItemCreate, db: Session = Depends(get_db)):
    db_item = models.MenuItem(**item.model_dump())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

@app.get("/menu-items/", response_model=List[schemas.MenuItem], tags=["Menu Items"])
def read_menu_items(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    items = db.query(models.MenuItem).offset(skip).limit(limit).all()
    return items

@app.get("/menu-items/{item_id}", response_model=schemas.MenuItem, tags=["Menu Items"])
def read_menu_item(item_id: int, db: Session = Depends(get_db)):
    db_item = db.query(models.MenuItem).filter(models.MenuItem.item_id == item_id).first()
    if db_item is None:
        raise HTTPException(status_code=404, detail="Menu Item not found")
    return db_item

@app.put("/menu-items/{item_id}", response_model=schemas.MenuItem, tags=["Menu Items"])
def update_menu_item(item_id: int, item: schemas.MenuItemCreate, db: Session = Depends(get_db)):
    db_item = db.query(models.MenuItem).filter(models.MenuItem.item_id == item_id).first()
    if db_item is None:
        raise HTTPException(status_code=404, detail="Menu Item not found")
    
    for key, value in item.model_dump().items():
        setattr(db_item, key, value)
        
    db.commit()
    db.refresh(db_item)
    return db_item

@app.delete("/menu-items/{item_id}", status_code=204, tags=["Menu Items"])
def delete_menu_item(item_id: int, db: Session = Depends(get_db)):
    db_item = db.query(models.MenuItem).filter(models.MenuItem.item_id == item_id).first()
    if db_item is None:
        raise HTTPException(status_code=404, detail="Menu Item not found")
    db.delete(db_item)
    db.commit()
    return

# --- Daily Menu CRUD ---

@app.post("/daily-menu/", response_model=schemas.DailyMenu, tags=["Daily Menu"])
def create_daily_menu(menu: schemas.DailyMenuCreate, db: Session = Depends(get_db)):
    # Verify the item exists first
    db_item = db.query(models.MenuItem).filter(models.MenuItem.item_id == menu.item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Referenced Menu Item does not exist")

    # Check for duplicate entry (Unique constraint on Day + MealType + ItemID)
    existing_entry = db.query(models.DailyMenu).filter(
        models.DailyMenu.day == menu.day,
        models.DailyMenu.meal_type == menu.meal_type,
        models.DailyMenu.item_id == menu.item_id
    ).first()
    
    if existing_entry:
        raise HTTPException(status_code=400, detail="This item is already scheduled for this meal on this day.")

    db_menu = models.DailyMenu(**menu.model_dump())
    db.add(db_menu)
    db.commit()
    db.refresh(db_menu)
    return db_menu

@app.get("/daily-menu/", response_model=List[schemas.DailyMenu], tags=["Daily Menu"])
def read_daily_menus(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    menus = db.query(models.DailyMenu).offset(skip).limit(limit).all()
    return menus

@app.get("/daily-menu/by-day/{day}", response_model=List[schemas.DailyMenu], tags=["Daily Menu"])
def read_daily_menus_by_day(day: schemas.DayOfWeek, meal_type: schemas.MealType = None, db: Session = Depends(get_db)):
    query = db.query(models.DailyMenu).filter(models.DailyMenu.day == day)
    if meal_type:
         query = query.filter(models.DailyMenu.meal_type == meal_type)
    menus = query.all()
    return menus

@app.delete("/daily-menu/{menu_id}", status_code=204, tags=["Daily Menu"])
def delete_daily_menu(menu_id: int, db: Session = Depends(get_db)):
    db_menu = db.query(models.DailyMenu).filter(models.DailyMenu.menu_id == menu_id).first()
    if db_menu is None:
        raise HTTPException(status_code=404, detail="Daily Menu entry not found")
    db.delete(db_menu)
    db.commit()
    return

# --- Calendar API ---

@app.get("/calendar/", response_model=List[schemas.CalendarDay], tags=["Calendar"])
def get_monthly_calendar(db: Session = Depends(get_db)):
    """Generate a 30-day calendar based on the weekly repeating menu."""
    today = date.today()
    
    # fetch the weekly schedule
    weekly_menus = db.query(models.DailyMenu).all()
    
    # group by day_of_week
    schedule_by_day = {day.value: [] for day in schemas.DayOfWeek}
    for m in weekly_menus:
        schedule_by_day[m.day.value].append({
            "menu_id": m.menu_id,
            "meal_type": m.meal_type.value,
            "menu_item": m.menu_item
        })
        
    calendar = []
    for i in range(30):
        current_date = today + timedelta(days=i)
        day_name = current_date.strftime("%A") # e.g. "Monday"
        
        calendar.append({
            "date": current_date.isoformat(),
            "day_of_week": day_name,
            "meals": schedule_by_day.get(day_name, [])
        })
        
    return calendar

# --- Feedback API ---

@app.post("/feedback/", response_model=schemas.Feedback, tags=["Feedback"])
def create_feedback(feedback: schemas.FeedbackCreate, db: Session = Depends(get_db)):
    db_feedback = models.Feedback(**feedback.model_dump())
    db.add(db_feedback)
    db.commit()
    db.refresh(db_feedback)
    return db_feedback

@app.get("/feedback/", response_model=List[schemas.Feedback], tags=["Feedback"])
def read_feedback(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(models.Feedback).order_by(models.Feedback.created_at.desc()).offset(skip).limit(limit).all()

# --- Users API ---

from auth import get_current_user

@app.get("/users/me", tags=["Users"])
def read_users_me(current_user: dict = Depends(get_current_user)):
    """
    Returns the currently authenticated user's Firebase token payload.
    Requires a valid Firebase ID token in the Authorization header.
    """
    return {
        "uid": current_user.get("uid"),
        "email": current_user.get("email"),
        "name": current_user.get("name"),
    }
