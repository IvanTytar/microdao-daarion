"""
SQLAlchemy ORM Models for Node Registry
"""
from datetime import datetime
from typing import Optional
from sqlalchemy import Column, String, DateTime, Boolean, ForeignKey, Text, Index
from sqlalchemy.dialects.postgresql import UUID as PG_UUID, INET, JSONB as PG_JSONB
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.types import TypeDecorator, String as SQLString, Text as SQLText
import uuid
import json

# Universal UUID type (works with SQLite and PostgreSQL)
class UUID(TypeDecorator):
    impl = SQLString
    cache_ok = True
    
    def load_dialect_impl(self, dialect):
        if dialect.name == 'postgresql':
            return dialect.type_descriptor(PG_UUID(as_uuid=True))
        else:
            return dialect.type_descriptor(SQLString(36))
    
    def process_bind_param(self, value, dialect):
        if value is None:
            return value
        if dialect.name == 'postgresql':
            return value
        else:
            if isinstance(value, uuid.UUID):
                return str(value)
            return value
    
    def process_result_value(self, value, dialect):
        if value is None:
            return value
        if dialect.name == 'postgresql':
            return value
        else:
            if isinstance(value, str):
                return uuid.UUID(value)
            return value

# Universal JSONB type (works with SQLite and PostgreSQL)
class JSONB(TypeDecorator):
    impl = SQLText
    cache_ok = True
    
    def load_dialect_impl(self, dialect):
        if dialect.name == 'postgresql':
            return dialect.type_descriptor(PG_JSONB())
        else:
            return dialect.type_descriptor(SQLText())
    
    def process_bind_param(self, value, dialect):
        if value is None:
            return value
        if dialect.name == 'postgresql':
            return value
        else:
            return json.dumps(value)
    
    def process_result_value(self, value, dialect):
        if value is None:
            return value
        if dialect.name == 'postgresql':
            return value
        else:
            return json.loads(value)

Base = declarative_base()


class Node(Base):
    """Node model - represents a DAGI network node"""
    __tablename__ = "nodes"
    
    id = Column(UUID(), primary_key=True, default=uuid.uuid4)
    node_id = Column(String(255), unique=True, nullable=False, index=True)
    node_name = Column(String(255), nullable=False)
    node_role = Column(String(50), nullable=False)  # production, development, backup
    node_type = Column(String(50), nullable=False)  # router, gateway, worker
    ip_address = Column(String(45), nullable=True)  # IPv4 or IPv6
    local_ip = Column(String(45), nullable=True)  # IPv4 or IPv6
    hostname = Column(String(255), nullable=True)
    status = Column(String(50), default='offline', index=True)  # online, offline, maintenance, degraded
    last_heartbeat = Column(DateTime(timezone=True), nullable=True, index=True)
    registered_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    node_metadata = Column(JSONB, default={})
    
    # Relationships
    profiles = relationship("NodeProfile", back_populates="node", cascade="all, delete-orphan")
    heartbeats = relationship("HeartbeatLog", back_populates="node", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Node(node_id='{self.node_id}', status='{self.status}')>"
    
    def to_dict(self):
        """Convert to dictionary"""
        return {
            "id": str(self.id) if self.id else None,
            "node_id": self.node_id,
            "node_name": self.node_name,
            "node_role": self.node_role,
            "node_type": self.node_type,
            "ip_address": self.ip_address,
            "local_ip": self.local_ip,
            "hostname": self.hostname,
            "status": self.status,
            "last_heartbeat": self.last_heartbeat.isoformat() if self.last_heartbeat else None,
            "registered_at": self.registered_at.isoformat() if self.registered_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "metadata": self.node_metadata or {},
        }


class NodeProfile(Base):
    """Node Profile - stores node capabilities and configurations"""
    __tablename__ = "node_profiles"
    
    id = Column(UUID(), primary_key=True, default=uuid.uuid4)
    node_id = Column(UUID(), ForeignKey("nodes.id", ondelete="CASCADE"), nullable=False, index=True)
    profile_name = Column(String(255), nullable=False)
    profile_type = Column(String(50), nullable=False)  # llm, service, capability
    config = Column(JSONB, nullable=False, default={})
    enabled = Column(Boolean, default=True, index=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    node = relationship("Node", back_populates="profiles")
    
    __table_args__ = (
        Index('idx_node_profile_unique', node_id, profile_name, unique=True),
    )
    
    def __repr__(self):
        return f"<NodeProfile(node_id='{self.node_id}', profile_name='{self.profile_name}')>"
    
    def to_dict(self):
        """Convert to dictionary"""
        return {
            "id": str(self.id),
            "node_id": str(self.node_id),
            "profile_name": self.profile_name,
            "profile_type": self.profile_type,
            "config": self.config or {},
            "enabled": self.enabled,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class HeartbeatLog(Base):
    """Heartbeat Log - stores node heartbeat history"""
    __tablename__ = "heartbeat_log"
    
    id = Column(UUID(), primary_key=True, default=uuid.uuid4)
    node_id = Column(UUID(), ForeignKey("nodes.id", ondelete="CASCADE"), nullable=False, index=True)
    timestamp = Column(DateTime(timezone=True), default=datetime.utcnow, index=True)
    status = Column(String(50))
    metrics = Column(JSONB, default={})
    
    # Relationships
    node = relationship("Node", back_populates="heartbeats")
    
    def __repr__(self):
        return f"<HeartbeatLog(node_id='{self.node_id}', timestamp='{self.timestamp}')>"
    
    def to_dict(self):
        """Convert to dictionary"""
        return {
            "id": str(self.id),
            "node_id": str(self.node_id),
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "status": self.status,
            "metrics": self.metrics or {},
        }

