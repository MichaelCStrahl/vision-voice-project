#!/bin/bash

echo "🚀 Iniciando Object Detection API (YOLOv8n)..."

if ! command -v docker &> /dev/null; then
  echo "❌ Docker não está instalado. Por favor, instale o Docker primeiro."
  exit 1
fi

if ! command -v docker-compose &> /dev/null; then
  echo "❌ Docker Compose não está instalado. Por favor, instale o Docker Compose primeiro."
  exit 1
fi

ART_DIR="object-detection-model"

if [ ! -f "${ART_DIR}/best.pt" ]; then
  echo "⚠️  Pesos não encontrados em ${ART_DIR}/best.pt"
  echo "📝 Rode o notebook e exporte os artefatos do modelo."
  exit 1
fi

if [ ! -f "${ART_DIR}/config.json" ]; then
  echo "⚠️  config.json não encontrado em ${ART_DIR}/config.json"
  echo "📝 Rode o notebook e exporte os artefatos do modelo."
  exit 1
fi

if [ ! -f "${ART_DIR}/labels.json" ]; then
  echo "⚠️  labels.json não encontrado em ${ART_DIR}/labels.json"
  echo "📝 Rode o notebook e exporte os artefatos do modelo."
  exit 1
fi

echo "✅ Artefatos encontrados em ${ART_DIR}"

echo "🛑 Parando containers existentes..."
docker-compose down

echo "🔨 Construindo e iniciando a API..."
docker-compose up --build -d

echo "⏳ Aguardando a API inicializar..."
sleep 10

echo "🔍 Verificando status da API..."
if curl -f http://localhost:7860/health > /dev/null 2>&1; then
  echo "✅ Object Detection API está funcionando!"
  echo "🌐 URL: http://localhost:7860"
  echo "📚 Documentação: http://localhost:7860/docs"
  echo "🔍 Health Check: http://localhost:7860/health"
  echo ""
  echo "📝 Endpoints:"
  echo "  POST /detect        (multipart/form-data, campo: file)"
  echo "  POST /detect/base64 (application/json)"
else
  echo "❌ Erro ao iniciar a API. Verifique os logs:"
  docker-compose logs
  exit 1
fi
