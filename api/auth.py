from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import firebase_admin
from firebase_admin import credentials, auth
import os
from dotenv import load_dotenv
from sqlalchemy.orm import Session
from database import get_db
import models

load_dotenv()
# Also check for .env in current directory or api directory
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

# Initialize Firebase Admin
firebase_cred_path = os.getenv("FIREBASE_CREDENTIALS_PATH", "./firebase-adminsdk.json")

# Resolve relative path if needed
if firebase_cred_path and not os.path.isabs(firebase_cred_path):
    if not os.path.exists(firebase_cred_path):
        candidate = os.path.join(os.path.dirname(__file__), firebase_cred_path)
        if os.path.exists(candidate):
            firebase_cred_path = candidate

try:
    if firebase_cred_path and os.path.exists(firebase_cred_path):
        cred = credentials.Certificate(firebase_cred_path)
        firebase_admin.initialize_app(cred)
        print(f"Firebase Admin SDK initialized successfully using: {firebase_cred_path}")
    else:
        # Default initialization (relies on GOOGLE_APPLICATION_CREDENTIALS environment variable)
        firebase_admin.initialize_app()
        print("Firebase Admin SDK initialized using default environment credentials")
except ValueError:
    # Already initialized
    pass
except Exception as e:
    print(f"Firebase Admin Initialization warning: {e}")

security = HTTPBearer()

def get_current_user(creds: HTTPAuthorizationCredentials = Depends(security)):
    """
    Dependency to extract and verify the Firebase ID token from the Authorization header.
    Returns the decoded token payload if valid.
    """
    token = creds.credentials
    try:
        decoded_token = auth.verify_id_token(token)
        return decoded_token
    except Exception as e:
        print(f"Token verification failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid authentication credentials: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )

def get_current_db_user(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Dependency to fetch the User object from the database based on the verified Firebase UID.
    """
    uid = current_user.get("uid")
    if not uid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid UID in token",
        )
    
    user = db.query(models.User).filter(models.User.firebase_uid == uid).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found in database. Please re-sync login.",
        )
    return user
