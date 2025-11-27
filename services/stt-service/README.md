# STT Service - Speech-to-Text для DAARION

Сервіс конвертації аудіо в текст використовуючи OpenAI Whisper AI.

## Можливості

- 🎤 **Розпізнавання мови**: Whisper AI (base model)
- 🌍 **Мультимовність**: Підтримка української та інших мов
- 📊 **Формати аудіо**: webm, mp3, wav, m4a, ogg
- 🚀 **Швидкість**: ~5-10 секунд для 1 хвилини аудіо
- 🔒 **Безпека**: Локальна обробка, без відправки на зовнішні сервери

## Встановлення

### Docker (рекомендовано)

```bash
cd services/stt-service
docker-compose up -d
```

### Локально

```bash
cd services/stt-service
pip install -r requirements.txt
python -m app.main
```

## API Endpoints

### 1. POST /api/stt

Конвертує base64 аудіо в текст.

**Request:**
```json
POST http://localhost:8895/api/stt
Content-Type: application/json

{
  "audio": "data:audio/webm;base64,GkXfo59ChoEBQveBAULygQRC...",
  "language": "uk",
  "model": "base"
}
```

**Response:**
```json
{
  "text": "Привіт, це тестове повідомлення",
  "language": "uk",
  "duration": 2.5,
  "model": "base",
  "confidence": 0.95
}
```

---

### 2. POST /api/stt/upload

Конвертує завантажений аудіо файл в текст.

**Request:**
```bash
curl -X POST http://localhost:8895/api/stt/upload \
  -F "file=@recording.webm"
```

**Response:**
```json
{
  "text": "Привіт, це тестове повідомлення",
  "filename": "recording.webm",
  "language": "uk",
  "model": "base"
}
```

---

### 3. GET /health

Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "whisper": "available",
  "model": "base"
}
```

## Інтеграція з Frontend

### 1. Оновити Enhanced Chat

**Файл:** `src/components/microdao/MicroDaoOrchestratorChatEnhanced.tsx`

```typescript
// Після запису аудіо
const handleVoiceStop = async () => {
  if (mediaRecorderRef.current) {
    mediaRecorderRef.current.stop();
    
    mediaRecorderRef.current.onstop = async () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      
      // Конвертувати в base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Audio = reader.result as string;
        
        // Відправити на STT Service
        try {
          const response = await fetch('http://localhost:8895/api/stt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              audio: base64Audio,
              language: 'uk',
              model: 'base'
            })
          });
          
          const data = await response.json();
          
          // Додати розшифрований текст в input
          setInput((prev) => prev + (prev ? ' ' : '') + data.text);
          console.log('✅ STT:', data.text);
          
        } catch (error) {
          console.error('❌ STT error:', error);
          // Fallback - показати що аудіо записано
          setInput((prev) => prev + ' 🎤 [Голосове повідомлення]');
        }
      };
      reader.readAsDataURL(audioBlob);
    };
  }
  
  setIsRecording(false);
};
```

## Моделі Whisper

| Модель | Розмір | VRAM | Швидкість | Точність |
|--------|--------|------|-----------|----------|
| tiny   | 39 MB  | ~1 GB | Дуже швидко | Низька |
| base   | 74 MB  | ~1 GB | Швидко | Середня |
| small  | 244 MB | ~2 GB | Середньо | Хороша |
| medium | 769 MB | ~5 GB | Повільно | Висока |
| large  | 1550 MB | ~10 GB | Дуже повільно | Найвища |

**Рекомендація для НОДА2:** `base` (баланс швидкості та точності)

## Підтримувані мови

- 🇺🇦 Українська (uk)
- 🇬🇧 Англійська (en)
- 🇷🇺 Російська (ru)
- 🇵🇱 Польська (pl)
- 🇩🇪 Німецька (de)
- 🇫🇷 Французька (fr)
- ... і ще 90+ мов

## Тестування

### 1. cURL (base64)

```bash
# Записати аудіо
ffmpeg -f avfoundation -i ":0" -t 5 test.webm

# Конвертувати в base64
BASE64_AUDIO=$(base64 -i test.webm)

# Відправити на STT
curl -X POST http://localhost:8895/api/stt \
  -H "Content-Type: application/json" \
  -d "{\"audio\":\"data:audio/webm;base64,$BASE64_AUDIO\",\"language\":\"uk\"}"
```

### 2. cURL (file upload)

```bash
curl -X POST http://localhost:8895/api/stt/upload \
  -F "file=@test.webm"
```

### 3. Python

```python
import requests
import base64

# Прочитати аудіо файл
with open('test.webm', 'rb') as f:
    audio_bytes = f.read()

# Конвертувати в base64
audio_base64 = base64.b64encode(audio_bytes).decode()

# Відправити на STT
response = requests.post('http://localhost:8895/api/stt', json={
    'audio': f'data:audio/webm;base64,{audio_base64}',
    'language': 'uk',
    'model': 'base'
})

print(response.json())
```

## Конфігурація

### Environment Variables

```bash
# .env файл
WHISPER_MODEL=base     # tiny, base, small, medium, large
WHISPER_LANGUAGE=uk    # uk, en, ru, pl, de, fr
```

### Docker Compose

```yaml
environment:
  - WHISPER_MODEL=base
  - WHISPER_LANGUAGE=uk
  - LOG_LEVEL=INFO
```

## Troubleshooting

### Помилка: "ffmpeg not found"

```bash
# Ubuntu/Debian
apt-get install ffmpeg

# macOS
brew install ffmpeg
```

### Помилка: "torch not compatible"

```bash
# Переінсталювати PyTorch
pip uninstall torch torchaudio
pip install torch==2.1.0 torchaudio==2.1.0
```

### Помилка: "Whisper model not found"

```bash
# Завантажити модель вручну
python -c "import whisper; whisper.load_model('base')"
```

## Метрики

- **Endpoint:** `http://localhost:8895/metrics` (TODO)
- **Prometheus:** Інтеграція заплановано
- **Grafana:** Dashboard заплановано

## Статус

- ✅ Базова функціональність
- ✅ Docker підтримка
- ✅ Whisper AI інтеграція
- ⚠️ Потребує тестування
- 🔄 Frontend інтеграція (наступний крок)

## Автор

DAARION Team - 2025
