"""
Structured JSON logging for DAGI Stack
Provides consistent logging format across all services
"""
import json
import logging
import sys
from datetime import datetime
from typing import Any, Dict
import uuid


class JSONFormatter(logging.Formatter):
    """JSON formatter for structured logging"""
    
    def __init__(self, service_name: str):
        super().__init__()
        self.service_name = service_name
    
    def format(self, record: logging.LogRecord) -> str:
        """Format log record as JSON"""
        log_data: Dict[str, Any] = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": record.levelname,
            "service": self.service_name,
            "message": record.getMessage(),
            "logger": record.name,
        }
        
        # Add exception info if present
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)
        
        # Add extra fields from record
        for field in ["request_id", "user_id", "dao_id", "duration_ms", "status_code", "metadata"]:
            if hasattr(record, field):
                log_data[field] = getattr(record, field)
        
        return json.dumps(log_data)


def setup_logger(service_name: str, log_level: str = "INFO", log_format: str = "json") -> logging.Logger:
    """Setup structured logger for a service"""
    logger = logging.getLogger(service_name)
    logger.setLevel(getattr(logging, log_level.upper()))
    logger.handlers.clear()
    
    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(getattr(logging, log_level.upper()))
    
    if log_format == "json":
        formatter = JSONFormatter(service_name)
    else:
        formatter = logging.Formatter(f"%(asctime)s - {service_name} - %(levelname)s - %(message)s")
    
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    
    return logger


def generate_request_id() -> str:
    """Generate unique request ID"""
    return str(uuid.uuid4())
