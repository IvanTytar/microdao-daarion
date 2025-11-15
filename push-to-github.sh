#!/bin/bash

# Скрипт для публікації проєкту на GitHub
# Використання: ./push-to-github.sh YOUR_USERNAME REPO_NAME

set -e

USERNAME=${1:-"YOUR_USERNAME"}
REPO_NAME=${2:-"microdao-daarion"}

echo "🚀 Підготовка до публікації на GitHub..."
echo ""

# Перевірка SSH ключа
echo "📋 Перевірка SSH підключення..."
if ssh -T git@github.com 2>&1 | grep -q "successfully authenticated"; then
    echo "✅ SSH ключ налаштовано!"
else
    echo "❌ SSH ключ не налаштовано. Див. GITHUB_SETUP.md"
    exit 1
fi

# Перевірка remote
echo ""
echo "📋 Перевірка remote..."
if git remote get-url origin > /dev/null 2>&1; then
    echo "✅ Remote вже налаштовано:"
    git remote -v
    read -p "Використати існуючий remote? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Видаляю старий remote..."
        git remote remove origin
    else
        echo "Використовую існуючий remote"
        git push -u origin main
        exit 0
    fi
fi

# Додавання remote
echo ""
echo "📋 Додавання remote..."
git remote add origin "git@github.com:${USERNAME}/${REPO_NAME}.git"
echo "✅ Remote додано: git@github.com:${USERNAME}/${REPO_NAME}.git"

# Додавання файлів
echo ""
echo "📋 Додавання файлів..."
git add .
echo "✅ Файли додані"

# Коміт
echo ""
echo "📋 Створення коміту..."
if git diff --cached --quiet; then
    echo "ℹ️  Немає змін для коміту"
else
    git commit -m "chore: initial commit - MicroDAO & DAARION.city

- Organize documentation structure (microdao, daarion, agents)
- 61 cursor technical docs
- Source code and configuration
- Setup instructions"
    echo "✅ Коміт створено"
fi

# Push
echo ""
echo "📋 Push на GitHub..."
git branch -M main
git push -u origin main

echo ""
echo "🎉 Готово! Проєкт опубліковано на GitHub!"
echo "🔗 https://github.com/${USERNAME}/${REPO_NAME}"

