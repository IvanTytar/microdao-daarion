"""
Quotas & Rate Limits — Обмеження використання агентів
"""

import time
from typing import Dict, Optional
from datetime import datetime, timedelta
from collections import defaultdict

# ============================================================================
# Quota Configuration
# ============================================================================

class QuotaConfig:
    """Конфігурація квот"""
    
    def __init__(
        self,
        tokens_per_minute: int = 1000,
        runs_per_day: int = 100,
        users_per_day: int = 50,
        max_concurrent_runs: int = 5
    ):
        self.tokens_per_minute = tokens_per_minute
        self.runs_per_day = runs_per_day
        self.users_per_day = users_per_day
        self.max_concurrent_runs = max_concurrent_runs


# Default quota configurations
DEFAULT_QUOTAS = {
    "free": QuotaConfig(
        tokens_per_minute=500,
        runs_per_day=50,
        users_per_day=20,
        max_concurrent_runs=2
    ),
    "pro": QuotaConfig(
        tokens_per_minute=2000,
        runs_per_day=500,
        users_per_day=200,
        max_concurrent_runs=10
    ),
    "enterprise": QuotaConfig(
        tokens_per_minute=10000,
        runs_per_day=5000,
        users_per_day=1000,
        max_concurrent_runs=50
    )
}


# ============================================================================
# Quota Tracker
# ============================================================================

class QuotaTracker:
    """
    Трекер використання ресурсів агентами
    
    Тримає в пам'яті (in-memory) лічильники для:
    - Токенів за хвилину
    - Запусків за день
    - Унікальних користувачів за день
    - Паралельних запусків
    """
    
    def __init__(self):
        # Agent ID → tokens used in current minute
        self._tokens_minute: Dict[str, list[tuple[float, int]]] = defaultdict(list)
        
        # Agent ID → runs count today
        self._runs_today: Dict[str, int] = defaultdict(int)
        self._runs_today_date: Optional[str] = None
        
        # Agent ID → unique users today
        self._users_today: Dict[str, set[str]] = defaultdict(set)
        
        # Agent ID → concurrent runs count
        self._concurrent_runs: Dict[str, int] = defaultdict(int)
    
    def check_tokens_quota(self, agent_id: str, tokens: int, quota: QuotaConfig) -> bool:
        """
        Перевірити, чи не перевищено квоту токенів за хвилину
        
        Args:
            agent_id: ID агента
            tokens: Кількість токенів для використання
            quota: Конфігурація квот
        
        Returns:
            True, якщо квота дозволяє використання
        """
        now = time.time()
        one_minute_ago = now - 60
        
        # Видалити старі записи (старше 1 хвилини)
        self._tokens_minute[agent_id] = [
            (ts, count) for ts, count in self._tokens_minute[agent_id]
            if ts > one_minute_ago
        ]
        
        # Підрахувати використані токени за останню хвилину
        used_tokens = sum(count for _, count in self._tokens_minute[agent_id])
        
        # Перевірити квоту
        if used_tokens + tokens > quota.tokens_per_minute:
            return False
        
        return True
    
    def record_tokens(self, agent_id: str, tokens: int) -> None:
        """
        Записати використані токени
        
        Args:
            agent_id: ID агента
            tokens: Кількість використаних токенів
        """
        now = time.time()
        self._tokens_minute[agent_id].append((now, tokens))
    
    def check_runs_quota(self, agent_id: str, quota: QuotaConfig) -> bool:
        """
        Перевірити, чи не перевищено квоту запусків за день
        
        Args:
            agent_id: ID агента
            quota: Конфігурація квот
        
        Returns:
            True, якщо квота дозволяє запуск
        """
        today = datetime.utcnow().strftime("%Y-%m-%d")
        
        # Скинути лічильники, якщо новий день
        if self._runs_today_date != today:
            self._runs_today.clear()
            self._users_today.clear()
            self._runs_today_date = today
        
        # Перевірити квоту
        if self._runs_today[agent_id] >= quota.runs_per_day:
            return False
        
        return True
    
    def record_run(self, agent_id: str, user_id: Optional[str] = None) -> None:
        """
        Записати запуск
        
        Args:
            agent_id: ID агента
            user_id: ID користувача (опційно)
        """
        today = datetime.utcnow().strftime("%Y-%m-%d")
        
        # Скинути лічильники, якщо новий день
        if self._runs_today_date != today:
            self._runs_today.clear()
            self._users_today.clear()
            self._runs_today_date = today
        
        self._runs_today[agent_id] += 1
        
        if user_id:
            self._users_today[agent_id].add(user_id)
    
    def check_users_quota(self, agent_id: str, user_id: str, quota: QuotaConfig) -> bool:
        """
        Перевірити, чи не перевищено квоту унікальних користувачів за день
        
        Args:
            agent_id: ID агента
            user_id: ID користувача
            quota: Конфігурація квот
        
        Returns:
            True, якщо квота дозволяє користувача
        """
        today = datetime.utcnow().strftime("%Y-%m-%d")
        
        # Скинути лічильники, якщо новий день
        if self._runs_today_date != today:
            self._runs_today.clear()
            self._users_today.clear()
            self._runs_today_date = today
        
        # Якщо користувач вже був — завжди дозволяємо
        if user_id in self._users_today[agent_id]:
            return True
        
        # Перевірити квоту нових користувачів
        if len(self._users_today[agent_id]) >= quota.users_per_day:
            return False
        
        return True
    
    def check_concurrent_runs(self, agent_id: str, quota: QuotaConfig) -> bool:
        """
        Перевірити, чи не перевищено квоту паралельних запусків
        
        Args:
            agent_id: ID агента
            quota: Конфігурація квот
        
        Returns:
            True, якщо квота дозволяє запуск
        """
        if self._concurrent_runs[agent_id] >= quota.max_concurrent_runs:
            return False
        
        return True
    
    def start_run(self, agent_id: str) -> None:
        """
        Почати запуск (збільшити лічильник паралельних запусків)
        
        Args:
            agent_id: ID агента
        """
        self._concurrent_runs[agent_id] += 1
    
    def finish_run(self, agent_id: str) -> None:
        """
        Завершити запуск (зменшити лічильник паралельних запусків)
        
        Args:
            agent_id: ID агента
        """
        if self._concurrent_runs[agent_id] > 0:
            self._concurrent_runs[agent_id] -= 1
    
    def get_usage_stats(self, agent_id: str) -> Dict:
        """
        Отримати статистику використання агента
        
        Args:
            agent_id: ID агента
        
        Returns:
            Dict зі статистикою
        """
        now = time.time()
        one_minute_ago = now - 60
        
        # Токени за останню хвилину
        tokens_minute = sum(
            count for ts, count in self._tokens_minute[agent_id]
            if ts > one_minute_ago
        )
        
        today = datetime.utcnow().strftime("%Y-%m-%d")
        if self._runs_today_date != today:
            runs_today = 0
            users_today = 0
        else:
            runs_today = self._runs_today[agent_id]
            users_today = len(self._users_today[agent_id])
        
        return {
            "tokens_minute": tokens_minute,
            "runs_today": runs_today,
            "users_today": users_today,
            "concurrent_runs": self._concurrent_runs[agent_id]
        }


# ============================================================================
# Global Quota Tracker Instance
# ============================================================================

_global_tracker = QuotaTracker()

def get_quota_tracker() -> QuotaTracker:
    """Отримати глобальний екземпляр QuotaTracker"""
    return _global_tracker

