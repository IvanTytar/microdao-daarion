#!/bin/bash

# Скрипт для синхронізації файлів з MicroDAO до DAARION.city репозиторію
# Використання: ./scripts/sync-to-daarion-city.sh [component-name]

set -e

MICRODAO_DIR="/Users/apple/Desktop/MicroDAO/MicroDAO 3"
DAARION_CITY_DIR="/tmp/daarion-ai-city"
COMPONENT=${1:-"console"}

echo "🔄 Синхронізація компонента '$COMPONENT' до DAARION.city..."

# Перевірка наявності MicroDAO проєкту
if [ ! -d "$MICRODAO_DIR" ]; then
    echo "❌ Помилка: MicroDAO проєкт не знайдено в $MICRODAO_DIR"
    exit 1
fi

# Клонування/оновлення DAARION.city репозиторію
if [ ! -d "$DAARION_CITY_DIR" ]; then
    echo "📦 Клонування DAARION.city репозиторію..."
    git clone git@github.com:DAARION-DAO/daarion-ai-city.git "$DAARION_CITY_DIR"
else
    echo "📥 Оновлення DAARION.city репозиторію..."
    cd "$DAARION_CITY_DIR"
    git fetch origin
    git checkout main
    git pull origin main
fi

# Створення гілки для змін
BRANCH_NAME="sync/microdao-${COMPONENT}-$(date +%Y%m%d-%H%M%S)"
cd "$DAARION_CITY_DIR"
git checkout -b "$BRANCH_NAME"

# Копіювання файлів залежно від компонента
case $COMPONENT in
    console)
        echo "📋 Копіювання Console компонентів..."
        mkdir -p "$DAARION_CITY_DIR/src/components/console"
        cp -r "$MICRODAO_DIR/src/components/console"/* "$DAARION_CITY_DIR/src/components/console/" 2>/dev/null || true
        
        if [ -f "$MICRODAO_DIR/src/pages/ConsolePage.tsx" ]; then
            cp "$MICRODAO_DIR/src/pages/ConsolePage.tsx" "$DAARION_CITY_DIR/src/pages/"
        fi
        ;;
    api)
        echo "📋 Копіювання API клієнтів..."
        mkdir -p "$DAARION_CITY_DIR/src/api"
        cp -r "$MICRODAO_DIR/src/api"/* "$DAARION_CITY_DIR/src/api/" 2>/dev/null || true
        ;;
    docs)
        echo "📋 Копіювання документації..."
        mkdir -p "$DAARION_CITY_DIR/docs/daarion"
        cp -r "$MICRODAO_DIR/docs/daarion"/* "$DAARION_CITY_DIR/docs/daarion/" 2>/dev/null || true
        ;;
    *)
        echo "❌ Невідомий компонент: $COMPONENT"
        echo "Доступні компоненти: console, api, docs"
        exit 1
        ;;
esac

# Коміт та push
cd "$DAARION_CITY_DIR"
git add .
git commit -m "feat: sync MicroDAO $COMPONENT component" || echo "ℹ️  Немає змін для коміту"

echo "✅ Синхронізація завершена!"
echo "📝 Гілка: $BRANCH_NAME"
echo ""
echo "Наступні кроки:"
echo "1. Перевірити зміни: cd $DAARION_CITY_DIR && git diff main"
echo "2. Push гілку: git push -u origin $BRANCH_NAME"
echo "3. Створити PR через GitHub UI"

