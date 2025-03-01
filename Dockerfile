# Use official Python image
FROM python:3.8

# Set working directory in the container
WORKDIR /app

# Copy all backend files into container
COPY backend/ . 

# Install required Python dependencies
RUN pip install -r requirements.txt

# Expose port 5000 (Flask default)
EXPOSE 5000

# Command to run Flask API
CMD ["python", "app.py"]
