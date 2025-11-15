"""
SQLAlchemy моделі для Memory Service
Підтримує: user_facts, dialog_summaries, agent_memory_events
"""

from sqlalchemy import (
    Column, String, Text, JSON, TIMESTAMP, ForeignKey, 
    CheckConstraint, Index, Boolean, Integer
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func
from pgvector.sqlalchemy import Vector

Base = declarative_base()


class UserFact(Base):
    """
    Довгострокові факти про користувача
    Використовується для контрольованої довгострокової пам'яті
    (мови, вподобання, тип користувача, токен-статуси)
    """
    __tablename__ = "user_facts"

    id = Column(UUID(as_uuid=False), primary_key=True, server_default=func.gen_random_uuid())
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    team_id = Column(String, ForeignKey("teams.id", ondelete="CASCADE"), nullable=True, index=True)
    
    # Ключ факту (наприклад: "language", "is_donor", "is_validator", "top_contributor")
    fact_key = Column(String, nullable=False, index=True)
    
    # Значення факту (може бути текст, число, boolean, JSON)
    fact_value = Column(Text, nullable=True)
    fact_value_json = Column(JSONB, nullable=True)
    
    # Метадані: джерело, впевненість, термін дії
    metadata = Column(JSONB, nullable=False, server_default="{}")
    
    # Токен-гейт: чи залежить факт від токенів/активності
    token_gated = Column(Boolean, nullable=False, server_default="false")
    token_requirements = Column(JSONB, nullable=True)  # {"token": "DAAR", "min_balance": 1}
    
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), nullable=True, onupdate=func.now())
    expires_at = Column(TIMESTAMP(timezone=True), nullable=True)  # Для тимчасових фактів

    __table_args__ = (
        Index("idx_user_facts_user_key", "user_id", "fact_key"),
        Index("idx_user_facts_team", "team_id"),
        Index("idx_user_facts_token_gated", "token_gated"),
    )


class DialogSummary(Base):
    """
    Підсумки діалогів для масштабування без переповнення контексту
    Зберігає агреговану інформацію про сесії/діалоги
    """
    __tablename__ = "dialog_summaries"

    id = Column(UUID(as_uuid=False), primary_key=True, server_default=func.gen_random_uuid())
    
    # Контекст діалогу
    team_id = Column(String, ForeignKey("teams.id", ondelete="CASCADE"), nullable=False, index=True)
    channel_id = Column(String, ForeignKey("channels.id", ondelete="CASCADE"), nullable=True, index=True)
    agent_id = Column(String, ForeignKey("agents.id", ondelete="CASCADE"), nullable=True, index=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    
    # Період, який охоплює підсумок
    period_start = Column(TIMESTAMP(timezone=True), nullable=False)
    period_end = Column(TIMESTAMP(timezone=True), nullable=False)
    
    # Підсумок
    summary_text = Column(Text, nullable=False)
    summary_json = Column(JSONB, nullable=True)  # Структуровані дані
    
    # Статистика
    message_count = Column(Integer, nullable=False, server_default="0")
    participant_count = Column(Integer, nullable=False, server_default="0")
    
    # Ключові теми/теги
    topics = Column(JSONB, nullable=True)  # ["project-planning", "bug-fix", ...]
    
    # Метадані
    metadata = Column(JSONB, nullable=False, server_default="{}")
    
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())

    __table_args__ = (
        Index("idx_dialog_summaries_team_period", "team_id", "period_start", "period_end"),
        Index("idx_dialog_summaries_channel", "channel_id"),
        Index("idx_dialog_summaries_agent", "agent_id"),
    )


class AgentMemoryEvent(Base):
    """
    Події пам'яті агентів (short-term, mid-term, long-term)
    Базується на документації: docs/cursor/13_agent_memory_system.md
    """
    __tablename__ = "agent_memory_events"

    id = Column(UUID(as_uuid=False), primary_key=True, server_default=func.gen_random_uuid())
    
    agent_id = Column(String, ForeignKey("agents.id", ondelete="CASCADE"), nullable=False, index=True)
    team_id = Column(String, ForeignKey("teams.id", ondelete="CASCADE"), nullable=False, index=True)
    channel_id = Column(String, ForeignKey("channels.id", ondelete="CASCADE"), nullable=True, index=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    
    # Scope: short_term, mid_term, long_term
    scope = Column(String, nullable=False)
    
    # Kind: message, fact, summary, note
    kind = Column(String, nullable=False)
    
    # Тіло події
    body_text = Column(Text, nullable=True)
    body_json = Column(JSONB, nullable=True)
    
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())

    __table_args__ = (
        CheckConstraint("scope IN ('short_term', 'mid_term', 'long_term')", name="ck_agent_memory_scope"),
        CheckConstraint("kind IN ('message', 'fact', 'summary', 'note')", name="ck_agent_memory_kind"),
        Index("idx_agent_memory_events_agent_team_scope", "agent_id", "team_id", "scope"),
        Index("idx_agent_memory_events_channel", "agent_id", "channel_id"),
        Index("idx_agent_memory_events_created_at", "created_at"),
    )


class AgentMemoryFactsVector(Base):
    """
    Векторні представлення фактів для RAG (Retrieval-Augmented Generation)
    """
    __tablename__ = "agent_memory_facts_vector"

    id = Column(UUID(as_uuid=False), primary_key=True, server_default=func.gen_random_uuid())
    
    agent_id = Column(String, ForeignKey("agents.id", ondelete="CASCADE"), nullable=False, index=True)
    team_id = Column(String, ForeignKey("teams.id", ondelete="CASCADE"), nullable=False, index=True)
    
    fact_text = Column(Text, nullable=False)
    embedding = Column(Vector(1536), nullable=True)  # OpenAI ada-002 embedding size
    
    metadata = Column(JSONB, nullable=False, server_default="{}")
    
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())

    __table_args__ = (
        Index("idx_agent_memory_facts_vector_agent_team", "agent_id", "team_id"),
    )

