"""
Q&A Builder - 2-stage pipeline for qa_pairs mode
Stage 1: PARSER (dots.ocr) → raw JSON
Stage 2: LLM (DAGI Router) → Q&A pairs
"""

import json
import logging
from typing import List, Dict, Any, Optional

import httpx

from app.schemas import QAPair, ParsedDocument
from app.core.config import settings

logger = logging.getLogger(__name__)


async def build_qa_pairs_via_router(
    parsed_doc: ParsedDocument,
    dao_id: str = "daarion"
) -> List[QAPair]:
    """
    2-stage pipeline: Generate Q&A pairs from parsed document using DAGI Router
    
    Args:
        parsed_doc: ParsedDocument from dots.ocr (stage 1)
        dao_id: DAO identifier
    
    Returns:
        List of QAPair objects
    """
    # Build prompt for LLM
    prompt = _build_qa_prompt(parsed_doc)
    
    # Prepare payload for DAGI Router
    payload = {
        "mode": "qa_build",  # New mode in Router
        "dao_id": dao_id,
        "user_id": "parser-service",
        "payload": {
            "instruction": prompt,
            "parsed_document": parsed_doc.model_dump(mode="json"),
        },
    }
    
    # Call DAGI Router
    router_url = f"{settings.ROUTER_BASE_URL.rstrip('/')}/route"
    logger.info(f"Calling DAGI Router for Q&A generation: {router_url}")
    
    try:
        async with httpx.AsyncClient(timeout=settings.ROUTER_TIMEOUT) as client:
            resp = await client.post(router_url, json=payload)
            resp.raise_for_status()
            data = resp.json()
            
            # Extract response text
            text = data.get("data", {}).get("text", "")
            if not text:
                logger.warning("Empty response from DAGI Router")
                return []
            
            # Parse JSON response
            qa_pairs = _parse_qa_response(text, parsed_doc)
            logger.info(f"Generated {len(qa_pairs)} Q&A pairs")
            return qa_pairs
            
    except httpx.HTTPError as e:
        logger.error(f"DAGI Router HTTP error: {e}")
        raise RuntimeError(f"DAGI Router API error: {e}") from e
    except Exception as e:
        logger.error(f"Failed to build Q&A pairs: {e}", exc_info=True)
        raise RuntimeError(f"Q&A generation failed: {e}") from e


def _build_qa_prompt(parsed_doc: ParsedDocument) -> str:
    """
    Build prompt for Q&A generation from parsed document
    
    Args:
        parsed_doc: ParsedDocument with structured content
    
    Returns:
        Prompt string for LLM
    """
    # Extract text content from document (first 5000 chars to avoid token limits)
    text_content = []
    for page in parsed_doc.pages:
        for block in page.blocks:
            if block.text:
                text_content.append(f"[Page {page.page_num}] {block.text}")
    
    document_text = "\n\n".join(text_content[:50])  # Limit to first 50 blocks
    if len(document_text) > 5000:
        document_text = document_text[:5000] + "..."
    
    prompt = (
        "Тобі дається результат OCR-документу у JSON-форматі (layout + текст).\n"
        "Твоє завдання: побудувати список запитань/відповідей, які покривають ключову "
        "інформацію цього документу.\n\n"
        "Формат відповіді — СУВОРО JSON-масив об'єктів:\n"
        "[\n"
        '  {"question": "...", "answer": "...", "source_page": <int|null>, "confidence": <float|null>},\n'
        "  ...\n"
        "]\n\n"
        "Вимоги:\n"
        "- Формулюй питання українською.\n"
        "- Відповіді мають базуватись на тексті документа (не вигадуй).\n"
        "- Якщо можна визначити номер сторінки — заповни поле source_page.\n"
        "- Не додавай ніякого пояснення поза JSON.\n"
        "- Мінімум 5-10 Q&A пар, максимум 20.\n\n"
        f"Документ:\n{document_text}\n\n"
        "Відповідь (тільки JSON):"
    )
    
    return prompt


def _parse_qa_response(text: str, parsed_doc: ParsedDocument) -> List[QAPair]:
    """
    Parse LLM response into QAPair objects
    
    Args:
        text: Response text from LLM (should be JSON)
        parsed_doc: Original parsed document (for page numbers)
    
    Returns:
        List of QAPair objects
    """
    # Try to extract JSON from response
    text_clean = text.strip()
    
    # Remove markdown code blocks if present
    if text_clean.startswith("```"):
        lines = text_clean.split("\n")
        text_clean = "\n".join(lines[1:-1]) if len(lines) > 2 else text_clean
    
    # Try to parse as JSON
    try:
        qa_data = json.loads(text_clean)
        if not isinstance(qa_data, list):
            logger.warning(f"Expected list, got {type(qa_data)}")
            return []
        
        # Convert to QAPair objects
        qa_pairs = []
        for item in qa_data:
            if not isinstance(item, dict):
                continue
            
            question = item.get("question", "").strip()
            answer = item.get("answer", "").strip()
            
            if not question or not answer:
                continue
            
            # Extract page number
            source_page = item.get("source_page")
            if source_page is None:
                # Try to infer from answer text
                source_page = _infer_page_number(answer, parsed_doc)
            
            qa_pairs.append(QAPair(
                question=question,
                answer=answer,
                source_page=source_page or 1,
                confidence=item.get("confidence")
            ))
        
        return qa_pairs
        
    except json.JSONDecodeError as e:
        logger.warning(f"Failed to parse JSON response: {e}")
        logger.debug(f"Response text: {text_clean[:500]}")
        return []


def _infer_page_number(text: str, parsed_doc: ParsedDocument) -> Optional[int]:
    """
    Try to infer page number from text content
    
    Args:
        text: Answer text
        parsed_doc: Parsed document
    
    Returns:
        Page number or None
    """
    # Simple heuristic: check if text appears in any page
    text_lower = text.lower()
    
    for page in parsed_doc.pages:
        for block in page.blocks:
            if block.text and text_lower in block.text.lower():
                return page.page_num
    
    return None

