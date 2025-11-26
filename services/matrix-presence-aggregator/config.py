"""Configuration for Matrix Presence Aggregator"""
import os
from dotenv import load_dotenv

load_dotenv()

# Matrix settings
MATRIX_HS_URL = os.getenv("MATRIX_HS_URL", "https://app.daarion.space")
MATRIX_ACCESS_TOKEN = os.getenv("MATRIX_ACCESS_TOKEN", "")
MATRIX_USER_ID = os.getenv("MATRIX_USER_ID", "@presence_daemon:daarion.space")

# City Service for room mapping
CITY_SERVICE_URL = os.getenv("CITY_SERVICE_URL", "http://localhost:7001")
INTERNAL_API_KEY = os.getenv("INTERNAL_API_KEY", "super-secret-internal-key")

# NATS
NATS_URL = os.getenv("NATS_URL", "nats://localhost:4222")

# Throttling
ROOM_PRESENCE_THROTTLE_MS = int(os.getenv("ROOM_PRESENCE_THROTTLE_MS", "3000"))

# Sync settings
SYNC_TIMEOUT_MS = int(os.getenv("SYNC_TIMEOUT_MS", "30000"))
ROOM_MAPPING_REFRESH_INTERVAL_S = int(os.getenv("ROOM_MAPPING_REFRESH_INTERVAL_S", "300"))

