"""
Agent Filter — Фільтрація повідомлень та автоматична маршрутизація
Виявляє spam, commands, згадування агентів, та визначає, чи потрібен агент
"""

import re
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta

# ============================================================================
# Spam Detection
# ============================================================================

SPAM_KEYWORDS = [
    "casino", "bet", "win money", "click here", "buy now",
    "viagra", "crypto pump", "free money", "investment opportunity"
]

SPAM_URL_PATTERN = re.compile(r"https?://[^\s]+\.(xyz|top|click|loan|win)")


def is_spam(text: str) -> bool:
    """
    Перевірити, чи є повідомлення спамом
    
    Правила:
    - Містить spam keywords
    - Містить підозрілі URL
    - Надмірна кількість emojis
    - Надмірна кількість великих літер
    """
    text_lower = text.lower()
    
    # Check keywords
    for keyword in SPAM_KEYWORDS:
        if keyword in text_lower:
            return True
    
    # Check suspicious URLs
    if SPAM_URL_PATTERN.search(text):
        return True
    
    # Too many emojis (>30% of text)
    emoji_count = len([c for c in text if ord(c) > 0x1F000])
    if len(text) > 0 and emoji_count / len(text) > 0.3:
        return True
    
    # Too many uppercase letters (>70%)
    if len(text) > 10:
        uppercase_count = sum(1 for c in text if c.isupper())
        if uppercase_count / len(text) > 0.7:
            return True
    
    return False


# ============================================================================
# Command Detection
# ============================================================================

COMMAND_PATTERN = re.compile(r"^[/!](\w+)(?:\s+(.*))?$")

def detect_command(text: str) -> Optional[Dict[str, Any]]:
    """
    Виявити команду в повідомленні
    
    Examples:
    - "/help" → {"command": "help", "args": None}
    - "!status sofia" → {"command": "status", "args": "sofia"}
    
    Returns:
        Dict або None, якщо немає команди
    """
    match = COMMAND_PATTERN.match(text.strip())
    if match:
        return {
            "command": match.group(1),
            "args": match.group(2)
        }
    return None


# ============================================================================
# Agent Mention Detection
# ============================================================================

AGENT_MENTION_PATTERN = re.compile(r"@(\w+)")

def detect_agent_mentions(text: str) -> List[str]:
    """
    Виявити згадування агентів у повідомленні
    
    Example:
    - "Hey @sofia, what's the status?" → ["sofia"]
    - "@yaromir @greenfood check this" → ["yaromir", "greenfood"]
    
    Returns:
        List агентів (без "@")
    """
    matches = AGENT_MENTION_PATTERN.findall(text)
    return list(set(matches))  # Unique


# ============================================================================
# Intent Detection (Simple Rule-Based)
# ============================================================================

QUESTION_KEYWORDS = ["what", "how", "why", "when", "where", "who", "що", "як", "коли", "де", "хто"]
GREETING_KEYWORDS = ["hello", "hi", "hey", "привіт", "добрий день"]
HELP_KEYWORDS = ["help", "допомога", "підказка"]

def detect_intent(text: str) -> str:
    """
    Виявити намір користувача
    
    Possible intents:
    - "question" — користувач ставить питання
    - "greeting" — вітання
    - "help" — запит допомоги
    - "statement" — звичайне повідомлення
    
    Returns:
        Intent string
    """
    text_lower = text.lower()
    
    # Check for question
    if any(keyword in text_lower for keyword in QUESTION_KEYWORDS):
        return "question"
    
    if "?" in text:
        return "question"
    
    # Check for greeting
    if any(keyword in text_lower for keyword in GREETING_KEYWORDS):
        return "greeting"
    
    # Check for help request
    if any(keyword in text_lower for keyword in HELP_KEYWORDS):
        return "help"
    
    return "statement"


# ============================================================================
# Rate Limiting (Simple In-Memory)
# ============================================================================

# User → last message timestamp
_user_last_message: Dict[str, datetime] = {}

def is_rate_limited(user_id: str, min_interval_seconds: int = 2) -> bool:
    """
    Перевірити, чи не надто часто користувач пише
    
    Args:
        user_id: ID користувача
        min_interval_seconds: Мінімальний інтервал між повідомленнями
    
    Returns:
        True, якщо користувач rate-limited
    """
    now = datetime.utcnow()
    
    if user_id in _user_last_message:
        last_message = _user_last_message[user_id]
        delta = now - last_message
        
        if delta.total_seconds() < min_interval_seconds:
            return True
    
    _user_last_message[user_id] = now
    return False


# ============================================================================
# Agent Routing Decision
# ============================================================================

class FilterResult:
    """Результат фільтрації повідомлення"""
    
    def __init__(
        self,
        action: str,  # "allow" | "deny" | "agent"
        reason: Optional[str] = None,
        agent_id: Optional[str] = None,
        command: Optional[Dict[str, Any]] = None,
        intent: Optional[str] = None
    ):
        self.action = action
        self.reason = reason
        self.agent_id = agent_id
        self.command = command
        self.intent = intent
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "action": self.action,
            "reason": self.reason,
            "agent_id": self.agent_id,
            "command": self.command,
            "intent": self.intent
        }


def filter_message(
    text: str,
    user_id: str,
    channel_agents: Optional[List[str]] = None
) -> FilterResult:
    """
    Основна функція фільтрації повідомлення
    
    Args:
        text: Текст повідомлення
        user_id: ID користувача
        channel_agents: Список агентів, доступних у каналі
    
    Returns:
        FilterResult з рішенням про обробку
    """
    channel_agents = channel_agents or []
    
    # 1. Check spam
    if is_spam(text):
        return FilterResult(action="deny", reason="spam")
    
    # 2. Check rate limiting
    if is_rate_limited(user_id):
        return FilterResult(action="deny", reason="rate_limited")
    
    # 3. Check commands
    command = detect_command(text)
    if command:
        # Команди завжди дозволені, але можуть бути оброблені агентом
        if command["command"] in ["help", "status", "list"]:
            # Вибрати першого доступного агента (якщо є)
            if channel_agents:
                return FilterResult(
                    action="agent",
                    agent_id=f"agent:{channel_agents[0]}",
                    command=command,
                    reason="command"
                )
        return FilterResult(action="allow", reason="command", command=command)
    
    # 4. Check agent mentions
    mentions = detect_agent_mentions(text)
    if mentions:
        # Перевірити, чи згаданий агент доступний у каналі
        for mention in mentions:
            if mention in channel_agents:
                return FilterResult(
                    action="agent",
                    agent_id=f"agent:{mention}",
                    reason="mention"
                )
    
    # 5. Detect intent
    intent = detect_intent(text)
    
    # Якщо це питання і є агенти — можливо, агент може відповісти
    if intent == "question" and channel_agents:
        # Вибрати першого доступного агента
        return FilterResult(
            action="agent",
            agent_id=f"agent:{channel_agents[0]}",
            intent=intent,
            reason="auto_question"
        )
    
    # Default: allow message
    return FilterResult(action="allow", reason="normal_message", intent=intent)

