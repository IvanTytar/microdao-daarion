"""
CRUD операції для Memory Service
"""

from typing import Optional, List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc
from datetime import datetime

from models import UserFact, DialogSummary, AgentMemoryEvent, AgentMemoryFactsVector
from schemas import (
    UserFactCreate, UserFactUpdate, UserFactUpsertRequest,
    DialogSummaryCreate, AgentMemoryEventCreate
)


# ========== User Facts CRUD ==========

def get_user_fact(
    db: Session,
    user_id: str,
    fact_key: str,
    team_id: Optional[str] = None
) -> Optional[UserFact]:
    """Отримати факт користувача"""
    query = db.query(UserFact).filter(
        and_(
            UserFact.user_id == user_id,
            UserFact.fact_key == fact_key
        )
    )
    
    if team_id:
        query = query.filter(UserFact.team_id == team_id)
    else:
        query = query.filter(UserFact.team_id.is_(None))
    
    return query.first()


def get_user_facts(
    db: Session,
    user_id: str,
    team_id: Optional[str] = None,
    fact_keys: Optional[List[str]] = None,
    skip: int = 0,
    limit: int = 100
) -> List[UserFact]:
    """Отримати список фактів користувача"""
    query = db.query(UserFact).filter(UserFact.user_id == user_id)
    
    if team_id:
        query = query.filter(
            or_(
                UserFact.team_id == team_id,
                UserFact.team_id.is_(None)  # Глобальні факти
            )
        )
    
    if fact_keys:
        query = query.filter(UserFact.fact_key.in_(fact_keys))
    
    # Фільтр за терміном дії
    query = query.filter(
        or_(
            UserFact.expires_at.is_(None),
            UserFact.expires_at > datetime.utcnow()
        )
    )
    
    return query.offset(skip).limit(limit).all()


def create_user_fact(
    db: Session,
    fact: UserFactCreate
) -> UserFact:
    """Створити новий факт"""
    db_fact = UserFact(**fact.dict())
    db.add(db_fact)
    db.commit()
    db.refresh(db_fact)
    return db_fact


def update_user_fact(
    db: Session,
    fact_id: str,
    fact_update: UserFactUpdate
) -> Optional[UserFact]:
    """Оновити факт"""
    db_fact = db.query(UserFact).filter(UserFact.id == fact_id).first()
    if not db_fact:
        return None
    
    update_data = fact_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_fact, field, value)
    
    db.commit()
    db.refresh(db_fact)
    return db_fact


def upsert_user_fact(
    db: Session,
    fact_request: UserFactUpsertRequest
) -> Tuple[UserFact, bool]:
    """
    Створити або оновити факт (upsert)
    Повертає (fact, created) де created = True якщо створено новий
    """
    # Шукаємо існуючий факт
    existing = get_user_fact(
        db,
        fact_request.user_id,
        fact_request.fact_key,
        fact_request.team_id
    )
    
    if existing:
        # Оновлюємо існуючий
        update_data = fact_request.dict(exclude={"user_id", "fact_key", "team_id"})
        for field, value in update_data.items():
            if value is not None:
                setattr(existing, field, value)
        db.commit()
        db.refresh(existing)
        return existing, False
    else:
        # Створюємо новий
        new_fact = UserFact(**fact_request.dict())
        db.add(new_fact)
        db.commit()
        db.refresh(new_fact)
        return new_fact, True


def delete_user_fact(
    db: Session,
    fact_id: str
) -> bool:
    """Видалити факт"""
    db_fact = db.query(UserFact).filter(UserFact.id == fact_id).first()
    if not db_fact:
        return False
    
    db.delete(db_fact)
    db.commit()
    return True


def get_user_facts_by_token_gate(
    db: Session,
    user_id: str,
    team_id: Optional[str] = None
) -> List[UserFact]:
    """Отримати токен-гейт факти користувача"""
    query = db.query(UserFact).filter(
        and_(
            UserFact.user_id == user_id,
            UserFact.token_gated == True
        )
    )
    
    if team_id:
        query = query.filter(
            or_(
                UserFact.team_id == team_id,
                UserFact.team_id.is_(None)
            )
        )
    
    return query.all()


# ========== Dialog Summary CRUD ==========

