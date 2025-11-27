"""
CRUD operations for Node Registry
"""
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
import socket
import uuid

from .models import Node, NodeProfile, HeartbeatLog
from .schemas import NodeRegister, HeartbeatRequest, NodeDiscoveryQuery


def generate_node_id(hostname: Optional[str] = None) -> str:
    """Generate unique node ID"""
    if not hostname:
        hostname = socket.gethostname()
    
    # Clean hostname
    hostname = hostname.lower().replace('.local', '').replace(' ', '-')
    
    # Add short UUID
    short_uuid = str(uuid.uuid4())[:8]
    
    return f"node-{hostname}-{short_uuid}"


def register_node(db: Session, node_data: NodeRegister) -> Node:
    """
    Register a new node or update existing one
    
    Args:
        db: Database session
        node_data: Node registration data
    
    Returns:
        Created or updated Node instance
    """
    # Generate node_id if not provided
    node_id = generate_node_id(node_data.hostname)
    
    # Check if node already exists
    existing_node = db.query(Node).filter(Node.node_id == node_id).first()
    
    if existing_node:
        # Update existing node
        existing_node.node_name = node_data.node_name or existing_node.node_name
        existing_node.node_role = node_data.node_role
        existing_node.node_type = node_data.node_type
        existing_node.ip_address = node_data.ip_address
        existing_node.local_ip = node_data.local_ip
        existing_node.hostname = node_data.hostname
        existing_node.status = "online"
        existing_node.last_heartbeat = datetime.utcnow()
        existing_node.node_metadata = {
            **(existing_node.node_metadata or {}),
            "capabilities": node_data.capabilities,
            "last_registration": datetime.utcnow().isoformat(),
        }
        existing_node.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(existing_node)
        return existing_node
    
    # Create new node
    node = Node(
        node_id=node_id,
        node_name=node_data.node_name or node_id,
        node_role=node_data.node_role,
        node_type=node_data.node_type,
        ip_address=node_data.ip_address,
        local_ip=node_data.local_ip,
        hostname=node_data.hostname,
        status="online",
        last_heartbeat=datetime.utcnow(),
        registered_at=datetime.utcnow(),
        node_metadata={
            "capabilities": node_data.capabilities,
            "first_registration": datetime.utcnow().isoformat(),
        }
    )
    
    db.add(node)
    db.commit()
    db.refresh(node)
    
    return node


def update_heartbeat(db: Session, heartbeat: HeartbeatRequest) -> bool:
    """
    Update node heartbeat
    
    Args:
        db: Database session
        heartbeat: Heartbeat data
    
    Returns:
        True if successful, False otherwise
    """
    node = db.query(Node).filter(Node.node_id == heartbeat.node_id).first()
    
    if not node:
        return False
    
    # Update node
    node.last_heartbeat = datetime.utcnow()
    node.status = heartbeat.status or "online"
    node.updated_at = datetime.utcnow()
    
    # Log heartbeat
    heartbeat_log = HeartbeatLog(
        node_id=node.id,
        timestamp=datetime.utcnow(),
        status=heartbeat.status,
        metrics=heartbeat.metrics or {}
    )
    
    db.add(heartbeat_log)
    db.commit()
    
    return True


def get_node(db: Session, node_id: str) -> Optional[Node]:
    """Get node by node_id"""
    return db.query(Node).filter(Node.node_id == node_id).first()


def list_nodes(
    db: Session,
    role: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 100,
    offset: int = 0
) -> List[Node]:
    """
    List nodes with optional filters
    
    Args:
        db: Database session
        role: Filter by role
        status: Filter by status
        limit: Maximum number of results
        offset: Number of results to skip
    
    Returns:
        List of Node instances
    """
    query = db.query(Node)
    
    if role:
        query = query.filter(Node.node_role == role)
    
    if status:
        query = query.filter(Node.status == status)
    
    return query.offset(offset).limit(limit).all()


def discover_nodes(db: Session, query: NodeDiscoveryQuery) -> List[Node]:
    """
    Discover nodes based on criteria
    
    Args:
        db: Database session
        query: Discovery query parameters
    
    Returns:
        List of matching Node instances
    """
    db_query = db.query(Node)
    
    # Filter by role
    if query.role:
        db_query = db_query.filter(Node.node_role == query.role)
    
    # Filter by type
    if query.type:
        db_query = db_query.filter(Node.node_type == query.type)
    
    # Filter by status
    if query.status:
        db_query = db_query.filter(Node.status == query.status)
    
    # Filter by capability (search in node_metadata)
    if query.capability:
        db_query = db_query.filter(
            Node.node_metadata['capabilities'].astext.contains(query.capability)
        )
    
    # Filter by labels
    if query.labels:
        for label in query.labels:
            db_query = db_query.filter(
                Node.node_metadata['capabilities'].astext.contains(label)
            )
    
    return db_query.all()


def cleanup_stale_nodes(db: Session, timeout_minutes: int = 5) -> int:
    """
    Mark nodes as offline if no heartbeat for timeout_minutes
    
    Args:
        db: Database session
        timeout_minutes: Timeout in minutes
    
    Returns:
        Number of nodes marked as offline
    """
    cutoff_time = datetime.utcnow() - timedelta(minutes=timeout_minutes)
    
    result = db.query(Node).filter(
        and_(
            Node.last_heartbeat < cutoff_time,
            Node.status == "online"
        )
    ).update({"status": "offline"})
    
    db.commit()
    
    return result


def get_node_metrics(db: Session, node_id: str, hours: int = 24) -> List[HeartbeatLog]:
    """
    Get node heartbeat metrics for the last N hours
    
    Args:
        db: Database session
        node_id: Node identifier
        hours: Number of hours to look back
    
    Returns:
        List of HeartbeatLog instances
    """
    node = get_node(db, node_id)
    if not node:
        return []
    
    cutoff_time = datetime.utcnow() - timedelta(hours=hours)
    
    return db.query(HeartbeatLog).filter(
        and_(
            HeartbeatLog.node_id == node.id,
            HeartbeatLog.timestamp >= cutoff_time
        )
    ).order_by(HeartbeatLog.timestamp.desc()).all()


def get_network_stats(db: Session) -> Dict[str, Any]:
    """
    Get network-wide statistics
    
    Returns:
        Dictionary with network stats
    """
    total_nodes = db.query(func.count(Node.id)).scalar()
    online_nodes = db.query(func.count(Node.id)).filter(Node.status == "online").scalar()
    offline_nodes = db.query(func.count(Node.id)).filter(Node.status == "offline").scalar()
    
    return {
        "total_nodes": total_nodes,
        "online_nodes": online_nodes,
        "offline_nodes": offline_nodes,
        "uptime_percentage": round((online_nodes / total_nodes * 100) if total_nodes > 0 else 0, 2),
    }

