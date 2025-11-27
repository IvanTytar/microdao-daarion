# ⚡ QUICKSTART: Phase 2 Agent Integration

**5-минутний старт**

---

## 🚀 One-Command Start

```bash
cd /Users/apple/github-projects/microdao-daarion
./scripts/start-phase2.sh
```

Це запустить:
- ✅ agent-filter (port 7005)
- ✅ router (port 8000)
- ✅ agent-runtime (port 7006)

---

## 🧪 Test Everything

```bash
./scripts/test-phase2-e2e.sh
```

Очікуваний результат:
```
✅ PASS: agent-filter is healthy
✅ PASS: router is healthy
✅ PASS: agent-runtime is healthy
✅ PASS: messaging-service is healthy
✅ PASS: agent-filter allows message
✅ PASS: agent-filter targets correct agent
✅ PASS: router creates invocation
✅ PASS: router sets correct entrypoint
```

---

## 💬 Test in UI

1. **Відкрий Messenger:**
   ```
   http://localhost:8899/messenger
   ```

2. **Вибери канал:**
   "DAARION City General"

3. **Напиши:**
   ```
   Hello Sofia!
   ```

4. **Чекай 3-5 секунд**

5. **Побачиш відповідь агента:**
   ```
   Привіт! Я Sofia, асистент команди DAARION. Як можу допомогти?
   ```

---

## 📊 Check Status

```bash
# Services
docker ps | grep -E '(agent-filter|router|agent-runtime)'

# Logs (real-time)
docker logs -f agent-filter
docker logs -f router
docker logs -f agent-runtime

# Health
curl http://localhost:7005/health
curl http://localhost:8000/health
curl http://localhost:7006/health
```

---

## 🐛 If Something Wrong

### Services not running?

```bash
# Restart
./scripts/stop-phase2.sh
./scripts/start-phase2.sh
```

### NATS not connected?

```bash
# Check NATS
docker ps | grep nats
docker logs nats

# Restart NATS
docker restart nats

# Restart agents
./scripts/stop-phase2.sh
./scripts/start-phase2.sh
```

### Agent not replying?

```bash
# Check logs step-by-step
docker logs agent-filter | grep "Decision"
docker logs router | grep "invocation"
docker logs agent-runtime | grep "replied"
```

---

## 🎯 What to Try

### Test Keywords:

- "Привіт" → Greeting
- "Hello" → Greeting
- "Допоможи" → Help menu
- "Phase 2" → Phase 2 explanation
- "Дякую" → Thanks acknowledgment
- Any question with "?" → Smart response

---

## 📚 Documentation

- [PHASE2_COMPLETE.md](PHASE2_COMPLETE.md) — Full guide
- [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) — What was built
- `services/agent-filter/README.md` — agent-filter docs
- `services/agent-runtime/README.md` — agent-runtime docs
- `services/router/README.md` — router docs

---

## 🎉 Success!

If agent replies, **Phase 2 works!** 🚀

**Next:** Check [PHASE3_ROADMAP.md](docs/tasks/PHASE3_ROADMAP.md) for what's next.

---

**Questions?** Check logs or documentation above.




