// src/app/components/NpuSettings.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { verifyNpuAcceleration, getAccelerationInfo, initializeTensorflow } from '@/utils/model-manager';

// Local storage keys
const SETTINGS_KEY = 'ecoVision.npuSettings';

const NpuSettings: React.FC = () => {
  const [useNpu, setUseNpu] = useState<boolean>(true);
  const [implementation, setImplementation] = useState<string>('tensorflow');
  const [isNpuAvailable, setIsNpuAvailable] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [accelerationInfo, setAccelerationInfo] = useState<Record<string, any>>({});
  const [benchmarkResults, setBenchmarkResults] = useState<{isNpuActive: boolean, benchmarkMs: number} | null>(null);
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  // Load settings on component mount
  useEffect(() => {
    // Load settings from localStorage
    try {
      const savedSettings = localStorage.getItem(SETTINGS_KEY);
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        setUseNpu(parsed.useNpu !== undefined ? parsed.useNpu : true);
        setImplementation(parsed.implementation || 'tensorflow');
      }
    } catch (error) {
      console.error('Error loading NPU settings:', error);
    }

    // Check for NPU availability
    const checkNpu = async () => {
      try {
        setIsLoading(true);
        
        // Initialize TensorFlow.js with WebGPU backend
        const isInitialized = await initializeTensorflow();
        setIsNpuAvailable(isInitialized);
        
        // Get acceleration info
        const info = await getAccelerationInfo();
        setAccelerationInfo(info);
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error checking NPU availability:', error);
        setIsNpuAvailable(false);
        setIsLoading(false);
      }
    };

    checkNpu();
  }, []);

  // Save settings when they change
  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify({
        useNpu,
        implementation
      }));
      
      // Update environment variables in memory (these won't persist after reload)
      window.process = window.process || {};
      window.process.env = window.process.env || {};
      window.process.env.NEXT_PUBLIC_USE_NPU = useNpu ? 'true' : 'false';
      window.process.env.NEXT_PUBLIC_NPU_IMPLEMENTATION = implementation;
    } catch (error) {
      console.error('Error saving NPU settings:', error);
    }
  }, [useNpu, implementation]);

  // Run benchmark
  const runBenchmark = async () => {
    try {
      setIsLoading(true);
      const results = await verifyNpuAcceleration();
      setBenchmarkResults(results);
    } catch (error) {
      console.error('Benchmark error:', error);
      alert('Failed to run benchmark. See console for details.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-6">
      <h2 className="text-lg font-semibold mb-4">AMD NPU Settings</h2>
      
      <div className="flex flex-col space-y-4">
        {/* NPU Status Indicator */}
        <div className="flex items-center">
          <div className={`h-3 w-3 rounded-full mr-2 ${
            isNpuAvailable === null ? 'bg-gray-400' :
            isNpuAvailable ? 'bg-green-500' : 'bg-red-500'
          }`}></div>
          <span className="text-sm">
            {isNpuAvailable === null ? 'Checking NPU availability...' :
             isNpuAvailable ? 'AMD NPU detected and available' : 'AMD NPU not detected'}
          </span>
        </div>
        
        {/* Settings Controls */}
        <div className="flex items-center space-x-2">
          <label className="inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={useNpu}
              onChange={(e) => setUseNpu(e.target.checked)}
              disabled={isLoading || isNpuAvailable === false}
            />
            <div className={`relative w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-green-300 
                          peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] 
                          after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 
                          after:border after:rounded-full after:h-5 after:w-5 after:transition-all 
                          peer-checked:bg-green-600 ${isNpuAvailable === false ? 'opacity-50' : ''}`}></div>
            <span className="ml-3 text-sm font-medium text-gray-900">
              Use AMD NPU Acceleration
            </span>
          </label>
        </div>
        
        {/* Implementation Selection */}
        {useNpu && (
          <div className="flex flex-col space-y-1">
            <label className="text-sm font-medium text-gray-700">Implementation:</label>
            <select
              value={implementation}
              onChange={(e) => setImplementation(e.target.value)}
              className="border border-gray-300 rounded px-3 py-1 text-sm"
              disabled={isLoading}
            >
              <option value="tensorflow">TensorFlow.js (WebGPU)</option>
              <option value="onnx">ONNX Runtime (WebGPU)</option>
            </select>
          </div>
        )}
        
        {/* Advanced Button */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
        >
          {showAdvanced ? 'Hide Advanced Info' : 'Show Advanced Info'}
        </button>
        
        {/* Advanced Info Panel */}
        {showAdvanced && (
          <div className="mt-4 p-3 bg-gray-50 rounded-md text-xs">
            <h3 className="font-medium mb-2">Acceleration Information:</h3>
            <ul className="space-y-1">
              <li><span className="font-medium">TensorFlow Backend:</span> {accelerationInfo.tensorflowBackend || 'Unknown'}</li>
              <li><span className="font-medium">WebGPU Support:</span> {accelerationInfo.webgpuSupported ? 'Yes' : 'No'}</li>
              <li><span className="font-medium">Device Vendor:</span> {accelerationInfo.deviceVendor || 'Unknown'}</li>
              <li><span className="font-medium">Architecture:</span> {accelerationInfo.deviceArchitecture || 'Unknown'}</li>
              <li><span className="font-medium">WebGPU Backend Active:</span> {accelerationInfo.isWebGpuBackend ? 'Yes' : 'No'}</li>
            </ul>
            
            {/* Benchmark Results */}
            {benchmarkResults && (
              <div className="mt-3">
                <h3 className="font-medium mb-2">Benchmark Results:</h3>
                <ul className="space-y-1">
                  <li><span className="font-medium">Average Inference Time:</span> {benchmarkResults.benchmarkMs.toFixed(2)}ms</li>
                  <li><span className="font-medium">NPU Acceleration:</span> {benchmarkResults.isNpuActive ? 'Active' : 'Inactive'}</li>
                </ul>
              </div>
            )}
            
            {/* Benchmark Button */}
            <button
              onClick={runBenchmark}
              disabled={isLoading}
              className="mt-3 bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Running...' : 'Run Benchmark'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default NpuSettings;