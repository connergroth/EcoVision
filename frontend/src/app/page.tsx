"use client"

import React, { useRef, useEffect, useState } from 'react';
import Webcam from "react-webcam";

const WebcamCapture = ({ isWebcamOpen }: { isWebcamOpen: boolean }) => {
    const webcamRef = useRef(null);

    const capture = React.useCallback(() => {
        const imageSrc = webcamRef.current.getScreenshot();
        console.log(imageSrc);
        // Send this imageSrc to the backend
    }, [webcamRef]);

    // Use setInterval to capture snapshot every second
    useEffect(() => {
        if (!isWebcamOpen) return;

        const interval = setInterval(() => {
            capture();
        }, 1000);

        return () => {
            clearInterval(interval);
        };
    }, [capture, isWebcamOpen]);

    if (!isWebcamOpen) {
        return null;
    }

    return (
        <div className="max-w-2xl mx-auto rounded-lg overflow-hidden shadow-lg bg-white">
            <Webcam
                audio={false}
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                width="100%"
                videoConstraints={{ width: 640, height: 360, facingMode: "user" }}
                className="w-full h-auto"
            />
        </div>
    );
};

export default function Home() {
    const [isWebcamOpen, setIsWebcamOpen] = useState(false);
    
    return (
        <main className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto text-center">
                <h1 className="text-4xl font-bold text-gray-900 mb-8">
                    Eco Vision
                </h1>
                
                <div className="space-y-6">
                    <WebcamCapture isWebcamOpen={isWebcamOpen} />
                    
                    <div className="mt-4">
                        {isWebcamOpen ? (
                            <button 
                                className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200 ease-in-out shadow-sm"
                                onClick={() => setIsWebcamOpen(false)}
                            >
                                Close Camera
                            </button>
                        ) : (
                            <button 
                                className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors duration-200 ease-in-out shadow-sm"
                                onClick={() => setIsWebcamOpen(true)}
                            >
                                Open Camera
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </main>
    );
}
