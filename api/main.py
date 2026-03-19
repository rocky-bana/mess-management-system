from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
from datetime import date, timedelta

import models
import schemas
from database import engine, get_db
from auth import get_current_user, get_current_db_user


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
def create_daily_menu(menu: schemas.DailyMenuCreate, db: Session = Depends(get_db), current_db_user: models.User = Depends(get_current_db_user)):
    if current_db_user.role != models.RoleEnum.contributer:
        raise HTTPException(status_code=403, detail="Only contributors can manage the schedule")
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
def delete_daily_menu(menu_id: int, db: Session = Depends(get_db), current_db_user: models.User = Depends(get_current_db_user)):
    if current_db_user.role != models.RoleEnum.contributer:
        raise HTTPException(status_code=403, detail="Only contributors can manage the schedule")
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
def create_feedback(feedback: schemas.FeedbackCreate, db: Session = Depends(get_db), current_db_user: models.User = Depends(get_current_db_user)):
    if current_db_user.role != models.RoleEnum.reader:
        raise HTTPException(status_code=403, detail="Only readers can submit feedback")
    db_feedback = models.Feedback(**feedback.model_dump())
    db.add(db_feedback)
    db.commit()
    db.refresh(db_feedback)
    return db_feedback

@app.get("/feedback/", response_model=List[schemas.Feedback], tags=["Feedback"])
def read_feedback(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_db_user: models.User = Depends(get_current_db_user)):
    return db.query(models.Feedback).order_by(models.Feedback.created_at.desc()).offset(skip).limit(limit).all()

# --- Users API ---

@app.get("/users/me", response_model=schemas.User, tags=["Users"])
def read_users_me(current_db_user: models.User = Depends(get_current_db_user)):
    """
    Returns the currently authenticated user's database profile.
    Requires a valid Firebase ID token in the Authorization header.
    """
    return current_db_user

@app.put("/users/me", response_model=schemas.User, tags=["Users"])
def update_user_me(profile_update: schemas.UserUpdateProfile, db: Session = Depends(get_db), current_db_user: models.User = Depends(get_current_db_user)):
    """
    Updates the current user's profile (name).
    """
    current_db_user.name = profile_update.name
    
    try:
        from firebase_admin import auth
        auth.update_user(current_db_user.firebase_uid, display_name=profile_update.name)
    except Exception as e:
        print(f"Warning: Failed to update Firebase Auth displayName: {e}")

    db.commit()
    db.refresh(current_db_user)
    return current_db_user

@app.post("/users/sync", response_model=schemas.User, tags=["Users"])
def sync_user(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Called by frontend after Firebase login to sync user data in local DB.
    """
    uid = current_user.get("uid")
    email = current_user.get("email", "")
    name = current_user.get("name", "")
    
    # Check if user exists
    db_user = db.query(models.User).filter(models.User.firebase_uid == uid).first()
    
    if db_user:
        # Update name/email if changed
        if db_user.email != email or db_user.name != name:
            db_user.email = email
            db_user.name = name
            db.commit()
            db.refresh(db_user)
        return db_user
    
    # Create new user
    new_user = models.User(
        firebase_uid=uid,
        email=email,
        name=name,
        role=models.RoleEnum.reader
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@app.get("/users/", response_model=List[schemas.User], tags=["Users"])
def read_all_users(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_db_user: models.User = Depends(get_current_db_user)):
    """
    Returns all users. Requires admin role.
    """
    if current_db_user.role != models.RoleEnum.admin:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    users = db.query(models.User).offset(skip).limit(limit).all()
    return users

@app.put("/users/{user_id}/role", response_model=schemas.User, tags=["Users"])
def update_user_role(user_id: int, role_update: schemas.UserUpdateRole, db: Session = Depends(get_db), current_db_user: models.User = Depends(get_current_db_user)):
    """
    Updates a user's role. Requires admin role.
    """
    if current_db_user.role != models.RoleEnum.admin:
        raise HTTPException(status_code=403, detail="Not enough permissions")
        
    db_user = db.query(models.User).filter(models.User.user_id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
        
    db_user.role = role_update.role
    db.commit()
    db.refresh(db_user)
    return db_user

@app.delete("/users/{user_id}", status_code=204, tags=["Users"])
def delete_user(user_id: int, db: Session = Depends(get_db), current_db_user: models.User = Depends(get_current_db_user)):
    """
    Deletes a user. Requires admin role.
    """
    if current_db_user.role != models.RoleEnum.admin:
        raise HTTPException(status_code=403, detail="Not enough permissions")
        
    db_user = db.query(models.User).filter(models.User.user_id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
        
    try:
        from firebase_admin import auth
        auth.delete_user(db_user.firebase_uid)
    except Exception as e:
        print(f"Warning: Failed to delete user from Firebase Auth: {e}")
        
    db.delete(db_user)
    db.commit()
    return
