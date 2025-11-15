# STT Service (Speech-to-Text)

Сервіс для розпізнавання мови з аудіо файлів за допомогою Whisper.

## Можливості

- Розпізнавання мови з голосових повідомлень (Telegram voice, audio, video_note)
- Підтримка форматів: ogg, mp3, wav, m4a, webm
- Автоматична конвертація в WAV 16kHz mono через ffmpeg
- Підтримка кількох Whisper-реалізацій:
  - `faster-whisper` (рекомендовано, локально)
  - `whisper` CLI (fallback)
  - OpenAI Whisper API (якщо є API key)

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

- `WHISPER_MODEL`: модель Whisper (`base`, `small`, `medium`, `large`) - за замовчуванням `base`
- `OPENAI_API_KEY`: API ключ OpenAI (опційно, для використання OpenAI Whisper API)

### Моделі Whisper

- `base`: найшвидша, менша точність (~74M параметрів)
- `small`: баланс швидкості та якості (~244M)
- `medium`: краща якість (~769M)
- `large`: найкраща якість (~1550M)

Для української мови рекомендую `small` або `medium`.

## Інтеграція з Gateway

Gateway автоматично використовує STT-сервіс для обробки голосових повідомлень з Telegram:

1. Користувач надсилає voice/audio/video_note
2. Gateway завантажує файл з Telegram
3. Gateway відправляє файл в STT-сервіс
4. STT повертає розпізнаний текст
5. Текст відправляється в DAGI Router як звичайне текстове повідомлення

## Встановлення залежностей

### faster-whisper (рекомендовано)

```bash
pip install faster-whisper
```

Моделі завантажуються автоматично при першому використанні.

### whisper CLI (fallback)

```bash
pip install openai-whisper
```

### ffmpeg (обов'язково)

```bash
# Ubuntu/Debian
sudo apt-get install ffmpeg

# macOS
brew install ffmpeg

# Docker
Вже включено в Dockerfile
```

## Troubleshooting

### Помилка: "No Whisper implementation available"

Встановіть одну з реалізацій:
- `pip install faster-whisper` (рекомендовано)
- або `pip install openai-whisper`
- або встановіть `OPENAI_API_KEY`

### Помилка: "ffmpeg not found"

Встановіть ffmpeg (див. вище).

### Повільна обробка

- Використовуйте меншу модель (`base` замість `medium`)
- Або використовуйте GPU (додайте `device="cuda"` в коді)

