// src/utils/model-manager.ts
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgpu';

// Define model paths and configuration
const MODEL_CONFIG = {
    tfjs: {
        modelUrl: '/models/waste_classifier/model.json',
        inputShape: [1, 224, 224, 3],
        outputClasses: 5
    },
    onnx: {
        modelUrl: '/models/waste_classifier.onnx',
        inputShape: [1, 224, 224, 3],
        outputClasses: 5
    }
};

// Cache for loaded models
let cachedTfjsModel: tf.LayersModel | null = null;

/**
 * Initialize TensorFlow.js with WebGPU backend (for AMD NPU)
 */
export async function initializeTensorflow(): Promise<boolean> {
    try {
        // Check for WebGPU support
        if (navigator.gpu) {
            console.log('WebGPU is supported, attempting to set WebGPU backend for NPU acceleration');
            await tf.setBackend('webgpu');
            
            // Get and log backend details
            const backend = tf.getBackend();
            console.log('Active TensorFlow.js backend:', backend);
            
            // Check compute capability (to verify NPU access)
            if (backend === 'webgpu') {
                const gpuDevice = await navigator.gpu.requestAdapter();
                if (gpuDevice) {
                    const info = await gpuDevice.requestAdapterInfo();
                    console.log('GPU/NPU Info:', info);
                    return true;
                }
            }
            return backend === 'webgpu';
        } else {
            console.log('WebGPU is not supported, falling back to CPU backend');
            await tf.setBackend('cpu');
            return false;
        }
    } catch (error) {
        console.error('Failed to initialize TensorFlow.js with WebGPU backend:', error);
        // Fall back to CPU
        try {
            await tf.setBackend('cpu');
            console.log('Fallback to CPU backend successful');
        } catch (fallbackError) {
            console.error('Failed to initialize even the fallback backend:', fallbackError);
        }
        return false;
    }
}

/**
 * Load and cache the TensorFlow.js model
 */
export async function loadTfjsModel(): Promise<tf.LayersModel> {
    if (cachedTfjsModel) {
        return cachedTfjsModel;
    }
    
    try {
        // Initialize TensorFlow.js with appropriate backend
        await initializeTensorflow();
        
        // Load model - will use the active backend (WebGPU/NPU if available)
        console.log('Loading TensorFlow.js model from:', MODEL_CONFIG.tfjs.modelUrl);
        const startTime = performance.now();
        
        const model = await tf.loadLayersModel(MODEL_CONFIG.tfjs.modelUrl);
        
        const endTime = performance.now();
        console.log(`Model loaded in ${(endTime - startTime).toFixed(2)}ms`);
        
        // Warm up the model with a dummy tensor
        console.log('Warming up model...');
        const dummyInput = tf.zeros(MODEL_CONFIG.tfjs.inputShape);
        const warmupResult = model.predict(dummyInput);
        
        // Clean up warmup resources
        dummyInput.dispose();
        if (Array.isArray(warmupResult)) {
            warmupResult.forEach(tensor => tensor.dispose());
        } else {
            warmupResult.dispose();
        }
        
        // Cache the model
        cachedTfjsModel = model;
        
        return model;
    } catch (error) {
        console.error('Failed to load TensorFlow.js model:', error);
        throw new Error('Failed to load model. Please check console for details.');
    }
}

/**
 * Clear model cache and free resources
 */
export function clearModelCache(): void {
    if (cachedTfjsModel) {
        cachedTfjsModel.dispose();
        cachedTfjsModel = null;
        console.log('Model cache cleared and resources freed');
    }
}

/**
 * Verify NPU acceleration is active by running a benchmark
 */
export async function verifyNpuAcceleration(): Promise<{isNpuActive: boolean, benchmarkMs: number}> {
    try {
        const model = await loadTfjsModel();
        
        // Create a large test tensor
        const testTensor = tf.ones(MODEL_CONFIG.tfjs.inputShape);
        
        // Warm up
        let result = model.predict(testTensor);
        if (Array.isArray(result)) {
            result.forEach(tensor => tensor.dispose());
        } else {
            result.dispose();
        }
        
        // Run benchmark
        const iterations = 10;
        const startTime = performance.now();
        
        for (let i = 0; i < iterations; i++) {
            result = model.predict(testTensor);
            if (Array.isArray(result)) {
                await Promise.all(result.map(tensor => tensor.data())); // Force execution to complete
            } else {
                await result.data(); // Force execution to complete
            }
            
            // Clean up
            if (Array.isArray(result)) {
                result.forEach(tensor => tensor.dispose());
            } else {
                result.dispose();
            }
        }
        
        const endTime = performance.now();
        const avgTimeMs = (endTime - startTime) / iterations;
        
        // Clean up
        testTensor.dispose();
        
        // If inference is fast enough, we're likely using NPU
        // This threshold may need adjustment for your specific model and hardware
        const isNpuActive = avgTimeMs < 50; // Example threshold: 50ms
        
        console.log(`Benchmark results: ${avgTimeMs.toFixed(2)}ms per inference`);
        console.log(`NPU acceleration appears to be ${isNpuActive ? 'active' : 'inactive'}`);
        
        return {
            isNpuActive,
            benchmarkMs: avgTimeMs
        };
    } catch (error) {
        console.error('Benchmark failed:', error);
        return {
            isNpuActive: false,
            benchmarkMs: -1
        };
    }
}

/**
 * Get backend and hardware information
 */
export async function getAccelerationInfo(): Promise<Record<string, any>> {
    const backend = tf.getBackend();
    let deviceInfo = { vendor: 'unknown', architecture: 'unknown' };
    
    try {
        if (navigator.gpu) {
            const adapter = await navigator.gpu.requestAdapter();
            if (adapter) {
                deviceInfo = await adapter.requestAdapterInfo();
            }
        }
    } catch (error) {
        console.error('Error getting adapter info:', error);
    }
    
    return {
        tensorflowBackend: backend,
        webgpuSupported: !!navigator.gpu,
        deviceVendor: deviceInfo.vendor,
        deviceArchitecture: deviceInfo.architecture,
        isWebGpuBackend: backend === 'webgpu'
    };
}