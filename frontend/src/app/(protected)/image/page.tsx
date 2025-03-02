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
        <div className="relative w-full max-w-xl mx-auto rounded-2xl overflow-hidden bg-white/10 backdrop-blur-sm border border-white/20">
            <Webcam
                audio={false}
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                width="100%"
                videoConstraints={{ width: 1280, height: 720, facingMode: "user" }}
                className="w-full h-auto"
            />
            <div className="absolute bottom-4 left-4 bg-black/40 text-white text-sm px-3 py-1 rounded-full backdrop-blur-sm">
                Scanning...
            </div>
        </div>
    );
};

export default function Home() {
    const [isWebcamOpen, setIsWebcamOpen] = useState(false);

    return (
        <main className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 py-12 px-4">
            <div className="max-w-4xl mx-auto">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold mb-3 text-green-800">
                        EcoVision
                    </h1>
                    <p className="text-slate-600 text-lg">
                        Point your camera at any item to identify the correct recycling bin
                    </p>
                </div>
                
                <div className="space-y-8">
                    {isWebcamOpen ? (
                        <>
                            <WebcamCapture isWebcamOpen={isWebcamOpen} />
                            <div className="flex justify-center">
                                <button 
                                    className="cursor-pointer group relative px-6 py-3 bg-white shadow-lg text-slate-700 rounded-full hover:bg-slate-50 transition-all duration-200 ease-in-out"
                                    onClick={() => setIsWebcamOpen(false)}
                                >
                                    <span className="flex items-center space-x-2">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                        <span>Stop Scanning</span>
                                    </span>
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center space-y-6">
                            <div className="w-full max-w-xl aspect-video rounded-2xl bg-white shadow-lg flex items-center justify-center">
                                <svg className="w-20 h-20 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            </div>
                            <button 
                                className="cursor-pointer group relative px-6 py-3 bg-white shadow-lg text-slate-700 rounded-full hover:bg-slate-50 transition-all duration-200 ease-in-out"
                                onClick={() => setIsWebcamOpen(true)}
                            >
                                <span className="flex items-center space-x-2">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                    <span>Start Scanning</span>
                                </span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}
