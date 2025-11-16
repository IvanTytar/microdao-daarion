"""
RAG Prompt Builder - optimized prompts for DAO tokenomics and documents
"""

from typing import List, Dict, Any, Optional


def build_rag_prompt_with_citations(
    question: str,
    memory_context: Dict[str, Any],
    rag_citations: List[Dict[str, Any]],
    rag_documents: Optional[List[Dict[str, Any]]] = None
) -> str:
    """
    Build optimized prompt for RAG queries with citations
    
    Optimized for:
    - DAO tokenomics questions
    - Technical documentation
    - Multi-document answers with proper citations
    
    Args:
        question: User question
        memory_context: Memory context (facts, events, summaries)
        rag_citations: List of citations from RAG
        rag_documents: Optional full documents (for context)
    
    Returns:
        Formatted prompt for LLM
    """
    # Base system prompt
    system_prompt = (
        "Ти — експерт-консультант з токеноміки та архітектури DAO в екосистемі DAARION.city.\n"
        "Твоя задача: дати чітку, структуровану відповідь на основі наданих документів та особистої пам'яті.\n\n"
        "**Правила формування відповіді:**\n"
        "1. Використовуй тільки інформацію з наданих документів та пам'яті\n"
        "2. Посилайся на документи через індекси [1], [2], [3] тощо\n"
        "3. Для технічних термінів (стейкінг, токени, ролі) давай конкретні приклади\n"
        "4. Якщо в документах немає відповіді — чесно скажи, що не знаєш\n"
        "5. Відповідай українською, структуровано (списки, абзаци)\n\n"
    )
    
    # Build Memory section
    memory_section = build_memory_section(memory_context)
    
    # Build Documents section with citations
    documents_section = _build_documents_section(rag_citations, rag_documents)
    
    # Combine into final prompt
    prompt_parts = [system_prompt]
    
    if memory_section:
        prompt_parts.append("**1. Особиста пам'ять та контекст:**\n")
        prompt_parts.append(memory_section)
        prompt_parts.append("\n")
    
    if documents_section:
        prompt_parts.append("**2. Релевантні документи DAO:**\n")
        prompt_parts.append(documents_section)
        prompt_parts.append("\n")
    
    prompt_parts.append(f"**Питання користувача:**\n{question}\n\n")
    prompt_parts.append("**Твоя відповідь (з цитатами [1], [2] тощо):**")
    
    return "\n".join(prompt_parts)


def build_memory_section(memory_context: Dict[str, Any]) -> str:
    """Build memory context section"""
    parts = []
    
    # User facts
    facts = memory_context.get("facts", [])
    if facts:
        facts_list = []
        for fact in facts[:5]:  # Top 5 facts
            key = fact.get("fact_key", "")
            value = fact.get("fact_value", "")
            if key and value:
                facts_list.append(f"- {key}: {value}")
        
        if facts_list:
            parts.append("Особисті факти користувача:")
            parts.extend(facts_list)
            parts.append("")
    
    # Recent events
    events = memory_context.get("recent_events", [])
    if events:
        events_list = []
        for event in events[:3]:  # Last 3 events
            body = event.get("body_text", "")
            if body:
                events_list.append(f"- {body[:150]}...")
        
        if events_list:
            parts.append("Останні події в діалозі:")
            parts.extend(events_list)
            parts.append("")
    
    # Dialog summaries
    summaries = memory_context.get("dialog_summaries", [])
    if summaries:
        summary_text = summaries[0].get("summary_text", "")
        if summary_text:
            parts.append(f"Підсумок попередніх діалогів: {summary_text[:200]}...")
    
    return "\n".join(parts) if parts else ""


def _build_documents_section(
    citations: List[Dict[str, Any]],
    documents: Optional[List[Dict[str, Any]]] = None
) -> str:
    """
    Build documents section with proper citation format
    
    Format:
    [1] (doc_id=microdao-tokenomics, page=1, section=Токеноміка):
    MicroDAO використовує токен μGOV як ключ доступу...
    """
    if not citations:
        return "Документи не знайдено."
    
    parts = []
    
    for idx, citation in enumerate(citations[:5], start=1):  # Top 5 citations
        doc_id = citation.get("doc_id", "unknown")
        page = citation.get("page", 0)
        section = citation.get("section", "")
        excerpt = citation.get("excerpt", "")
        
        # Build citation header
        header_parts = [f"[{idx}]"]
        if doc_id != "unknown":
            header_parts.append(f"doc_id={doc_id}")
        if page:
            header_parts.append(f"page={page}")
        if section:
            header_parts.append(f"section={section}")
        
        header = " (" + ", ".join(header_parts) + "):"
        
        # Add excerpt
        if excerpt:
            # Limit excerpt length
            excerpt_clean = excerpt[:300] + "..." if len(excerpt) > 300 else excerpt
            parts.append(f"{header}\n{excerpt_clean}")
        else:
            parts.append(f"{header}\n(фрагмент недоступний)")
        
        parts.append("")  # Empty line between citations
    
    return "\n".join(parts)


def estimate_token_count(text: str, chars_per_token: float = 4.0) -> int:
    """
    Rough estimate of token count
    
    Args:
        text: Text to estimate
        chars_per_token: Average characters per token (default 4.0 for most models)
    
    Returns:
        Estimated token count
    """
    return int(len(text) / chars_per_token)

