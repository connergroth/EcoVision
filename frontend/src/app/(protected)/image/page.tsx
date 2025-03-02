"use client"
import { TrashData } from "@/utils/gpt-image-analysis";


const dummyResponse = {
    "bin": "Recycling",
    "confidence": 0.95,
    "material": "paper",
    "item": "Newspaper",
    "success": true
}


const analyzeTrash = async (trashData: TrashData) => {
    // Instead of making an API call, return the dummy response
    return dummyResponse;
}

import React, { useRef, useEffect, useState } from 'react';
import Webcam from "react-webcam";

const ResultModal = ({ isOpen, onClose, data }: { isOpen: boolean, onClose: () => void, data: TrashData }) => {
    const [aiInsight, setAiInsight] = useState("");
    const [loading, setLoading] = useState(true);
    console.log("data: ", data);
    useEffect(() => {
        if (!isOpen || !data) return;

        setLoading(true);
        const getAiInsight = async () => {
            try {
                const result = await fetch("/api/chat", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ data: data }),
                });

                if (!result.ok) {
                    throw new Error("Failed to fetch data");
                }

                const insightData = await result.json();
                setAiInsight(insightData.response);
            } catch (error) {
                console.error("Error fetching insight:", error);
                setAiInsight("Failed to load insights.");
            } finally {
                setLoading(false);
            }
        };

        getAiInsight();
    }, [isOpen, data]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-8 z-50">
            <div className="bg-white rounded-2xl p-8 max-w-2xl w-full">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-green-800">Scan Result</h2>
                    <button onClick={() => {
                        onClose();
                    }} className="cursor-pointer text-slate-500 hover:text-slate-700">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <div className="space-y-6">
                    <div className="p-4 bg-green-50 rounded-xl">
                        <p className="text-3xl font-bold text-green-800">{data.bin}</p>
                        <p className="text-slate-600">This item goes in the {data.bin.toLowerCase()} bin</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-3">
                            <h3 className="font-semibold text-slate-700">Item Details</h3>
                            <div className="space-y-2 text-sm">
                                <p className="text-slate-700"><span className="font-medium">Item:</span> {data.item}</p>
                                <p className="text-slate-700"><span className="font-medium">Material:</span> {data.material}</p>
                                <p className="text-slate-700"><span className="font-medium">Confidence:</span> {(data.confidence * 100).toFixed(0)}%</p>
                            </div>
                        </div>
                        <div className="space-y-3">
                            <h3 className="font-semibold text-slate-700">Insights</h3>
                            <div className="bg-blue-50 rounded-lg p-3">
                                {loading ? (
                                    <div className="flex flex-col items-center py-4 space-y-2">
                                        <div className="flex space-x-1">
                                            <div className="w-2 h-2 bg-emerald-600 rounded-full animate-[bounce_1s_infinite_0ms]"></div>
                                            <div className="w-2 h-2 bg-emerald-600 rounded-full animate-[bounce_1s_infinite_200ms]"></div>
                                            <div className="w-2 h-2 bg-emerald-600 rounded-full animate-[bounce_1s_infinite_400ms]"></div>
                                        </div>
                                        <p className="text-sm text-green-800">Getting AI insights...</p>
                                    </div>
                                ) : (
                                    <p className="text-sm text-slate-600 leading-relaxed">
                                        {aiInsight || "No insights available for this item."}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                <button 
                    onClick={onClose}
                    className="cursor-pointer mt-6 w-full bg-green-600 text-white py-2.5 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                >
                    Scan Another Item
                </button>
            </div>
        </div>
    );
};

const WebcamCapture = ({ isWebcamOpen, setIsWebcamOpen, onScanComplete }: { 
    isWebcamOpen: boolean, 
    setIsWebcamOpen: (isWebcamOpen: boolean) => void,
    onScanComplete: (data: any) => void 
}) => {
    const webcamRef = useRef(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    const capture = React.useCallback(async () => {
        try {
            const imageSrc = webcamRef.current.getScreenshot();
            
            // Use the dummy response directly
            return dummyResponse;
        } catch (error) {
            console.error("Error analyzing image:", error);
            return { success: false };
        } finally {
            setIsAnalyzing(false);
        }
    }, [webcamRef]);

    useEffect(() => {
        if (!isWebcamOpen) return;

        const interval = setInterval(async () => {
            const response = await capture();
            if (response.success) {
                onScanComplete(response);
                console.log("response: ", response);
                setIsWebcamOpen(false);
            }
        }, 1000);

        return () => {
            clearInterval(interval);
        };
    }, [capture, isWebcamOpen, setIsWebcamOpen, onScanComplete]);

    return (
        <>
            {isWebcamOpen && (
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
                        {isAnalyzing ? "Analyzing..." : "Scanning..."}
                    </div>
                </div>
            )}
        </>
    );
};

export default function Home() {
    const [isWebcamOpen, setIsWebcamOpen] = useState(false);
    const [modalData, setModalData] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleScanComplete = (data) => {
        setModalData(data);
        setIsModalOpen(true);
    };

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
                            <WebcamCapture 
                                isWebcamOpen={isWebcamOpen} 
                                setIsWebcamOpen={setIsWebcamOpen}
                                onScanComplete={handleScanComplete}
                            />
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

            <ResultModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                data={modalData} 
            />
        </main>
    );
}
