import os
from datetime import timedelta

BASE_DIR = os.path.abspath(os.path.dirname(__file__))

class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "gestaox-pythonanywhere-secret-key-2026")
    
    # SQLite Database (100% compativel com o plano gratuito do PythonAnywhere)
    raw_db = os.getenv(
        "DATABASE_URL", 
        f"sqlite:///{os.path.join(BASE_DIR, 'gestaox.db')}"
    )
    if raw_db.startswith("postgres://"):
        raw_db = raw_db.replace("postgres://", "postgresql://", 1)
    SQLALCHEMY_DATABASE_URI = raw_db
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    if "sqlite" in raw_db:
        SQLALCHEMY_ENGINE_OPTIONS = {
            "connect_args": {
                "timeout": 30,
                "check_same_thread": False
            }
        }
    else:
        SQLALCHEMY_ENGINE_OPTIONS = {
            "pool_pre_ping": True,
            "pool_recycle": 300
        }
    
    # JWT Settings
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "gestaox-jwt-jwt-super-secret-key-2026")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=8)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)
    
    # JSON formatting
    JSON_SORT_KEYS = False
    JSONIFY_PRETTYPRINT_REGULAR = True
