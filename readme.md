# Developer Box Setup


## Step 1: Install Dependencies

    Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
    Invoke-RestMethod -Uri https://get.scoop.sh | Invoke-Expression
    scoop bucket add main
    scoop install main/git
    scoop bucket add extras
    scoop install extras/vscode
    scoop install extras/antigravity
    scoop install versions/python314
    scoop install versions/nodejs24
    scoop install main/terraform
    scoop install main/tflint
    scoop install main/azure-cli
    scoop install main/postgresql


## Step 2: Database setup
 
 Run the database server 
 

    pg_ctl start

 Connect using add in 
 Run sql script for creating tables 


## Step 3: Run API 
Create the Virtual Environment Using 

    python3  -m venv .venv

Activate the Virtual Environment Using

     .venv\Scripts\activate
     
To download the dependencies

    cd api 
    pip install -r requirements.txt

Set Connection String in .env file (if not exist create a new one)
```
DATABASE_URL=postgresql://postgres:@localhost:5432/postgres?sslmode=disable

FIREBASE_CREDENTIALS_PATH=./firebase-adminsdk.json
```
**Note:Download the json file from firebase it is not available in the github(secured info)**

Run the api 

    uvicorn main:app --reload

 
 ## Step 4: Run the App
 

    cd app
     npm i 

 make .env file (if does not exist)
 all these values are required :

    VITE_FIREBASE_API_KEY=
    VITE_FIREBASE_AUTH_DOMAIN=
    VITE_FIREBASE_PROJECT_ID=
    VITE_FIREBASE_STORAGE_BUCKET=
    VITE_FIREBASE_MESSAGING_SENDER_ID=
    VITE_FIREBASE_APP_ID=
    VITE_API_BASE_URL='http://localhost:8000';
     

     npm run dev
