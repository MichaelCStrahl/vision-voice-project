#!/bin/bash

echo "🚀 Iniciando Captioning API..."

if ! command -v docker &> /dev/null; then
  echo "❌ Docker não está instalado. Por favor, instale o Docker primeiro."
  exit 1
fi

if ! command -v docker-compose &> /dev/null; then
  echo "❌ Docker Compose não está instalado. Por favor, instale o Docker Compose primeiro."
  exit 1
fi

ART_DIR="captioning-model"

if [ ! -f "${ART_DIR}/caption_model.weights.h5" ]; then
  echo "⚠️  Pesos não encontrados em ${ART_DIR}/caption_model.weights.h5"
  echo "📝 Rode o notebook e execute a célula de exportação para gerar os artefatos."
  exit 1
fi

if [ ! -f "${ART_DIR}/vocab.json" ]; then
  echo "⚠️  Vocabulário não encontrado em ${ART_DIR}/vocab.json"
  echo "📝 Rode o notebook e execute a célula de exportação para gerar os artefatos."
  exit 1
fi

if [ ! -f "${ART_DIR}/metadata.json" ]; then
  echo "⚠️  Metadados não encontrados em ${ART_DIR}/metadata.json"
  echo "📝 Rode o notebook e execute a célula de exportação para gerar os artefatos."
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
  echo "✅ Captioning API está funcionando!"
  echo "🌐 URL: http://localhost:7860"
  echo "📚 Documentação: http://localhost:7860/docs"
  echo "🔍 Health Check: http://localhost:7860/health"
  echo ""
  echo "📝 Endpoint:"
  echo "  POST /caption  (multipart/form-data, campo: file)"
else
  echo "❌ Erro ao iniciar a API. Verifique os logs:"
  docker-compose logs
  exit 1
fi
