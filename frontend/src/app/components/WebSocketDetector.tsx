import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '../hooks/AuthHook';

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

interface WebSocketDetectorProps {
  onDetection: (detection: Detection) => void;
  onError: (error: string) => void;
  isActive: boolean;
  webcamRef: React.RefObject<{ getScreenshot: () => string | null }>; 
}

const WebSocketDetector: React.FC<WebSocketDetectorProps> = ({ 
  onDetection, 
  onError,
  isActive,
  webcamRef
}) => {
  const { user, getIdToken } = useAuth() as { user: { uid: string } | null, getIdToken: () => Promise<string> };
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  
  // Setup WebSocket connection
  useEffect(() => {
    if (!isActive || !user || !user.uid) return;
    
    const setupWebSocket = async () => {
      try {
        // Close existing connection if any
        if (socketRef.current) {
          socketRef.current.close();
        }
        
        // Get the auth token
        const token = await getIdToken();
        
        // Create new WebSocket connection
        const userId = user.uid;
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsHost = process.env.NEXT_PUBLIC_WS_HOST || window.location.host;
        const wsUrl = `${wsProtocol}//${wsHost}/ws/detection/${userId}`;
        
        const ws = new WebSocket(wsUrl);
        
        // Store the socket reference
        socketRef.current = ws;
        setSocket(ws);
        
        // Setup event handlers
        ws.onopen = () => {
          console.log('WebSocket connection established');
          // Send authentication message
          ws.send(JSON.stringify({ token }));
        };
        
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            if (data.status === 'error') {
              onError(data.message || 'WebSocket error');
              return;
            }
            
            if (data.status === 'detection' && data.detection) {
              onDetection(data.detection);
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };
        
        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          onError('Connection error. Please try again.');
        };
        
        ws.onclose = () => {
          console.log('WebSocket connection closed');
          socketRef.current = null;
          setSocket(null);
        };
      } catch (error) {
        console.error('Failed to setup WebSocket:', error);
        onError('Failed to initialize detector. Please try again.');
      }
    };
    
    setupWebSocket();
    
    // Cleanup function
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
        setSocket(null);
      }
    };
  }, [user, isActive, getIdToken, onError, onDetection]);
  
  // Function to send frame to WebSocket
  const sendFrameToSocket = useCallback(() => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN || !webcamRef.current) {
      return;
    }
    
    try {
      const imageSrc = webcamRef.current.getScreenshot();
      if (imageSrc) {
        const base64Image = imageSrc.split(',')[1]; 
        socketRef.current.send(JSON.stringify({
          image: base64Image
        }));
      }
    } catch (error) {
      console.error('Error capturing or sending frame:', error);
    }
  }, [webcamRef]);
  
  // Continuously send frames to WebSocket
  useEffect(() => {
    if (!isActive || !socket) return;
    
    const interval = setInterval(() => {
      sendFrameToSocket();
    }, 500); // Send every 500ms
    
    return () => {
      clearInterval(interval);
    };
  }, [isActive, socket, sendFrameToSocket]);
  
  return null; // This is a non-visual component
};

export default WebSocketDetector;