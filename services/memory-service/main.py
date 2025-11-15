"""
Memory Service - FastAPI додаток
Підтримує: user_facts, dialog_summaries, agent_memory_events
Інтеграція з token-gate через RBAC
"""

import os
from typing import Optional, List
from datetime import datetime

from fastapi import FastAPI, Depends, HTTPException, Query, Header
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from models import Base, UserFact, DialogSummary, AgentMemoryEvent
from schemas import (
    UserFactCreate, UserFactUpdate, UserFactResponse, UserFactUpsertRequest, UserFactUpsertResponse,
    DialogSummaryCreate, DialogSummaryResponse, DialogSummaryListResponse,
    AgentMemoryEventCreate, AgentMemoryEventResponse, AgentMemoryEventListResponse,
    TokenGateCheck, TokenGateCheckResponse
)
from crud import (
    get_user_fact, get_user_facts, create_user_fact, update_user_fact,
    upsert_user_fact, delete_user_fact, get_user_facts_by_token_gate,
    create_dialog_summary, get_dialog_summaries, get_dialog_summary, delete_dialog_summary,
    create_agent_memory_event, get_agent_memory_events, delete_agent_memory_event
)

# ========== Configuration ==========

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://user:password@localhost:5432/microdao"
)

# Створюємо engine та sessionmaker
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Створюємо таблиці (для dev, в продакшені використовуйте міграції)
Base.metadata.create_all(bind=engine)

# ========== FastAPI App ==========

app = FastAPI(
    title="Memory Service",
    description="Сервіс пам'яті для MicroDAO: user_facts, dialog_summaries, agent_memory_events",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # В продакшені обмежте це
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ========== Dependencies ==========

def get_db():
    """Dependency для отримання DB сесії"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


async def verify_token(authorization: Optional[str] = Header(None)) -> Optional[str]:
    """
    Перевірка JWT токену (заглушка)
    В продакшені інтегруйте з вашою системою авторизації
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing authorization header")
    
    # Заглушка: в реальності перевіряйте JWT
    # token = authorization.replace("Bearer ", "")
    # user_id = verify_jwt_token(token)
    # return user_id
    
    # Для тестування повертаємо user_id з заголовка
    return "u_test"  # TODO: реалізувати реальну перевірку


async def check_token_gate(
    user_id: str,
    token_requirements: dict,
    db: Session
) -> TokenGateCheckResponse:
    """
    Перевірка токен-гейту (інтеграція з RBAC/Wallet Service)
    Заглушка - в продакшені викликайте ваш PDP/Wallet Service
    """
    # TODO: Інтегрувати з:
    # - PDP Service для перевірки capabilities
    # - Wallet Service для перевірки балансів
    # - RBAC для перевірки ролей
    
    # Приклад логіки:
    # if "token" in token_requirements:
    #     token_type = token_requirements["token"]
    #     min_balance = token_requirements.get("min_balance", 0)
    #     balance = await wallet_service.get_balance(user_id, token_type)
    #     if balance < min_balance:
    #         return TokenGateCheckResponse(
    #             allowed=False,
    #             reason=f"Insufficient {token_type} balance",
    #             missing_requirements={"token": token_type, "required": min_balance, "current": balance}
    #         )
    
    # Заглушка: завжди дозволяємо
    return TokenGateCheckResponse(allowed=True)


# ========== Health Check ==========

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "ok", "service": "memory-service"}


# ========== User Facts Endpoints ==========

