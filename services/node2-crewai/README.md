# CrewAI для microDAO Node-2

## 🎯 Призначення

CrewAI використовується для формування команд агентів (10-35 агентів) на microDAO Node-2.

## 📁 Структура

```
~/node2/crewai/
├── agents/              # Визначення агентів
│   └── example_agent.py
├── crews/               # Формування команд
│   └── example_crew.py
├── tasks/               # Задачі для агентів
├── tools/               # Інструменти для агентів
├── config/              # Конфігурація
│   └── node2_crewai_config.yaml
└── requirements.txt     # Залежності
```

## 🚀 Швидкий старт

### 1. Встановити залежності

```bash
cd ~/node2/crewai
pip install -r requirements.txt
```

### 2. Створити агентів

Коли отримаєте список агентів, створіть їх у `agents/`:

```python
from crewai import Agent

my_agent = Agent(
    role="Agent Role",
    goal="Agent Goal",
    backstory="Agent Backstory",
    tools=[...],
    llm=...  # Will use Swoper/Ollama
)
```

### 3. Створити команди (crews)

```python
from crewai import Crew, Process

my_crew = Crew(
    agents=[agent1, agent2, ...],
    tasks=[task1, task2, ...],
    process=Process.sequential,
    verbose=True,
    memory=True
)
```

### 4. Запустити команду

```python
result = my_crew.kickoff()
```

## 🔗 Інтеграція з microDAO Node-2

### LLM Provider (Swoper/Ollama)

CrewAI буде використовувати Swoper через Ollama API:

```python
from langchain_community.llms import Ollama

llm = Ollama(
    base_url="http://localhost:11434",
    model="deepseek-r1"  # або інша модель
)
```

### Memory (RAG Router)

Агенти можуть використовувати локальну пам'ять через RAG Router:

```python
from crewai_tools import tool

@tool("Local Memory Search")
def local_memory_search(query: str) -> str:
    # Використовує RAG Router для пошуку
    ...
```

## 📋 Очікується

- Список агентів (10-35 агентів)
- Призначення LLM для кожного агента
- Структура команд (crews)

## ⏭️ Наступні кроки

1. Дочекатися списку агентів від користувача
2. Створити агентів з CrewAI
3. Сформувати команди
4. Інтегрувати з NodeAgent
5. Запустити команди агентів



