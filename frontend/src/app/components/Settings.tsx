'use client';

import React from 'react';
import { useAuth } from '@/app/hooks/AuthHook';
import NpuSettings from '@/app/components/NpuSettings';

const Settings = () => {
  const { user, loading } = useAuth();

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 text-center">Application Settings</h1>
      
      <div className="space-y-8">
        <section>
          <h2 className="text-xl font-semibold mb-4 border-b pb-2">Performance Settings</h2>
          <NpuSettings />
          
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 text-blue-700 mt-4">
            <p className="font-medium">About AMD NPU Acceleration</p>
            <p className="mt-2 text-sm">
              The AMD Neural Processing Unit (NPU) can significantly speed up AI inference 
              operations on supported devices. Enabling this setting will use your device's 
              NPU for image classification, reducing battery usage and improving performance.
            </p>
          </div>
        </section>
        
        <section>
          <h2 className="text-xl font-semibold mb-4 border-b pb-2">Model Settings</h2>
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium">Download Models for Offline Use</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Download AI models to your device to use EcoVision without an internet connection
                </p>
              </div>
              <button className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors">
                Download
              </button>
            </div>
            
            <div className="mt-4 pt-4 border-t border-gray-200">
              <h4 className="text-sm font-medium mb-2">Advanced Model Options</h4>
              <div className="flex items-center space-x-2">
                <label className="inline-flex items-center">
                  <input type="radio" name="modelPrecision" value="int8" className="text-emerald-600" defaultChecked />
                  <span className="ml-2 text-sm">INT8 (Faster, lower quality)</span>
                </label>
                <label className="inline-flex items-center">
                  <input type="radio" name="modelPrecision" value="fp16" className="text-emerald-600" />
                  <span className="ml-2 text-sm">FP16 (Balance)</span>
                </label>
                <label className="inline-flex items-center">
                  <input type="radio" name="modelPrecision" value="fp32" className="text-emerald-600" />
                  <span className="ml-2 text-sm">FP32 (Higher quality)</span>
                </label>
              </div>
            </div>
          </div>
        </section>
        
        <section>
          <h2 className="text-xl font-semibold mb-4 border-b pb-2">Privacy Settings</h2>
          <div className="bg-white rounded-lg shadow-md p-4">
            <label className="flex items-center justify-between">
              <div>
                <span className="font-medium">Local Processing Only</span>
                <p className="text-sm text-gray-600 mt-1">
                  Process all images on device without sending to cloud services
                </p>
              </div>
              <div className="relative inline-block w-12 align-middle select-none">
                <input 
                  type="checkbox" 
                  name="localProcessing" 
                  id="localProcessing" 
                  className="sr-only peer"
                  defaultChecked={true}
                />
                <div className="block h-6 bg-gray-200 rounded-full peer-checked:bg-emerald-600 after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-6"></div>
              </div>
            </label>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Settings;