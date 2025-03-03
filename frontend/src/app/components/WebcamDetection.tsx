import React, { useRef, useState, useEffect, useCallback } from 'react';
import Webcam from 'react-webcam';
import { apiClient } from '@/app/api/apiClient';

interface Detection {
  category: string;
  confidence: number;
  bounding_box?: {
    x_min: number;
    y_min: number;
    x_max: number;
    y_max: number;
  };
}

interface RecyclingInfo {
  category: string;
  recyclable: boolean;
  description: string;
  disposal_instructions: string;
  environmental_impact: string;
}

interface DetectionResponse {
  success: boolean;
  detection: Detection | null;
  recycling_info: RecyclingInfo | null;
  points_earned: number | null;
  error_message: string | null;
}

const WebcamDetection: React.FC = () => {
  const webcamRef = useRef<Webcam>(null);
  const [isActive, setIsActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [detectionResult, setDetectionResult] = useState<DetectionResponse | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // WebSocket for continuous detection
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [detectedObjects, setDetectedObjects] = useState<Detection[]>([]);

  // Capture and process a full image
  const captureAndProcess = useCallback(async () => {
    if (!webcamRef.current || isProcessing) return;
    
    try {
      setIsProcessing(true);
      
      const imageSrc = webcamRef.current.getScreenshot();
      if (!imageSrc) {
        throw new Error("Failed to capture image");
      }
      
      // Call the backend API
      const result = await apiClient.detection.detectBase64(
        imageSrc, 
      );
      
      setDetectionResult(result);
      setShowResults(true);
      
    } catch (error) {
      console.error('Detection error:', error);
      setErrorMessage('Failed to process image. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing]);

  const setupWebSocket = useCallback(async () => {
    try {
      const newSocket = await apiClient.detection.setupWebSocket();
      setSocket(newSocket);
      
      newSocket.onmessage = (event: MessageEvent) => {
        const data = JSON.parse(event.data);
        
        if (data.status === 'detection' && data.detection) {
          // Handle high-confidence detection
          const newDetection = data.detection;
          setDetectedObjects(prev => [...prev, newDetection]);
          
          // If we get a high-confidence detection, capture a full image and send
          // to the backend for complete processing
          if (newDetection.confidence > 0.7 && !isProcessing) {
            captureAndProcess();
          }
        }
      };
      
      newSocket.onerror = (error) => {
        console.error('WebSocket error:', error);
        setErrorMessage('Connection error. Please try again.');
      };
      
      newSocket.onclose = () => {
        setSocket(null);
      };
    } catch (error) {
      console.error('Failed to setup WebSocket:', error);
      setErrorMessage('Failed to initialize detector. Please try again.');
    }
  }, [isProcessing, captureAndProcess]);

  // Initialize WebSocket connection
  useEffect(() => {
    if (isActive && !socket) {
      setupWebSocket();
    }
    
    return () => {
      if (socket) {
        socket.close();
      }
    };
  }, [isActive, setupWebSocket, socket]);

  // Function to send frame to WebSocket
  const sendFrameToSocket = useCallback(() => {
    if (socket && socket.readyState === WebSocket.OPEN && webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      if (imageSrc) {
        const base64Image = imageSrc.split(',')[1]; 
        socket.send(JSON.stringify({
          image: base64Image
        }));
      }
    }
  }, [socket, webcamRef]);

  // Continuously send frames to WebSocket
  useEffect(() => {
    if (!isActive || !socket) return;

    const interval = setInterval(() => {
      sendFrameToSocket();
    }, 500); // Send every 500ms

    return () => clearInterval(interval);
  }, [isActive, socket, sendFrameToSocket]);

  // Handle manual capture button
  const handleManualCapture = () => {
    captureAndProcess();
  };

  // Reset detection and start again
  const handleReset = () => {
    setDetectionResult(null);
    setShowResults(false);
    setDetectedObjects([]);
    setErrorMessage(null);
  };

  // Toggle webcam activation
  const toggleWebcam = () => {
    if (isActive) {
      // Clean up
      if (socket) {
        socket.close();
        setSocket(null);
      }
      handleReset();
    }
    setIsActive(!isActive);
  };

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h2 className="text-2xl font-semibold text-gray-800 mb-4">Recycle Detection</h2>
      
      {errorMessage && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
          <p>{errorMessage}</p>
          <button 
            className="text-red-700 underline mt-2"
            onClick={() => setErrorMessage(null)}
          >
            Dismiss
          </button>
        </div>
      )}
      
      <div className="relative">
        {isActive && (
          <div className="rounded-lg overflow-hidden shadow-lg bg-black">
            <Webcam
              audio={false}
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              videoConstraints={{
                width: 640,
                height: 480,
                facingMode: "environment" // Use back camera if available
              }}
              className="w-full h-auto"
            />
            
            {/* Detection overlay - draw bounding boxes */}
            {detectedObjects.length > 0 && !showResults && (
              <div className="absolute inset-0 pointer-events-none">
                {detectedObjects.map((obj, idx) => (
                  obj.bounding_box && (
                    <div 
                      key={idx}
                      className="absolute border-2 border-green-500"
                      style={{
                        left: `${obj.bounding_box.x_min * 100}%`,
                        top: `${obj.bounding_box.y_min * 100}%`,
                        width: `${(obj.bounding_box.x_max - obj.bounding_box.x_min) * 100}%`,
                        height: `${(obj.bounding_box.y_max - obj.bounding_box.y_min) * 100}%`
                      }}
                    >
                      <div className="bg-green-500 text-white text-xs absolute top-0 left-0 px-1">
                        {obj.category} ({Math.round(obj.confidence * 100)}%)
                      </div>
                    </div>
                  )
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* Results modal */}
        {showResults && detectionResult && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-lg w-full p-6">
              <h3 className="text-2xl font-bold mb-4">
                {detectionResult.detection ? "Item Detected!" : "No Items Detected"}
              </h3>
              
              {detectionResult.detection && (
                <>
                  <div className="mb-4">
                    <p className="text-lg font-semibold">
                      Category: <span className="text-green-600">{detectionResult.detection.category}</span> 
                      <span className="text-sm text-gray-500 ml-2">
                        ({Math.round(detectionResult.detection.confidence * 100)}% confidence)
                      </span>
                    </p>
                  </div>

                  {detectionResult.recycling_info && (
                    <div className="mb-4 bg-gray-50 p-4 rounded-lg">
                      <p className="font-semibold text-lg mb-2">
                        Recyclable: 
                        <span className={detectionResult.recycling_info.recyclable ? "text-green-600 ml-2" : "text-red-600 ml-2"}>
                          {detectionResult.recycling_info.recyclable ? "Yes" : "No"}
                        </span>
                      </p>
                      
                      <p className="mb-2">{detectionResult.recycling_info.description}</p>
                      
                      <h4 className="font-semibold mt-3">Disposal Instructions:</h4>
                      <p>{detectionResult.recycling_info.disposal_instructions}</p>
                      
                      <h4 className="font-semibold mt-3">Environmental Impact:</h4>
                      <p>{detectionResult.recycling_info.environmental_impact}</p>
                    </div>
                  )}

                  {detectionResult.points_earned !== null && detectionResult.points_earned > 0 && (
                    <div className="my-4 text-center bg-green-100 p-3 rounded-lg">
                      <p className="text-xl font-bold text-green-800">
                        +{detectionResult.points_earned} points earned!
                      </p>
                      <p className="text-green-600">
                        Thank you for recycling responsibly!
                      </p>
                    </div>
                  )}
                </>
              )}
              
              {!detectionResult.detection && detectionResult.error_message && (
                <p className="text-gray-700 mb-4">{detectionResult.error_message}</p>
              )}
              
              <div className="flex justify-between mt-6">
                <button 
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors"
                  onClick={handleReset}
                >
                  Try Again
                </button>
                
                <button 
                  className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors"
                  onClick={() => setShowResults(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <div className="mt-6 flex justify-center space-x-4">
        <button
          className={`px-6 py-3 rounded-lg shadow transition-colors ${
            isActive
              ? 'bg-red-600 text-white hover:bg-red-700'
              : 'bg-emerald-600 text-white hover:bg-emerald-700'
          }`}
          onClick={toggleWebcam}
        >
          {isActive ? 'Stop Camera' : 'Start Camera'}
        </button>
        
        {isActive && (
          <button
            className="px-6 py-3 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition-colors"
            onClick={handleManualCapture}
            disabled={isProcessing}
          >
            {isProcessing ? 'Processing...' : 'Capture Now'}
          </button>
        )}
      </div>
    </div>
  );
};

export default WebcamDetection;