@app.post("/facts/upsert", response_model=UserFactUpsertResponse)
async def upsert_fact(
    fact_request: UserFactUpsertRequest,
    db: Session = Depends(get_db),
    user_id: str = Depends(verify_token)
):
    """
    Створити або оновити факт користувача (upsert)
    
    Це основний ендпоінт для контрольованої довгострокової пам'яті.
    Підтримує токен-гейт інтеграцію.
    """
    # Перевірка токен-гейту якщо потрібно
    if fact_request.token_gated and fact_request.token_requirements:
        gate_check = await check_token_gate(
            fact_request.user_id,
            fact_request.token_requirements,
            db
        )
        if not gate_check.allowed:
            raise HTTPException(
                status_code=403,
                detail=f"Token gate check failed: {gate_check.reason}"
            )
    
    # Перевірка прав доступу (користувач може змінювати тільки свої факти)
    if fact_request.user_id != user_id:
        raise HTTPException(status_code=403, detail="Cannot modify other user's facts")
    
    fact, created = upsert_user_fact(db, fact_request)
    
    return UserFactUpsertResponse(
        fact=UserFactResponse.model_validate(fact),
        created=created
    )


@app.get("/facts", response_model=List[UserFactResponse])
async def list_facts(
    team_id: Optional[str] = Query(None),
    fact_keys: Optional[str] = Query(None, description="Comma-separated list of fact keys"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    user_id: str = Depends(verify_token)
):
    """Отримати список фактів користувача"""
    fact_keys_list = None
    if fact_keys:
        fact_keys_list = [k.strip() for k in fact_keys.split(",")]
    
    facts = get_user_facts(db, user_id, team_id, fact_keys_list, skip, limit)
    return [UserFactResponse.model_validate(f) for f in facts]


@app.get("/facts/{fact_key}", response_model=UserFactResponse)
async def get_fact(
    fact_key: str,
    team_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    user_id: str = Depends(verify_token)
):
    """Отримати конкретний факт за ключем"""
    fact = get_user_fact(db, user_id, fact_key, team_id)
    if not fact:
        raise HTTPException(status_code=404, detail="Fact not found")
    return UserFactResponse.model_validate(fact)


@app.post("/facts", response_model=UserFactResponse)
async def create_fact(
    fact: UserFactCreate,
    db: Session = Depends(get_db),
    user_id: str = Depends(verify_token)
):
    """Створити новий факт"""
    if fact.user_id != user_id:
        raise HTTPException(status_code=403, detail="Cannot create fact for other user")
    
    db_fact = create_user_fact(db, fact)
    return UserFactResponse.model_validate(db_fact)


@app.patch("/facts/{fact_id}", response_model=UserFactResponse)
async def update_fact(
    fact_id: str,
    fact_update: UserFactUpdate,
    db: Session = Depends(get_db),
    user_id: str = Depends(verify_token)
):
    """Оновити факт"""
    fact = db.query(UserFact).filter(UserFact.id == fact_id).first()
    if not fact:
        raise HTTPException(status_code=404, detail="Fact not found")
    
    if fact.user_id != user_id:
        raise HTTPException(status_code=403, detail="Cannot modify other user's fact")
    
    updated_fact = update_user_fact(db, fact_id, fact_update)
    if not updated_fact:
        raise HTTPException(status_code=404, detail="Fact not found")
    
    return UserFactResponse.model_validate(updated_fact)


@app.delete("/facts/{fact_id}")
async def delete_fact(
    fact_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(verify_token)
):
    """Видалити факт"""
    fact = db.query(UserFact).filter(UserFact.id == fact_id).first()
    if not fact:
        raise HTTPException(status_code=404, detail="Fact not found")
    
    if fact.user_id != user_id:
        raise HTTPException(status_code=403, detail="Cannot delete other user's fact")
    
    success = delete_user_fact(db, fact_id)
    if not success:
        raise HTTPException(status_code=404, detail="Fact not found")
    
    return {"success": True}


@app.get("/facts/token-gated", response_model=List[UserFactResponse])
async def list_token_gated_facts(
    team_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    user_id: str = Depends(verify_token)
):
    """Отримати токен-гейт факти користувача"""
    facts = get_user_facts_by_token_gate(db, user_id, team_id)
    return [UserFactResponse.model_validate(f) for f in facts]


# ========== Dialog Summary Endpoints ==========

@app.post("/summaries", response_model=DialogSummaryResponse)
async def create_summary(
    summary: DialogSummaryCreate,
    db: Session = Depends(get_db),
    user_id: str = Depends(verify_token)
):
    """
    Створити підсумок діалогу
    
    Використовується для масштабування без переповнення контексту.
    Агрегує інформацію про сесії/діалоги.
    """
    db_summary = create_dialog_summary(db, summary)
    return DialogSummaryResponse.model_validate(db_summary)


@app.get("/summaries", response_model=DialogSummaryListResponse)
async def list_summaries(
    team_id: Optional[str] = Query(None),
    channel_id: Optional[str] = Query(None),
    agent_id: Optional[str] = Query(None),
    user_id_param: Optional[str] = Query(None, alias="user_id"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    cursor: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    user_id: str = Depends(verify_token)
):
    """Отримати список підсумків діалогів"""
    summaries, next_cursor = get_dialog_summaries(
        db, team_id, channel_id, agent_id, user_id_param, skip, limit, cursor
    )
    
    return DialogSummaryListResponse(
        items=[DialogSummaryResponse.model_validate(s) for s in summaries],
        total=len(summaries),
        cursor=next_cursor
    )


@app.get("/summaries/{summary_id}", response_model=DialogSummaryResponse)
async def get_summary(
    summary_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(verify_token)
):
    """Отримати підсумок за ID"""
    summary = get_dialog_summary(db, summary_id)
    if not summary:
        raise HTTPException(status_code=404, detail="Summary not found")
    return DialogSummaryResponse.model_validate(summary)


@app.delete("/summaries/{summary_id}")
async def delete_summary(
    summary_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(verify_token)
):
    """Видалити підсумок"""
    success = delete_dialog_summary(db, summary_id)
    if not success:
        raise HTTPException(status_code=404, detail="Summary not found")
    return {"success": True}


# ========== Agent Memory Event Endpoints ==========

@app.post("/agents/{agent_id}/memory", response_model=AgentMemoryEventResponse)
async def create_memory_event(
    agent_id: str,
    event: AgentMemoryEventCreate,
    db: Session = Depends(get_db),
    user_id: str = Depends(verify_token)
):
    """Створити подію пам'яті агента"""
    # Перевірка що agent_id збігається
    if event.agent_id != agent_id:
        raise HTTPException(status_code=400, detail="agent_id mismatch")
    
    db_event = create_agent_memory_event(db, event)
    return AgentMemoryEventResponse.model_validate(db_event)


@app.get("/agents/{agent_id}/memory", response_model=AgentMemoryEventListResponse)
async def list_memory_events(
    agent_id: str,
    team_id: Optional[str] = Query(None),
    channel_id: Optional[str] = Query(None),
    scope: Optional[str] = Query(None, description="short_term | mid_term | long_term"),
    kind: Optional[str] = Query(None, description="message | fact | summary | note"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    cursor: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    user_id: str = Depends(verify_token)
):
    """Отримати список подій пам'яті агента"""
    events, next_cursor = get_agent_memory_events(
        db, agent_id, team_id, channel_id, scope, kind, skip, limit, cursor
    )
    
    return AgentMemoryEventListResponse(
        items=[AgentMemoryEventResponse.model_validate(e) for e in events],
        total=len(events),
        cursor=next_cursor
    )


@app.delete("/agents/{agent_id}/memory/{event_id}")
async def delete_memory_event(
    agent_id: str,
    event_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(verify_token)
):
    """Видалити подію пам'яті"""
    success = delete_agent_memory_event(db, event_id)
    if not success:
        raise HTTPException(status_code=404, detail="Memory event not found")
    return {"success": True}


# ========== Token Gate Integration Endpoint ==========

@app.post("/token-gate/check", response_model=TokenGateCheckResponse)
async def check_token_gate_endpoint(
    check: TokenGateCheck,
    db: Session = Depends(get_db),
    user_id: str = Depends(verify_token)
):
    """
    Перевірка токен-гейту для факту
    
    Інтеграція з RBAC/Wallet Service для перевірки доступу
    """
    if check.user_id != user_id:
        raise HTTPException(status_code=403, detail="Cannot check token gate for other user")
    
    return await check_token_gate(user_id, check.token_requirements, db)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

