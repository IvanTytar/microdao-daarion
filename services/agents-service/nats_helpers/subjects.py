"""
NATS Subject Registry — Централізований реєстр всіх NATS subjects для Agents Core
"""

# ============================================================================
# PUBLISH (Agents Service → NATS)
# ============================================================================

# Matrix integration (stub для майбутнього)
INTEGRATION_MATRIX_MESSAGE = "integration.matrix.message"

# Agent lifecycle
AGENTS_INVOKE = "agents.invoke"
AGENTS_REPLY = "agents.reply"
AGENTS_ERROR = "agents.error"
AGENTS_TELEMETRY = "agents.telemetry"

# Agent runs
AGENTS_RUNS_CREATED = "agents.runs.created"
AGENTS_RUNS_FINISHED = "agents.runs.finished"

# Agent activity (для living map)
AGENTS_ACTIVITY = "agents.activity"

# ============================================================================
# SUBSCRIBE (Agents Service ← NATS)
# ============================================================================

# Messenger events
MESSAGE_CREATED = "message.created"
MESSAGE_UPDATED = "message.updated"
MESSAGE_DELETED = "message.deleted"

# Task events
TASK_CREATED = "task.created"
TASK_UPDATED = "task.updated"
TASK_ASSIGNED = "task.assigned"

# User actions
EVENT_USER_ACTION = "event.user.action"

# Usage tracking (already subscribed in Phase 6)
USAGE_AGENT = "usage.agent"
USAGE_LLM = "usage.llm"
USAGE_TOOL = "usage.tool"

# Agent replies
AGENT_REPLY_SENT = "agent.reply.sent"
AGENT_ERROR_EVENT = "agent.error"

# ============================================================================
# Subject Patterns (wildcards)
# ============================================================================

AGENTS_ALL = "agents.*"
MESSAGE_ALL = "message.*"
USAGE_ALL = "usage.*"
EVENT_ALL = "event.*"

# ============================================================================
# Helper Functions
# ============================================================================

def get_agent_subject(agent_id: str, event_type: str) -> str:
    """
    Генерує subject для конкретного агента
    Example: agents.agent:sofia.invoke
    """
    return f"agents.{agent_id}.{event_type}"

def get_channel_subject(channel_id: str, event_type: str) -> str:
    """
    Генерує subject для конкретного каналу
    Example: channel.channel:123.message.created
    """
    return f"channel.{channel_id}.{event_type}"

