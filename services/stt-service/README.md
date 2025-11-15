# STT Service (Speech-to-Text)

Сервіс для розпізнавання мови з аудіо файлів за допомогою Qwen3 ASR Toolkit.

## Можливості

- Розпізнавання мови з голосових повідомлень (Telegram voice, audio, video_note)
- Підтримка форматів: ogg, mp3, wav, m4a, webm, flac
- Автоматична обробка та конвертація аудіо (всередині qwen3_asr_toolkit)
- Чистий Python API без subprocess/CLI викликів
- Висока якість розпізнавання української мови

## Запуск

### Локально (development)

```bash
cd services/stt-service
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 9000
```

### Docker

```bash
docker-compose up stt-service
```

## API

### POST /stt

Розпізнати мову з аудіо файлу.

**Request:**
- `file`: аудіо файл (multipart/form-data)

**Response:**
```json
{
  "text": "розпізнаний текст",
  "language": "uk",
  "duration": 5.2
}
```

**Приклад:**
```bash
curl -X POST http://localhost:9000/stt \
  -F "file=@voice.ogg"
```

### GET /health

Health check endpoint.

## Конфігурація

### Environment Variables

- `DASHSCOPE_API_KEY`: **Обов'язково** - API ключ DashScope для доступу до Qwen3 ASR API
  - Отримати ключ: https://dashscope.console.aliyun.com/
  - Встановити: `export DASHSCOPE_API_KEY="your-api-key"`

### Отримання API ключа DashScope

1. Зареєструйтеся на https://dashscope.console.aliyun.com/
2. Створіть API ключ в розділі "API Keys"
3. Встановіть змінну середовища `DASHSCOPE_API_KEY`

## Інтеграція з Gateway

Gateway автоматично використовує STT-сервіс для обробки голосових повідомлень з Telegram:

1. Користувач надсилає voice/audio/video_note
2. Gateway завантажує файл з Telegram
3. Gateway відправляє файл в STT-сервіс
4. STT повертає розпізнаний текст
5. Текст відправляється в DAGI Router як звичайне текстове повідомлення

## Встановлення залежностей

### qwen3-asr-toolkit

```bash
pip install qwen3-asr-toolkit
```

### ffmpeg (може знадобитися для деяких форматів)

```bash
# Ubuntu/Debian
sudo apt-get install ffmpeg

# macOS
brew install ffmpeg

# Docker
Вже включено в Dockerfile
```

## Troubleshooting

### Помилка: "qwen3_asr_toolkit not available"

Встановіть бібліотеку:
```bash
pip install qwen3-asr-toolkit
```

### Помилка: "DASHSCOPE_API_KEY not configured"

Встановіть змінну середовища:
```bash
export DASHSCOPE_API_KEY="your-api-key"
```

Або додайте в `docker-compose.yml`:
```yaml
environment:
  - DASHSCOPE_API_KEY=${DASHSCOPE_API_KEY}
```

### Помилка: "ffmpeg not found"

Встановіть ffmpeg (див. вище). Більшість форматів обробляються без ffmpeg, але деякі можуть його потребувати.

