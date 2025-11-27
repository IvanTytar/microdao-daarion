"""
Monitor Agent Logger - Автоматичне створення MD файлів та Jupyter Notebook
для кожного Monitor Agent з усіма змінами та подіями
"""

import os
import json
from datetime import datetime
from typing import Dict, Any, Optional
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

# Базовий шлях для збереження логів Monitor Agent
MONITOR_LOGS_DIR = Path(os.getenv("MONITOR_LOGS_DIR", "docs/monitor_agents"))
MONITOR_LOGS_DIR.mkdir(parents=True, exist_ok=True)


def get_monitor_agent_file_paths(agent_id: str) -> Dict[str, Path]:
    """
    Отримати шляхи до MD файлу та Jupyter Notebook для Monitor Agent
    
    Args:
        agent_id: ID Monitor Agent (monitor, monitor-node-{node_id}, monitor-microdao-{microdao_id})
    
    Returns:
        Dict з шляхами до MD файлу та Jupyter Notebook
    """
    # Нормалізуємо agent_id для використання в іменах файлів
    safe_id = agent_id.replace('/', '_').replace(':', '_')
    
    return {
        'md': MONITOR_LOGS_DIR / f"{safe_id}_changes.md",
        'ipynb': MONITOR_LOGS_DIR / f"{safe_id}_changes.ipynb",
    }


def append_to_markdown(agent_id: str, change: Dict[str, Any], message: str) -> None:
    """
    Додати зміну до MD файлу Monitor Agent
    
    Args:
        agent_id: ID Monitor Agent
        change: Дані про зміну
        message: Повідомлення від Monitor Agent
    """
    try:
        file_paths = get_monitor_agent_file_paths(agent_id)
        md_path = file_paths['md']
        
        # Створюємо файл, якщо його немає
        if not md_path.exists():
            md_path.parent.mkdir(parents=True, exist_ok=True)
            with open(md_path, 'w', encoding='utf-8') as f:
                f.write(f"# 📊 Monitor Agent: {agent_id}\n\n")
                f.write(f"**Автоматично створено:** {datetime.now().isoformat()}\n\n")
                f.write("---\n\n")
                f.write("## 📝 Історія змін\n\n")
        
        # Додаємо нову зміну
        timestamp = change.get('timestamp', datetime.now().isoformat())
        change_type = change.get('type', 'unknown')
        change_action = change.get('action', 'unknown')
        path = change.get('path', 'unknown')
        description = change.get('description', '')
        
        with open(md_path, 'a', encoding='utf-8') as f:
            f.write(f"### {timestamp}\n\n")
            f.write(f"**Тип:** {change_type} | **Дія:** {change_action}\n\n")
            f.write(f"**Шлях:** `{path}`\n\n")
            if description:
                f.write(f"**Опис:** {description}\n\n")
            f.write(f"**Повідомлення від Monitor Agent:**\n\n")
            f.write(f"{message}\n\n")
            f.write("---\n\n")
        
        logger.debug(f"✅ Appended change to {md_path}")
    except Exception as e:
        logger.error(f"❌ Error appending to markdown: {e}")


