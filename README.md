<p align="center">
  <img src="https://github.com/user-attachments/assets/a9976925-7c98-407d-ba81-4f44fa9e52fe" alt="EcoVision" width="100%" />
</p>


# 🌱 EcoVision: Smart Recycling Detection App
## Project for the [AMD AI](https://github.com/Xilinx/mlir-aie) track at HackCU11 

EcoVision is an intelligent recycling assistant that uses computer vision and AI to help users identify recyclable items, learn proper disposal methods, and track their environmental impact.

## 🔲 AMD AI PC Implementation
EcoVision leverages AMD Ryzen™ AI PC technology to optimize our object detection pipeline. We've specifically engineered our YOLOv8 model to utilize the Neural Processing Unit (NPU) on AMD hardware, which provides significant performance improvements while reducing power consumption. This implementation enables real-time recyclable item detection directly on-device with minimal latency, making the app more responsive and energy-efficient for everyday use.

## Demo

[![EcoVision Demo](https://img.shields.io/badge/Watch%20Demo-Video-red?style=for-the-badge)](https://example.com/demo-video)

## 🚀 Problem Statement


Improper waste disposal and low recycling rates remain significant environmental challenges:
- Many people are unsure about which items can be recycled
- Recycling rules vary by location and can be confusing
- Lack of immediate feedback makes it difficult to build good recycling habits
- Limited knowledge about the environmental impact of individual actions

EcoVision addresses these challenges by providing real-time identification, personalized guidance, and gamification elements to make recycling more accessible and engaging.

## ✨ Key Features

- **Real-time object detection**: Identify recyclable items using your device's camera
- **AI-enhanced information**: Get detailed, contextual information about each item powered by DeepSeek models
- **Environmental impact tracking**: Earn points for proper recycling and see your cumulative positive impact
- **User history**: Review past scans and track your recycling progress over time
- **Leaderboard**: Compete with others in your community to promote sustainable behaviors
- **Educational content**: Learn facts and proper disposal methods for various materials

## 💻 Tech Stack

### Backend
- **Framework**: FastAPI (Python)
- **Authentication**: Firebase Authentication
- **Database**: Firebase Firestore
- **Storage**: Firebase Storage
- **Object Detection**: TensorFlow with NPU acceleration support
- **AI Text Generation**: DeepSeek model integration

### Frontend
- **Framework**: Next.js (React) with TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React Hooks
- **Camera Integration**: react-webcam
- **Real-time Communication**: WebSockets
- **Authentication**: Firebase SDK

## 🖥️ System Architecture

The application follows a microservices architecture:
- **Frontend Service**: Next.js application serving the UI
- **Detection Service**: FastAPI backend handling image processing and ML inference
- **User Service**: Manages user data, history, and statistics
- **DeepSeek Integration Service**: Communicates with DeepSeek models for enhanced content generation

## 🤖 AI Models

### Object Detection
- Custom YOLOv8 model fine-tuned on a dataset of recyclable materials
- Optimized for mobile and edge devices with NPU support

### DeepSeek Integration
- Uses DeepSeek models to generate detailed, contextual information about detected items
- Custom prompt engineering to extract structured information about:
  - Material properties
  - Disposal instructions
  - Environmental impact
  - Interesting facts
- Response caching and rate limiting for efficient operation

## 🌎 Environmental Impact

By using EcoVision, users can:
- Reduce contamination in recycling streams
- Increase recycling rates
- Learn sustainable practices through engaging feedback
- Track their personal environmental impact over time

The application itself is designed to be environmentally friendly:
- Optimized for low power consumption with edge ML
- Efficient API design to minimize data transfer
