#!/bin/bash

set -e

echo "🔒 Démarrage du processus de git pull sécurisé..."

# Répertoire de backup avec horodatage
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR=~/backup_chapmoney_$TIMESTAMP
mkdir -p "$BACKUP_DIR"

echo "📁 Sauvegarde des fichiers modifiés dans $BACKUP_DIR"

# Sauvegarde avec renommage explicite
cp .env "$BACKUP_DIR/env_root.bak" 2>/dev/null || echo "❗ .env non trouvé"
cp docker-compose.yaml "$BACKUP_DIR/docker-compose.yaml.bak" 2>/dev/null || echo "❗ docker-compose.yaml non trouvé"
cp money_transfer/.env "$BACKUP_DIR/env_money_transfer.bak" 2>/dev/null || echo "❗ money_transfer/.env non trouvé"
cp money_transfer/src/celery.py "$BACKUP_DIR/celery.py.bak" 2>/dev/null || echo "❗ celery.py non trouvé"
cp money_transfer/src/config.py "$BACKUP_DIR/config.py.bak" 2>/dev/null || echo "❗ config.py non trouvé"
cp money_transfer/src/utils/email_utils.py "$BACKUP_DIR/email_utils.py.bak" 2>/dev/null || echo "❗ email_utils.py non trouvé"
cp auth/flower.passwd "$BACKUP_DIR/flower.passwd.bak" 2>/dev/null || echo "❗ flower.passwd non suivi, ignoré"
cp auth/rabbitmq.passwd "$BACKUP_DIR/rabbitmq.passwd.bak" 2>/dev/null || echo "❗ rabbitmq.passwd non suivi, ignoré"

echo "✅ Sauvegarde terminée."

# Supprimer les fichiers non suivis qui bloquent le pull
echo "🧹 Suppression des fichiers non suivis bloquants..."
rm -f auth/flower.passwd auth/rabbitmq.passwd 2>/dev/null || true

# Stash des modifications locales
echo "📦 Mise en stash des modifications locales..."
git stash push -m "Stash auto avant git pull par safe_git_pull.sh"

# Pull
echo "⬇️ Lancement du git pull..."
git pull

echo "✅ Pull effectué avec succès."

echo -e "\n🔁 Si besoin, restaure les fichiers depuis $BACKUP_DIR ou utilise : git stash pop"
