// src/app/components/NpuUsageMonitor.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { startNpuMonitoring, stopNpuMonitoring, getNpuUsageHistory, runNpuStressTest, NpuUsageStats } from '@/utils/npu-monitor';

const NpuUsageMonitor: React.FC = () => {
  const [usageData, setUsageData] = useState<NpuUsageStats | null>(null);
  const [history, setHistory] = useState<NpuUsageStats[]>([]);
  const [isMonitoring, setIsMonitoring] = useState<boolean>(false);
  const [isRunningTest, setIsRunningTest] = useState<boolean>(false);
  const [testResults, setTestResults] = useState<any>(null);
  
  // Start/stop monitoring
  useEffect(() => {
    if (isMonitoring) {
      // Listen for updates
      const handleUsageUpdate = (event: CustomEvent) => {
        setUsageData(event.detail.current);
        setHistory(event.detail.history);
      };
      
      // Add event listener
      window.addEventListener('npu-usage-update', handleUsageUpdate as EventListener);
      
      // Start monitoring
      startNpuMonitoring(500, 60); // Update every 500ms, keep 60 data points
      
      return () => {
        // Clean up
        window.removeEventListener('npu-usage-update', handleUsageUpdate as EventListener);
        stopNpuMonitoring();
      };
    }
  }, [isMonitoring]);
  
  // Toggle monitoring
  const toggleMonitoring = () => {
    if (isMonitoring) {
      stopNpuMonitoring();
      setIsMonitoring(false);
    } else {
      setIsMonitoring(true);
    }
  };
  
  // Run stress test
  const handleRunTest = async () => {
    setIsRunningTest(true);
    
    // Make sure monitoring is active during test
    const wasMonitoring = isMonitoring;
    if (!wasMonitoring) {
      setIsMonitoring(true);
    }
    
    // Run the test
    const results = await runNpuStressTest(5000, 5);
    setTestResults(results);
    
    // Stop monitoring if it wasn't on before
    if (!wasMonitoring) {
      setIsMonitoring(false);
    }
    
    setIsRunningTest(false);
  };
  
  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-6">
      <h2 className="text-lg font-semibold mb-4">NPU Usage Monitor</h2>
      
      {/* Current usage display */}
      {usageData && (
        <div className="mb-4">
          <h3 className="text-md font-medium mb-2">Current NPU Status</h3>
          
          {/* NPU Utilization Gauge */}
          <div className="mb-3">
            <div className="flex justify-between text-sm mb-1">
              <span>NPU Utilization</span>
              <span className={`font-medium ${usageData.isNpuActive ? 'text-green-600' : 'text-red-500'}`}>
                {usageData.utilizationPercent}%
              </span>
            </div>
            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className={`h-full ${
                  usageData.utilizationPercent > 80 ? 'bg-red-500' : 
                  usageData.utilizationPercent > 50 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${usageData.utilizationPercent}%` }}
              ></div>
            </div>
          </div>
          
          {/* Memory Usage */}
          <div className="mb-3">
            <div className="flex justify-between text-sm mb-1">
              <span>Memory Usage</span>
              <span className="font-medium">{usageData.memoryUsageMB} MB</span>
            </div>
            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500"
                style={{ width: `${Math.min(100, (usageData.memoryUsageMB / 500) * 100)}%` }}
              ></div>
            </div>
          </div>
          
          {/* Processing Time */}
          <div className="grid grid-cols-2 gap-4 text-sm mt-3">
            <div>
              <span className="font-medium">Processing Time:</span> {usageData.processingTimeMs.toFixed(2)}ms
            </div>
            <div>
              <span className="font-medium">Active Operations:</span> {usageData.activeOperations}
            </div>
            <div>
              <span className="font-medium">NPU Status:</span> 
              <span className={usageData.isNpuActive ? 'text-green-600 ml-1' : 'text-red-500 ml-1'}>
                {usageData.isNpuActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div>
              <span className="font-medium">Backend:</span> {window.tensorflow?.getBackend?.() || 'Unknown'}
            </div>
          </div>
        </div>
      )}
      
      {/* Usage History Graph */}
      {history.length > 0 && (
        <div className="mb-4">
          <h3 className="text-md font-medium mb-2">Usage History</h3>
          <div className="h-32 bg-gray-100 rounded border border-gray-200 p-2 relative">
            {/* Simple sparkline-style graph */}
            <div className="flex h-full items-end w-full">
              {history.map((point, index) => (
                <div 
                  key={index}
                  className="w-full h-full flex flex-col justify-end mx-0.5"
                >
                  <div 
                    className={`w-1 ${
                      point.utilizationPercent > 80 ? 'bg-red-500' : 
                      point.utilizationPercent > 50 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ height: `${point.utilizationPercent}%` }}
                  ></div>
                </div>
              ))}
            </div>
            
            {/* Y-axis labels */}
            <div className="absolute top-0 left-0 h-full flex flex-col justify-between text-xs text-gray-500 -ml-6">
              <span>100%</span>
              <span>50%</span>
              <span>0%</span>
            </div>
          </div>
        </div>
      )}
      
      {/* Control buttons */}
      <div className="flex space-x-3">
        <button
          onClick={toggleMonitoring}
          className={`px-3 py-1.5 rounded text-sm font-medium ${
            isMonitoring ? 'bg-red-500 hover:bg-red-600 text-white' : 
                         'bg-green-500 hover:bg-green-600 text-white'
          }`}
        >
          {isMonitoring ? 'Stop Monitoring' : 'Start Monitoring'}
        </button>
        
        <button
          onClick={handleRunTest}
          disabled={isRunningTest}
          className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm font-medium disabled:opacity-50"
        >
          {isRunningTest ? 'Running Test...' : 'Run NPU Stress Test'}
        </button>
      </div>
      
      {/* Test results */}
      {testResults && (
        <div className="mt-4 p-3 bg-gray-50 rounded-md">
          <h3 className="text-md font-medium mb-2">NPU Stress Test Results</h3>
          <div className="text-sm">
            <div className="grid grid-cols-2 gap-y-2">
              <div><span className="font-medium">Average Utilization:</span></div>
              <div>{testResults.averageUtilization}%</div>
              
              <div><span className="font-medium">Peak Memory Usage:</span></div>
              <div>{testResults.peakMemoryMB} MB</div>
              
              <div><span className="font-medium">Operations Completed:</span></div>
              <div>{testResults.operations}</div>
              
              <div><span className="font-medium">Test Status:</span></div>
              <div className={testResults.successful ? 'text-green-600' : 'text-red-500'}>
                {testResults.successful ? 'Successful' : 'Failed'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NpuUsageMonitor;