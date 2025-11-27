"""
Router Multimodal Support - Обробка images/files для DAARION Router
Додати цей код до існуючого Router на NODE1
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import base64
import io
from PIL import Image
import logging

logger = logging.getLogger(__name__)

class ContextPayload(BaseModel):
    system_prompt: Optional[str] = None
    images: Optional[List[str]] = None  # base64 encoded images
    files: Optional[List[Dict[str, str]]] = None  # file metadata + base64 data

class RouteRequest(BaseModel):
    agent: str
    message: str
    mode: str = "chat"
    payload: Optional[Dict[str, Any]] = None

# Vision-підтримуючі агенти
VISION_AGENTS = {
    'sofia': {
        'model': 'grok-4.1',
        'provider': 'xai',
        'supports_vision': True,
        'supports_files': True
    },
    'spectra': {
        'model': 'qwen3-vl:latest',
        'provider': 'ollama',
        'supports_vision': True,
        'supports_files': False
    },
    'daarwizz': {
        'model': 'qwen3-8b',
        'provider': 'ollama',
        'supports_vision': False,
        'supports_files': True
    },
    'solarius': {
        'model': 'deepseek-r1:70b',
        'provider': 'ollama',
        'supports_vision': False,
        'supports_files': True
    }
}

def process_images(images: List[str]) -> List[Image.Image]:
    """
    Конвертує base64 зображення в PIL Image об'єкти
    
    Args:
        images: List of base64 encoded images (with or without data:image/...;base64, prefix)
    
    Returns:
        List of PIL Image objects
    """
    processed = []
    
    for idx, img_data in enumerate(images):
        try:
            # Видалити data:image/...;base64, префікс
            if ',' in img_data:
                img_data = img_data.split(',')[1]
            
            # Декодувати base64
            img_bytes = base64.b64decode(img_data)
            img = Image.open(io.BytesIO(img_bytes))
            
            # Конвертувати в RGB якщо потрібно
            if img.mode != 'RGB':
                img = img.convert('RGB')
            
            processed.append(img)
            logger.info(f"✅ Processed image {idx + 1}: {img.size}, {img.mode}")
            
        except Exception as e:
            logger.error(f"❌ Failed to process image {idx + 1}: {e}")
            continue
    
    return processed

def process_files(files: List[Dict[str, str]]) -> List[Dict[str, Any]]:
    """
    Обробляє файли (PDF, TXT, MD, тощо)
    
    Args:
        files: List of {name, type, data} dicts with base64 encoded data
    
    Returns:
        List of processed files with metadata
    """
    processed = []
    
    for idx, file_data in enumerate(files):
        try:
            name = file_data.get('name', f'file_{idx + 1}')
            file_type = file_data.get('type', 'application/octet-stream')
            data = file_data.get('data', '')
            
            # Видалити data:...;base64, префікс
            if ',' in data:
                data = data.split(',')[1]
            
            # Декодувати base64
            file_bytes = base64.b64decode(data)
            
            # Спробувати витягти текст з різних типів файлів
            text_content = None
            if file_type.startswith('text/') or name.endswith(('.txt', '.md', '.json')):
                try:
                    text_content = file_bytes.decode('utf-8')
                except:
                    text_content = file_bytes.decode('latin-1')
            
            processed.append({
                'name': name,
                'type': file_type,
                'content': file_bytes,
                'text': text_content,
                'size': len(file_bytes)
            })
            
            logger.info(f"✅ Processed file {idx + 1}: {name} ({len(file_bytes)} bytes)")
            
        except Exception as e:
            logger.error(f"❌ Failed to process file {idx + 1}: {e}")
            continue
    
    return processed

def img_to_base64(img: Image.Image) -> str:
    """
    Конвертує PIL Image в base64 string
    
    Args:
        img: PIL Image object
    
    Returns:
        base64 encoded string
    """
    buffered = io.BytesIO()
    img.save(buffered, format="PNG")
    return base64.b64encode(buffered.getvalue()).decode()

async def route_multimodal(request: RouteRequest) -> Dict[str, Any]:
    """
    Обробляє multimodal запити з images/files
    
    Додати цю логіку в існуючий /route endpoint
    """
    try:
        # Отримати payload
        payload = request.payload or {}
        context = payload.get('context', {})
        
        # Визначити агента
        agent_id = request.agent
        agent_config = VISION_AGENTS.get(agent_id)
        
        if not agent_config:
            # Агент не знайдений в маппінгу - використати default
            agent_config = {
                'model': 'qwen3-8b',
                'provider': 'ollama',
                'supports_vision': False,
                'supports_files': False
            }
        
        # Обробити зображення (якщо є)
        images = None
        if context.get('images'):
            images = process_images(context['images'])
            logger.info(f"📷 Processed {len(images)} images")
            
            # Перевірити чи агент підтримує vision
            if not agent_config['supports_vision']:
                return {
                    "error": f"Агент {agent_id} не підтримує обробку зображень",
                    "suggestion": "Спробуйте sofia або spectra для vision tasks",
                    "available_vision_agents": [
                        k for k, v in VISION_AGENTS.items() if v['supports_vision']
                    ]
                }
        
        # Обробити файли (якщо є)
        files = None
        if context.get('files'):
            files = process_files(context['files'])
            logger.info(f"📎 Processed {len(files)} files")
            
            if not agent_config['supports_files']:
                logger.warning(f"⚠️ Agent {agent_id} may not support files properly")
        
        # Підготувати запит до LLM
        llm_request = {
            "model": agent_config['model'],
            "provider": agent_config['provider'],
            "messages": [
                {
                    "role": "system",
                    "content": context.get('system_prompt', '')
                },
                {
                    "role": "user",
                    "content": request.message
                }
            ]
        }
        
        # Додати зображення до запиту (для vision моделей)
        if images and agent_config['supports_vision']:
            if agent_config['provider'] == 'ollama':
                # Ollama Qwen3-VL format
                llm_request['images'] = [img_to_base64(img) for img in images]
            elif agent_config['provider'] == 'xai':
                # xAI grok-4.1 format
                # TODO: Перевірити правильний формат для grok-4.1
                llm_request['images'] = [img_to_base64(img) for img in images]
        
        # Додати файли як контекст
        if files:
            files_context = "\n\n" + "="*50 + "\n"
            files_context += "📎 Прикріплені файли:\n\n"
            
            for f in files:
                files_context += f"**{f['name']}** ({f['size']} bytes, {f['type']})\n"
                if f['text']:
                    # Якщо файл містить текст - додати його
                    files_context += f"```\n{f['text'][:2000]}\n```\n"
                    if len(f['text']) > 2000:
                        files_context += f"... (ще {len(f['text']) - 2000} символів)\n"
                files_context += "\n"
            
            files_context += "="*50
            
            # Додати до повідомлення користувача
            llm_request['messages'][-1]['content'] += files_context
        
        # Викликати LLM (інтеграція з існуючою логікою Router)
        # TODO: Замінити це на реальний виклик LLM
        response_text = await call_llm(llm_request)
        
        return {
            "data": {
                "text": response_text,
                "model": agent_config['model'],
                "provider": agent_config['provider']
            },
            "metadata": {
                "agent": agent_id,
                "has_images": bool(images),
                "has_files": bool(files),
                "images_count": len(images) if images else 0,
                "files_count": len(files) if files else 0
            }
        }
        
    except Exception as e:
        logger.error(f"❌ Multimodal routing error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

async def call_llm(request: Dict[str, Any]) -> str:
    """
    Викликає LLM (Ollama або xAI)
    
    Інтегрувати з існуючою логікою Router
    """
    # TODO: Реалізувати виклик LLM
    # Це має бути інтегровано з існуючою логікою Router
    pass

# Приклад використання в FastAPI
def add_multimodal_to_router(app: FastAPI):
    """
    Додає multimodal endpoints до існуючого Router
    """
    
    @app.post("/route")
    async def route(request: RouteRequest):
        """
        Оновлений /route endpoint з multimodal підтримкою
        """
        return await route_multimodal(request)
    
    @app.get("/agents/vision")
    async def get_vision_agents():
        """
        Повертає список агентів з vision підтримкою
        """
        return {
            "vision_agents": [
                {
                    "id": k,
                    "model": v['model'],
                    "provider": v['provider'],
                    "supports_vision": v['supports_vision'],
                    "supports_files": v['supports_files']
                }
                for k, v in VISION_AGENTS.items()
                if v['supports_vision']
            ]
        }

