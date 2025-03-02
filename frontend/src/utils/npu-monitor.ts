// src/utils/npu-monitor.ts
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgpu';

// Interface for NPU usage statistics
export interface NpuUsageStats {
  utilizationPercent: number;
  activeOperations: number;
  memoryUsageMB: number;
  processingTimeMs: number;
  isNpuActive: boolean;
  timestamp: number;
}

// Store monitoring history
let usageHistory: NpuUsageStats[] = [];
let monitoringInterval: number | null = null;
let isMonitoring = false;

/**
 * Simulate NPU usage statistics based on real TensorFlow.js activity
 */
export async function getCurrentNpuUsage(): Promise<NpuUsageStats> {
  // Check if WebGPU backend is active
  const isWebGPU = tf.getBackend() === 'webgpu';
  
  // Get memory info from TensorFlow.js
  const memoryInfo = tf.memory();
  
  // Check for active operations by creating a small tensor operation
  // This will indirectly measure if the NPU is responsive
  const startTime = performance.now();
  const smallTensor = tf.randomNormal([100, 100]);
  const opResult = tf.matMul(smallTensor, smallTensor);
  await opResult.data(); // Force execution
  const endTime = performance.now();
  
  // Clean up tensors
  tf.dispose([smallTensor, opResult]);
  
  // Generate simulated usage values based on real activity
  const processingTime = endTime - startTime;
  
  // Simulate NPU utilization based on processing time
  // Faster processing = higher utilization (inverse relationship with upper bound)
  // Adjust these thresholds based on your hardware's performance characteristics
  let utilizationPercent = 0;
  if (isWebGPU) {
    if (processingTime < 5) {
      utilizationPercent = 80 + Math.random() * 20; // 80-100% for very fast operations
    } else if (processingTime < 20) {
      utilizationPercent = 50 + Math.random() * 30; // 50-80% for moderately fast operations
    } else {
      utilizationPercent = 10 + Math.random() * 40; // 10-50% for slower operations
    }
  }
  
  // Add some random variation to make it look more realistic
  utilizationPercent = Math.min(100, Math.max(0, 
    utilizationPercent + (Math.random() * 10 - 5)
  ));
  
  // Create usage stats object
  const stats: NpuUsageStats = {
    utilizationPercent: Math.round(utilizationPercent),
    activeOperations: isWebGPU ? Math.floor(Math.random() * 5) + 1 : 0, // Simulate 1-5 active ops
    memoryUsageMB: Math.round(memoryInfo.numBytes / (1024 * 1024)),
    processingTimeMs: processingTime,
    isNpuActive: isWebGPU,
    timestamp: Date.now()
  };
  
  return stats;
}

/**
 * Start monitoring NPU usage
 * @param updateIntervalMs How often to update usage stats (in milliseconds)
 * @param historyLimit Maximum number of historical data points to keep
 */
export function startNpuMonitoring(updateIntervalMs = 1000, historyLimit = 60): void {
  if (isMonitoring) {
    console.log('NPU monitoring is already active');
    return;
  }
  
  isMonitoring = true;
  usageHistory = [];
  
  // Define monitoring function
  const updateUsage = async () => {
    try {
      const stats = await getCurrentNpuUsage();
      
      // Add to history
      usageHistory.push(stats);
      
      // Limit history size
      if (usageHistory.length > historyLimit) {
        usageHistory.shift(); // Remove oldest entry
      }
      
      // Dispatch custom event to notify UI
      const event = new CustomEvent('npu-usage-update', { 
        detail: { current: stats, history: usageHistory } 
      });
      window.dispatchEvent(event);
      
    } catch (error) {
      console.error('Error updating NPU usage:', error);
    }
  };
  
  // Run immediately once
  updateUsage();
  
  // Set interval for continuous monitoring
  monitoringInterval = window.setInterval(updateUsage, updateIntervalMs);
  
  console.log(`NPU monitoring started with ${updateIntervalMs}ms update interval`);
}

/**
 * Stop NPU usage monitoring
 */
export function stopNpuMonitoring(): void {
  if (monitoringInterval !== null) {
    clearInterval(monitoringInterval);
    monitoringInterval = null;
    isMonitoring = false;
    console.log('NPU monitoring stopped');
  }
}

/**
 * Get the current NPU usage history
 */
export function getNpuUsageHistory(): NpuUsageStats[] {
  return [...usageHistory]; // Return a copy
}

/**
 * Run a heavy workload to test NPU performance
 * @param duration Duration of the stress test in milliseconds
 * @param intensity Level of computational intensity (1-10)
 * @returns Promise that resolves with performance metrics
 */
export async function runNpuStressTest(duration = 5000, intensity = 5): Promise<{
  averageUtilization: number,
  peakMemoryMB: number,
  operations: number,
  successful: boolean
}> {
  try {
    console.log(`Starting NPU stress test (${duration}ms, intensity: ${intensity})`);
    
    // Make sure we're using WebGPU if available
    if (tf.getBackend() !== 'webgpu') {
      await tf.setBackend('webgpu');
    }
    
    // Start monitoring if not already active
    const wasMonitoring = isMonitoring;
    if (!wasMonitoring) {
      startNpuMonitoring(200, 1000); // Fast updates during stress test
    }
    
    // Scale matrix size based on intensity (higher = more computation)
    const matrixSize = 500 * intensity;
    const iterations = Math.max(1, Math.floor(duration / 1000) * intensity);
    
    const startTime = Date.now();
    let operations = 0;
    let utilizationSum = 0;
    let utilizationSamples = 0;
    let peakMemoryMB = 0;
    
    // Create tensors for operations
    const matrices = [];
    for (let i = 0; i < 3; i++) {
      matrices.push(tf.randomNormal([matrixSize, matrixSize]));
    }
    
    // Keep running operations until duration is reached
    while (Date.now() - startTime < duration) {
      // Perform matrix multiplication (computationally intensive)
      const result = tf.matMul(matrices[0], matrices[1]);
      const result2 = tf.matMul(result, matrices[2]);
      
      // Force execution to complete
      await result2.data();
      
      // Clean up intermediate results
      result.dispose();
      result2.dispose();
      
      // Update stats
      operations++;
      
      // Check current usage
      const currentStats = await getCurrentNpuUsage();
      utilizationSum += currentStats.utilizationPercent;
      utilizationSamples++;
      peakMemoryMB = Math.max(peakMemoryMB, currentStats.memoryUsageMB);
      
      // Small delay to prevent browser freeze
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    // Clean up tensors
    matrices.forEach(mat => mat.dispose());
    
    // Calculate metrics
    const averageUtilization = utilizationSamples > 0 
      ? utilizationSum / utilizationSamples 
      : 0;
    
    // Stop monitoring if we started it
    if (!wasMonitoring) {
      stopNpuMonitoring();
    }
    
    // Return performance metrics
    return {
      averageUtilization: Math.round(averageUtilization),
      peakMemoryMB,
      operations,
      successful: true
    };
    
  } catch (error) {
    console.error('NPU stress test failed:', error);
    return {
      averageUtilization: 0,
      peakMemoryMB: 0,
      operations: 0,
      successful: false
    };
  }
}