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

## 🔥 AMD Ryzen AI Integration

We leveraged Xilinx's MLIR-AIE framework for model optimization and NPU acceleration:

1. **MLIR-AIE Compilation Pipeline**:
   - Used [Xilinx MLIR-AIE](https://github.com/Xilinx/mlir-aie) compiler infrastructure 
   - Implemented MLIR (Multi-Level Intermediate Representation) to target AMD's AI Engine architecture
   - Applied specialized graph optimizations for AMD NPU execution

2. **Quantization Process**:
   - Performed post-training quantization to reduce model precision from FP32 to INT8
   - Applied per-channel quantization to minimize accuracy loss
   - Calibrated quantization parameters using representative dataset samples
   - Generated quantized model variants optimized specifically for AMD NPU execution

## 🖼️ Sample Training Images
<div align="center">
  <p float="left">
    <img src="https://github.com/user-attachments/assets/8584e4e2-80d4-443c-b525-f7f822df41c8" width="48%" />
    <img src="https://github.com/user-attachments/assets/13ab9e34-fc72-4247-93fd-29322f65cd02" width="48%" />
    <img src="https://github.com/user-attachments/assets/ec11eb2b-6017-46e2-9850-90fd78c0cc21" width="48%" />
    <img src="https://github.com/user-attachments/assets/88eb3988-c121-454d-8832-d6eb5ef5f80f" width="48%" /> 
  </p>
</div>


## ✨ Key Features

- **Real-time object detection**: Identify recyclable items using your device's camera
- **AI-enhanced information**: Get detailed, contextual information about each item powered by the ChatGPT API
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
- **Object Detection**: YOLOv8 model with ChatGPT classification
- **AI Text Generation**: ChatGPT custom text generation

### Frontend
- **Framework**: Next.js with TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React Hooks
- **Authentication**: Firebase SDK

## 🌎 Environmental Impact

By using EcoVision, users can:
- Reduce contamination in recycling streams
- Increase recycling rates
- Learn sustainable practices through engaging feedback
- Track their personal environmental impact over time

The application itself is designed to be environmentally friendly:
- Optimized for low power consumption with edge ML
- Efficient API design to minimize data transfer

## 🖥️ System Architecture

```
Directory structure:
└── connergroth-ecovision/
    ├── README.md
    ├── frontend/
    │   ├── README.md
    │   ├── Dockerfile
    │   ├── eslint.config.mjs
    │   ├── next.config.ts
    │   ├── package-lock.json
    │   ├── package.json
    │   ├── postcss.config.mjs
    │   ├── tsconfig.json
    │   ├── .dockerignore
    │   ├── .gitignore
    │   ├── public/
    │   └── src/
    │       ├── app/
    │       │   ├── globals.css
    │       │   ├── layout.tsx
    │       │   ├── (protected)/
    │       │   │   ├── layout.tsx
    │       │   │   ├── page.tsx
    │       │   │   ├── history/
    │       │   │   │   └── page.tsx
    │       │   │   ├── image/
    │       │   │   │   └── page.tsx
    │       │   │   └── leaderboard/
    │       │   │       └── page.tsx
    │       │   ├── api/
    │       │   │   ├── apiClient.ts
    │       │   │   ├── chat/
    │       │   │   │   └── route.ts
    │       │   │   ├── classify/
    │       │   │   │   └── route.ts
    │       │   │   ├── image/
    │       │   │   │   └── route.ts
    │       │   │   ├── leaderboard/
    │       │   │   │   └── route.ts
    │       │   │   └── user-trash/
    │       │   │       └── route.ts
    │       │   ├── auth/
    │       │   │   └── page.tsx
    │       │   ├── components/
    │       │   │   ├── LoadingPage.tsx
    │       │   │   ├── NavBar.tsx
    │       │   │   ├── SignIn.tsx
    │       │   │   ├── WebSocketDetector.tsx
    │       │   │   └── WebcamDetection.tsx
    │       │   └── hooks/
    │       │       └── AuthHook.jsx
    │       ├── firebase/
    │       │   ├── firebaseAdminConfig.ts
    │       │   └── firebaseConfig.ts
    │       └── utils/
    │           ├── gpt-image-analysis.ts
    │           └── gpt-image-classifier.ts
    ├── runs/
    │   └── detect/
    │       ├── train/
    │       │   └── args.yaml
    │       ├── train2/
    │       │   └── args.yaml
    │       └── train3/
    │           └── args.yaml
    └── trained models/
        ├── data/
        │   ├── anchors.npy
        │   ├── coco.names
        │   ├── data_collection.py
        │   ├── strides.npy
        │   ├── trashnet.zip
        │   ├── custom_dataset/
        │   │   └── dataset.yaml
        │   ├── models/
        │   │   └── yolov8m.onnx
        │   └── trashnet-master/
        │       ├── README.md
        │       ├── DataLoader.lua
        │       ├── LICENSE
        │       ├── model.lua
        │       ├── plot.lua
        │       ├── shuffle.lua
        │       ├── test.lua
        │       ├── train.lua
        │       ├── utils.lua
        │       ├── weight-init.lua
        │       ├── .gitignore
        │       └── data/
        │           ├── constants.py
        │           ├── dataset-resized.zip
        │           ├── one-indexed-files-notrash_test.txt
        │           ├── one-indexed-files-notrash_train.txt
        │           ├── one-indexed-files-notrash_val.txt
        │           ├── one-indexed-files.txt
        │           ├── resize.py
        │           └── zero-indexed-files.txt
        └── model/
            ├── best1.onnx
            ├── best1.pt
            ├── modelQuantizer.ipynb
            ├── testy.py
            └── test_images/
```

The application follows a microservices architecture:

- **Frontend Service**: Next.js application serving the UI and handling all routes. Also performs image processing and ML inference directly in the browser. 

- **Detection Service**: FastAPI backend providing additional ML capabilities for more complex image analysis tasks. Optimized for AMD GPU/NPU acceleration when deployed on compatible hardware.

- **User Service**: Manages user data, history, and statistics.

- **OpenAI Integration Service**: Communicates with ChatGPT APIs for enhanced content generation and advanced image analysis.
