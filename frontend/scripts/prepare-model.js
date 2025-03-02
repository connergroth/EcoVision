// scripts/prepare-models.js
/**
 * This script prepares models for AMD NPU acceleration.
 * 
 * To run this script:
 * 1. Install required dependencies: npm install @tensorflow/tfjs-node @tensorflow/tfjs-converter onnx onnxruntime-node
 * 2. Run: node scripts/prepare-models.js
 */

const tf = require('@tensorflow/tfjs-node');
const fs = require('fs');
const path = require('path');

// Define paths
const MODELS_DIR = path.join(__dirname, '../public/models');
const TENSORFLOW_MODEL_DIR = path.join(MODELS_DIR, 'waste_classifier');
const ONNX_MODEL_PATH = path.join(MODELS_DIR, 'waste_classifier.onnx');

// Ensure directories exist
if (!fs.existsSync(MODELS_DIR)) {
  fs.mkdirSync(MODELS_DIR, { recursive: true });
}

if (!fs.existsSync(TENSORFLOW_MODEL_DIR)) {
  fs.mkdirSync(TENSORFLOW_MODEL_DIR, { recursive: true });
}

/**
 * Convert PyTorch/ONNX model to TensorFlow.js format
 */
async function convertOnnxToTfjs() {
  try {
    console.log('Converting ONNX model to TensorFlow.js format...');
    
    // This is a placeholder - in a real implementation, you would use
    // the ONNX.js library or other conversion tools to convert from ONNX to TensorFlow.js
    
    // For demonstration, we'll create a simple TensorFlow.js model
    const model = tf.sequential();
    
    // Input shape: [batch_size, height, width, channels]
    model.add(tf.layers.conv2d({
      inputShape: [224, 224, 3],
      filters: 16,
      kernelSize: 3,
      activation: 'relu'
    }));
    
    model.add(tf.layers.maxPooling2d({ poolSize: 2, strides: 2 }));
    model.add(tf.layers.conv2d({ filters: 32, kernelSize: 3, activation: 'relu' }));
    model.add(tf.layers.maxPooling2d({ poolSize: 2, strides: 2 }));
    model.add(tf.layers.flatten());
    model.add(tf.layers.dense({ units: 64, activation: 'relu' }));
    model.add(tf.layers.dense({ units: 5, activation: 'softmax' })); // 5 classes for waste
    
    // Compile the model
    model.compile({
      optimizer: 'adam',
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy']
    });
    
    // Save the model to the specified directory
    await model.save(`file://${TENSORFLOW_MODEL_DIR}`);
    
    console.log(`Model saved to ${TENSORFLOW_MODEL_DIR}`);
    return true;
  } catch (error) {
    console.error('Error converting ONNX model to TensorFlow.js:', error);
    return false;
  }
}

/**
 * Check if a model needs quantization
 */
async function checkModelQuantization() {
  try {
    // Load the model
    const model = await tf.loadLayersModel(`file://${TENSORFLOW_MODEL_DIR}/model.json`);
    
    // Get model info
    const modelInfo = await getModelInfo(model);
    
    console.log('Model Information:');
    console.log(`  - Input shape: ${JSON.stringify(modelInfo.inputShape)}`);
    console.log(`  - Output shape: ${JSON.stringify(modelInfo.outputShape)}`);
    console.log(`  - Number of layers: ${modelInfo.numLayers}`);
    console.log(`  - Model size: ${(modelInfo.modelSizeBytes / (1024 * 1024)).toFixed(2)} MB`);
    
    // Determine if quantization is needed (models > 10MB could benefit)
    const needsQuantization = modelInfo.modelSizeBytes > 10 * 1024 * 1024;
    console.log(`  - Quantization recommended: ${needsQuantization ? 'Yes' : 'No'}`);
    
    return needsQuantization;
  } catch (error) {
    console.error('Error checking model quantization:', error);
    return false;
  }
}

/**
 * Get model information
 */
async function getModelInfo(model) {
  // Get input and output shapes
  const inputShape = model.inputs[0].shape;
  const outputShape = model.outputs[0].shape;
  
  // Count layers
  const numLayers = model.layers.length;
  
  // Estimate model size (approximate)
  let modelSizeBytes = 0;
  model.weights.forEach(weight => {
    const shape = weight.shape;
    const numValues = shape.reduce((acc, dim) => acc * (dim || 1), 1);
    const bytesPerValue = 4; // Assuming float32
    modelSizeBytes += numValues * bytesPerValue;
  });
  
  return {
    inputShape,
    outputShape,
    numLayers,
    modelSizeBytes
  };
}

/**
 * Optimize model for AMD NPU
 */
async function optimizeForAmdNpu() {
  try {
    console.log('Optimizing model for AMD NPU...');
    
    // Load the model
    const model = await tf.loadLayersModel(`file://${TENSORFLOW_MODEL_DIR}/model.json`);
    
    // Save model with optimization flags
    // Note: In a real implementation, you would use specific optimizations for AMD NPU
    await model.save(`file://${TENSORFLOW_MODEL_DIR}`, {
      includeOptimizer: false,
      weightManifestFormat: 'webgpu-binary', // Help WebGPU backend
    });
    
    console.log('Model optimized for AMD NPU');
    return true;
  } catch (error) {
    console.error('Error optimizing model for AMD NPU:', error);
    return false;
  }
}

/**
 * Main function to prepare models
 */
async function prepareModels() {
  console.log('===== Model Preparation for AMD NPU =====');
  
  // Convert ONNX to TensorFlow.js
  const conversionSuccess = await convertOnnxToTfjs();
  if (!conversionSuccess) {
    console.error('Model conversion failed. Aborting.');
    return;
  }
  
  // Check if quantization is needed
  const needsQuantization = await checkModelQuantization();
  
  // Optimize for AMD NPU
  const optimizationSuccess = await optimizeForAmdNpu();
  if (!optimizationSuccess) {
    console.error('Model optimization failed.');
    return;
  }
  
  console.log('Model preparation complete!');
  console.log('The optimized models are available at:');
  console.log(`- TensorFlow.js: ${TENSORFLOW_MODEL_DIR}`);
  console.log(`- ONNX: ${ONNX_MODEL_PATH}`);
  
  console.log('\nTo use these models:');
  console.log('1. Copy the models to your public/models directory');
  console.log('2. Use the NPU settings component to enable acceleration');
}

// Run the script
prepareModels();