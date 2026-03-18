from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import firebase_admin
from firebase_admin import credentials, auth
import os

# Initialize Firebase Admin
# We expect the user to have GOOGLE_APPLICATION_CREDENTIALS set or provide a path via env var FIREBASE_CREDENTIALS_PATH.
firebase_cred_path = os.getenv("FIREBASE_CREDENTIALS_PATH")
try:
    if firebase_cred_path:
        cred = credentials.Certificate(firebase_cred_path)
        firebase_admin.initialize_app(cred)
    else:
        # Default initialization (relies on GOOGLE_APPLICATION_CREDENTIALS environment variable)
        firebase_admin.initialize_app()
except ValueError:
    # Already initialized
    pass
except Exception as e:
    print(f"Firebase Admin Initialization warning: {e}")
    # Allow the app to start, but verify_id_token might fail if not properly configured.

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
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid authentication credentials: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )
