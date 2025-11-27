"""
Second Me Service API Routes
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import List
import logging

from models import (
    SecondMeInvokePayload,
    SecondMeInvokeResponse,
    SecondMeProfile
)
import service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/secondme", tags=["secondme"])


# =============================================================================
# Second Me API
# =============================================================================

@router.post("/invoke", response_model=SecondMeInvokeResponse)
async def invoke_secondme(payload: SecondMeInvokePayload):
    """
    Викликати Second Me agent
    """
    try:
        # TODO: витягнути user_id з JWT
        user_id = "u_mock_user"  # Mock для MVP
        
        result = await service.invoke_second_me(user_id, payload.prompt)
        
        # Додати історію
        history = await service.get_user_history(user_id, limit=10)
        
        return {
            **result,
            "history": history
        }
    
    except Exception as e:
        logger.error(f"Failed to invoke SecondMe: {e}")
        raise HTTPException(status_code=500, detail="Failed to invoke SecondMe")


@router.get("/history")
async def get_secondme_history(limit: int = 5):
    """
    Отримати історію розмов з Second Me
    """
    try:
        # TODO: витягнути user_id з JWT
        user_id = "u_mock_user"  # Mock для MVP
        
        history = await service.get_user_history(user_id, limit=limit)
        return history
    
    except Exception as e:
        logger.error(f"Failed to get SecondMe history: {e}")
        raise HTTPException(status_code=500, detail="Failed to get history")


@router.get("/profile", response_model=SecondMeProfile)
async def get_secondme_profile():
    """
    Отримати профіль Second Me користувача
    """
    try:
        # TODO: витягнути user_id з JWT
        user_id = "u_mock_user"  # Mock для MVP
        
        profile = await service.get_user_profile(user_id)
        return profile
    
    except Exception as e:
        logger.error(f"Failed to get SecondMe profile: {e}")
        raise HTTPException(status_code=500, detail="Failed to get profile")


@router.post("/history/clear")
async def clear_secondme_history():
    """
    Очистити історію розмов з Second Me
    """
    try:
        # TODO: витягнути user_id з JWT
        user_id = "u_mock_user"  # Mock для MVP
        
        await service.clear_user_history(user_id)
        return {"status": "cleared"}
    
    except Exception as e:
        logger.error(f"Failed to clear SecondMe history: {e}")
        raise HTTPException(status_code=500, detail="Failed to clear history")

