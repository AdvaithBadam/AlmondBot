# Stage 1: build the React app
FROM node:20-slim AS frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: backend + built frontend
FROM python:3.11-slim
WORKDIR /app
# CPU-only torch keeps the image much smaller than the default CUDA build
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu
COPY rag/requirements.txt rag/requirements.txt
COPY backend/requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt
COPY rag/ rag/
COPY backend/ backend/
COPY --from=frontend /app/frontend/dist frontend/dist
EXPOSE 8000
# Mount ./data so your PDFs and the index live outside the container
CMD ["sh", "-c", "python rag/scripts/ingest.py && uvicorn backend.app.main:app --host 0.0.0.0 --port 8000"]