def append_to_notebook(agent_id: str, change: Dict[str, Any], message: str) -> None:
    """
    Додати зміну до Jupyter Notebook Monitor Agent
    
    Args:
        agent_id: ID Monitor Agent
        change: Дані про зміну
        message: Повідомлення від Monitor Agent
    """
    try:
        file_paths = get_monitor_agent_file_paths(agent_id)
        ipynb_path = file_paths['ipynb']
        
        # Створюємо notebook, якщо його немає
        if not ipynb_path.exists():
            notebook = {
                "cells": [
                    {
                        "cell_type": "markdown",
                        "metadata": {},
                        "source": [
                            f"# 📊 Monitor Agent: {agent_id}\n",
                            f"\n",
                            f"**Автоматично створено:** {datetime.now().isoformat()}\n",
                            f"\n",
                            f"---\n",
                            f"\n",
                            f"## 📝 Історія змін\n",
                            f"\n",
                            f"Цей notebook автоматично оновлюється при кожній зміні в проєкті."
                        ]
                    }
                ],
                "metadata": {
                    "kernelspec": {
                        "display_name": "Python 3",
                        "language": "python",
                        "name": "python3"
                    },
                    "language_info": {
                        "name": "python",
                        "version": "3.11"
                    }
                },
                "nbformat": 4,
                "nbformat_minor": 4
            }
        else:
            # Читаємо існуючий notebook
            with open(ipynb_path, 'r', encoding='utf-8') as f:
                notebook = json.load(f)
        
        # Додаємо нову комірку зі зміною
        timestamp = change.get('timestamp', datetime.now().isoformat())
        change_type = change.get('type', 'unknown')
        change_action = change.get('action', 'unknown')
        path = change.get('path', 'unknown')
        description = change.get('description', '')
        
        new_cell = {
            "cell_type": "markdown",
            "metadata": {
                "timestamp": timestamp,
                "change_type": change_type,
                "change_action": change_action,
                "path": path
            },
            "source": [
                f"### {timestamp}\n",
                f"\n",
                f"**Тип:** {change_type} | **Дія:** {change_action}\n",
                f"\n",
                f"**Шлях:** `{path}`\n",
                f"\n",
                f"**Опис:** {description}\n",
                f"\n",
                f"**Повідомлення від Monitor Agent:**\n",
                f"\n",
                f"{message}\n",
                f"\n",
                f"---\n"
            ]
        }
        
        # Додаємо комірку на початок (нові зміни зверху)
        notebook['cells'].insert(1, new_cell)
        
        # Зберігаємо максимум 200 комірок (крім першої заголовної)
        if len(notebook['cells']) > 201:
            notebook['cells'] = [notebook['cells'][0]] + notebook['cells'][1:201]
        
        # Зберігаємо notebook
        with open(ipynb_path, 'w', encoding='utf-8') as f:
            json.dump(notebook, f, indent=2, ensure_ascii=False)
        
        logger.debug(f"✅ Appended change to {ipynb_path}")
    except Exception as e:
        logger.error(f"❌ Error appending to notebook: {e}")


def log_monitor_change(agent_id: str, change: Dict[str, Any], message: str) -> None:
    """
    Зберегти зміну в MD файл та Jupyter Notebook для Monitor Agent
    
    Args:
        agent_id: ID Monitor Agent
        change: Дані про зміну
        message: Повідомлення від Monitor Agent
    """
    try:
        # Додаємо до MD файлу
        append_to_markdown(agent_id, change, message)
        
        # Додаємо до Jupyter Notebook
        append_to_notebook(agent_id, change, message)
        
        logger.info(f"✅ Logged change to files for {agent_id}")
    except Exception as e:
        logger.error(f"❌ Error logging change: {e}")


def get_monitor_agent_file_urls(agent_id: str, base_url: str = "/") -> Dict[str, str]:
    """
    Отримати URL для MD файлу та Jupyter Notebook Monitor Agent
    
    Args:
        agent_id: ID Monitor Agent
        base_url: Базовий URL для посилань
    
    Returns:
        Dict з URL до MD файлу та Jupyter Notebook
    """
    file_paths = get_monitor_agent_file_paths(agent_id)
    
    # Конвертуємо абсолютні шляхи в відносні від кореня проєкту
    project_root = Path.cwd()
    
    md_relative = file_paths['md'].relative_to(project_root) if file_paths['md'].is_relative_to(project_root) else file_paths['md']
    ipynb_relative = file_paths['ipynb'].relative_to(project_root) if file_paths['ipynb'].is_relative_to(project_root) else file_paths['ipynb']
    
    return {
        'md': f"{base_url}{md_relative.as_posix()}",
        'ipynb': f"{base_url}{ipynb_relative.as_posix()}",
    }




