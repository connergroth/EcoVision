// src/utils/npu-classifier.ts
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgpu';
import * as ort from 'onnxruntime-web';

// Define output interface to match your existing classifier
export interface ClassificationResult {
  item: string;
  category: string;
  bin: string;
  insight: string;
}

// Map of class indices to waste categories
const WASTE_CATEGORIES: { [key: number]: string } = {
  0: 'Plastic',
  1: 'Paper',
  2: 'Glass',
  3: 'Metal',
  4: 'Organic'
};

// Map categories to bins
const CATEGORY_TO_BIN = {
  'Plastic': 'Recycling',
  'Paper': 'Recycling',
  'Glass': 'Recycling',
  'Metal': 'Recycling',
  'Organic': 'Compost'
};

// Items corresponding to waste categories (simplified mapping)
const CATEGORY_TO_ITEMS = {
  'Plastic': ['Plastic bottle', 'Plastic container', 'Plastic wrapper'],
  'Paper': ['Cardboard', 'Paper', 'Newspaper'],
  'Glass': ['Glass bottle', 'Glass jar', 'Glass container'],
  'Metal': ['Aluminum can', 'Metal container', 'Soda can'],
  'Organic': ['Food waste', 'Fruit', 'Vegetable']
};

// Environmental insights
const INSIGHTS = {
  'Plastic': 'Recycling plastic reduces plastic pollution and conserves petroleum resources used in manufacturing.',
  'Paper': 'Recycling paper saves trees, reduces landfill waste, and requires less energy than making new paper.',
  'Glass': 'Glass is 100% recyclable and can be recycled endlessly without loss in quality or purity.',
  'Metal': 'Recycling metal saves significant energy compared to mining and processing new metal ores.',
  'Organic': 'Composting organic waste creates nutrient-rich soil and reduces methane emissions from landfills.'
};

// Configure the NPU execution provider
async function setupNPU() {
  try {
    // Configure TensorFlow.js to prefer WebGPU backend when available (AMD NPU)
    await tf.setBackend('webgpu');
    
    // For ONNX runtime, configure the execution providers
    const options = {
      executionProviders: ['webgpu'],
      graphOptimizationLevel: 'all',
      enableCpuMemArena: true
    };
    
    ort.env.wasm.numThreads = 4; // Set the number of threads
    ort.env.wasm.simd = true; // Enable SIMD
    
    console.log('NPU acceleration configured successfully');
    console.log('Current TensorFlow backend:', tf.getBackend());
    
    return true;
  } catch (error) {
    console.error('Failed to setup NPU acceleration:', error);
    return false;
  }
}

// Function to preprocess image data
async function preprocessImage(imageData: string): Promise<tf.Tensor> {
  return new Promise(async (resolve, reject) => {
    try {
      // Remove data URL prefix
      const base64String = imageData.split(',')[1];
      const buffer = Buffer.from(base64String, 'base64');
      
      // Load image into tensor
      const image = new Image();
      image.onload = async () => {
        // Convert to tensor and normalize
        const tensor = tf.browser.fromPixels(image)
          .resizeNearestNeighbor([224, 224]) // Resize to model input size
          .toFloat()
          .div(tf.scalar(255.0))
          .expandDims(0); // Add batch dimension
        
        resolve(tensor);
      };
      
      image.onerror = (err) => {
        reject(new Error('Failed to load image'));
      };
      
      // Set image source
      image.src = imageData;
    } catch (error) {
      reject(error);
    }
  });
}

// Main classification function
export async function classifyImageWithNPU(imageString: string): Promise<ClassificationResult> {
  try {
    // Initialize NPU
    const isNPUConfigured = await setupNPU();
    if (!isNPUConfigured) {
      console.warn('NPU configuration failed, falling back to default execution');
    }
    
    // Preprocess image
    const tensor = await preprocessImage(imageString);
    
    // Load model (assuming you've converted and saved your model)
    // For a real implementation, you'd need to convert your model to TensorFlow.js format
    // or ONNX format and save it in your project
    const modelPath = '/models/waste_classifier';
    const model = await tf.loadLayersModel(modelPath);
    
    // Run inference
    const predictions = model.predict(tensor) as tf.Tensor;
    const probabilities = await predictions.data();
    
    // Get top prediction
    const topIndex = Array.from(probabilities).indexOf(Math.max(...Array.from(probabilities)));
    const confidence = probabilities[topIndex];
    
    // Map to category
    const category = WASTE_CATEGORIES[topIndex] || 'Unknown';
    
    // Get bin, item, and insight
    const bin = CATEGORY_TO_BIN[category as keyof typeof CATEGORY_TO_BIN] || 'Trash';
    
    // Pick a random item from the category
    const items = CATEGORY_TO_ITEMS[category as keyof typeof CATEGORY_TO_ITEMS] || ['Unknown item'];
    const item = items[Math.floor(Math.random() * items.length)];
    
    const insight = INSIGHTS[category as keyof typeof INSIGHTS] || 'Unable to provide insight for this item.';
    
    // Clean up tensors
    tensor.dispose();
    predictions.dispose();
    
    return {
      item,
      category,
      bin,
      insight
    };
  } catch (error) {
    console.error('Error during NPU classification:', error);
    
    // Fallback result
    return {
      item: 'N/A',
      category: 'N/A',
      bin: 'N/A',
      insight: 'N/A'
    };
  }
}

// Alternative implementation using ONNX Runtime
export async function classifyImageWithONNX(imageString: string): Promise<ClassificationResult> {
  try {
    // Initialize NPU for ONNX
    ort.env.wasm.numThreads = 4;
    ort.env.wasm.simd = true;
    
    // You would need to set the execution provider to target AMD NPU
    // This would typically be 'webgpu' for WebGPU-compatible devices
    const sessionOptions = {
      executionProviders: ['webgpu'] 
    };
    
    // Load the ONNX model - replace with your model path
    const session = await ort.InferenceSession.create('/models/waste_classifier.onnx', sessionOptions);
    
    // Preprocess image
    const tensor = await preprocessImage(imageString);
    const inputData = await tensor.data();
    
    // Create ONNX tensor
    const inputTensor = new ort.Tensor('float32', new Float32Array(inputData), [1, 224, 224, 3]);
    
    // Run inference
    const feeds = { input: inputTensor };
    const results = await session.run(feeds);
    
    // Process results
    const outputData = results.output.data;
    const probabilities = Array.from(outputData as Float32Array);
    
    // Get top prediction
    const topIndex = Array.from(probabilities).indexOf(Math.max(...Array.from(probabilities)));
    const confidence = probabilities[topIndex];
    
    // Map to category
    const category = WASTE_CATEGORIES[topIndex] || 'Unknown';
    
    // Get bin, item, and insight
    const bin = CATEGORY_TO_BIN[category as keyof typeof CATEGORY_TO_BIN] || 'Trash';
    
    // Pick a random item from the category
    const items = CATEGORY_TO_ITEMS[category as keyof typeof CATEGORY_TO_ITEMS] || ['Unknown item'];
    const item = items[Math.floor(Math.random() * items.length)];
    
    const insight = INSIGHTS[category as keyof typeof INSIGHTS] || 'Unable to provide insight for this item.';
    
    // Clean up
    tensor.dispose();
    
    return {
      item,
      category,
      bin,
      insight
    };
  } catch (error) {
    console.error('Error during ONNX classification:', error);
    
    // Fallback result
    return {
      item: 'N/A',
      category: 'N/A',
      bin: 'N/A',
      insight: 'N/A'
    };
  }
}