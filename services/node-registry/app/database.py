"""
SQLite Database connection for local development
Use this for testing without PostgreSQL
"""
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from contextlib import contextmanager
import logging

logger = logging.getLogger(__name__)

# SQLite database file
DB_FILE = os.getenv("NODE_REGISTRY_DB_FILE", "node_registry.db")
DATABASE_URL = f"sqlite:///{DB_FILE}"

# Create engine
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},  # Required for SQLite
    echo=os.getenv("NODE_REGISTRY_ENV") == "development",  # Log SQL in dev
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Session:
    """
    Dependency for FastAPI to get database session
    
    Usage:
        @app.get("/")
        def endpoint(db: Session = Depends(get_db)):
            ...
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@contextmanager
def get_db_context():
    """
    Context manager for database session
    
    Usage:
        with get_db_context() as db:
            db.query(Node).all()
    """
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def check_db_connection() -> bool:
    """Check if database connection is working"""
    try:
        with engine.connect() as conn:
            conn.execute("SELECT 1")
        return True
    except Exception as e:
        logger.error(f"Database connection failed: {e}")
        return False


def get_db_info() -> dict:
    """Get database connection information"""
    return {
        "type": "sqlite",
        "database": DB_FILE,
        "connected": check_db_connection(),
    }

