from fastapi import APIRouter

from .bots_registry import bots_registry
from .telegram_listener import telegram_listener

router = APIRouter(prefix="/debug", tags=["debug"])


@router.get("/bots")
async def list_bots():
    """Список зареєстрованих ботів"""
    return {
        "registered_bots": len(telegram_listener._bots),
        "bot_tokens": [token[:16] + "..." for token in telegram_listener._bots.keys()],
        "registry_mappings": len(bots_registry._agent_to_token),
        "active_tasks": len(telegram_listener._tasks)
    }


@router.get("/bots/tasks")
async def list_tasks():
    """Статус polling tasks"""
    tasks_status = {}
    for token, task in telegram_listener._tasks.items():
        tasks_status[token[:16] + "..."] = {
            "done": task.done(),
            "cancelled": task.cancelled(),
        }
        if task.done() and not task.cancelled():
            try:
                task.result()
            except Exception as e:
                tasks_status[token[:16] + "..."]["error"] = str(e)
    return tasks_status