def create_dialog_summary(
    db: Session,
    summary: DialogSummaryCreate
) -> DialogSummary:
    """Створити підсумок діалогу"""
    db_summary = DialogSummary(**summary.dict())
    db.add(db_summary)
    db.commit()
    db.refresh(db_summary)
    return db_summary


def get_dialog_summaries(
    db: Session,
    team_id: Optional[str] = None,
    channel_id: Optional[str] = None,
    agent_id: Optional[str] = None,
    user_id: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    cursor: Optional[str] = None
) -> Tuple[List[DialogSummary], Optional[str]]:
    """
    Отримати список підсумків діалогів з cursor pagination
    Повертає (summaries, next_cursor)
    """
    query = db.query(DialogSummary)
    
    if team_id:
        query = query.filter(DialogSummary.team_id == team_id)
    if channel_id:
        query = query.filter(DialogSummary.channel_id == channel_id)
    if agent_id:
        query = query.filter(DialogSummary.agent_id == agent_id)
    if user_id:
        query = query.filter(DialogSummary.user_id == user_id)
    
    if cursor:
        # Cursor-based pagination (використовуємо created_at)
        try:
            cursor_time = datetime.fromisoformat(cursor)
            query = query.filter(DialogSummary.created_at < cursor_time)
        except ValueError:
            pass
    
    query = query.order_by(desc(DialogSummary.created_at))
    
    results = query.offset(skip).limit(limit + 1).all()
    
    # Перевіряємо чи є наступна сторінка
    next_cursor = None
    if len(results) > limit:
        results = results[:limit]
        next_cursor = results[-1].created_at.isoformat()
    
    return results, next_cursor


def get_dialog_summary(
    db: Session,
    summary_id: str
) -> Optional[DialogSummary]:
    """Отримати підсумок за ID"""
    return db.query(DialogSummary).filter(DialogSummary.id == summary_id).first()


def delete_dialog_summary(
    db: Session,
    summary_id: str
) -> bool:
    """Видалити підсумок"""
    db_summary = db.query(DialogSummary).filter(DialogSummary.id == summary_id).first()
    if not db_summary:
        return False
    
    db.delete(db_summary)
    db.commit()
    return True


# ========== Agent Memory Event CRUD ==========

def create_agent_memory_event(
    db: Session,
    event: AgentMemoryEventCreate
) -> AgentMemoryEvent:
    """Створити подію пам'яті агента"""
    db_event = AgentMemoryEvent(**event.dict())
    db.add(db_event)
    db.commit()
    db.refresh(db_event)
    return db_event


def get_agent_memory_events(
    db: Session,
    agent_id: str,
    team_id: Optional[str] = None,
    channel_id: Optional[str] = None,
    scope: Optional[str] = None,
    kind: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    cursor: Optional[str] = None
) -> Tuple[List[AgentMemoryEvent], Optional[str]]:
    """
    Отримати список подій пам'яті агента з cursor pagination
    """
    query = db.query(AgentMemoryEvent).filter(AgentMemoryEvent.agent_id == agent_id)
    
    if team_id:
        query = query.filter(AgentMemoryEvent.team_id == team_id)
    if channel_id:
        query = query.filter(AgentMemoryEvent.channel_id == channel_id)
    if scope:
        query = query.filter(AgentMemoryEvent.scope == scope)
    if kind:
        query = query.filter(AgentMemoryEvent.kind == kind)
    
    if cursor:
        try:
            cursor_time = datetime.fromisoformat(cursor)
            query = query.filter(AgentMemoryEvent.created_at < cursor_time)
        except ValueError:
            pass
    
    query = query.order_by(desc(AgentMemoryEvent.created_at))
    
    results = query.offset(skip).limit(limit + 1).all()
    
    next_cursor = None
    if len(results) > limit:
        results = results[:limit]
        next_cursor = results[-1].created_at.isoformat()
    
    return results, next_cursor


def delete_agent_memory_event(
    db: Session,
    event_id: str
) -> bool:
    """Видалити подію пам'яті"""
    db_event = db.query(AgentMemoryEvent).filter(AgentMemoryEvent.id == event_id).first()
    if not db_event:
        return False
    
    db.delete(db_event)
    db.commit()
    return True

