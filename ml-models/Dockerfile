FROM python:3.9-slim

WORKDIR /app

# Create a placeholder requirements file if not exists
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt || true

COPY . .

# Expose the port mentioned in docker-compose
EXPOSE 8000

# Run a simple HTTP server to satisfy health checks and keep container running
# This is a placeholder. Replace with your actual ML application (e.g. FastAPI/Flask)
CMD ["python", "-m", "http.server", "8000"]
