# Use a slim Python base image
FROM python:3.9-slim

# Set the working directory inside the container
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libc6-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements file first (to take advantage of Docker caching)
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source code into the container
COPY ./app /app

# Ensure logs directory exists
RUN mkdir -p /app/logs

# Set PYTHONPATH to recognize the app module
ENV PYTHONPATH=/app

# Expose the FastAPI port
EXPOSE 8000

# Command to run the application
CMD ["python", "-m", "app.main"]
