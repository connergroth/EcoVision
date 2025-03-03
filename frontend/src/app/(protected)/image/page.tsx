"use client"
import { TrashData } from "@/utils/gpt-image-analysis";
import { useAuth } from "@/app/hooks/AuthHook";

import React, { useRef, useEffect, useState } from 'react';
import Webcam from "react-webcam";

// Option 1: Create an extended interface that includes all properties used in this component
interface ExtendedTrashData extends TrashData {
    category: string;  // Add the missing property
}

const ResultModal = ({ isOpen, onClose, data }: { isOpen: boolean, onClose: () => void, data: ExtendedTrashData }) => {

    const handleClose = () => {
        onClose();
    }

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-8 z-50">
            <div className="bg-white rounded-2xl p-8 max-w-2xl w-full">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-800">Scan Result</h2>
                    <button onClick={handleClose}
                     className="cursor-pointer text-slate-500 hover:text-slate-700">
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
                                <p className="text-slate-700"><span className="font-medium">Material:</span> {data.category}</p>
                            </div>
                        </div>
                        <div className="space-y-3">
                            <h3 className="font-semibold text-slate-700">Insights</h3>
                            <div className="bg-blue-50 rounded-lg p-3">
           
                                    <p className="text-sm text-slate-600 leading-relaxed">
                                        {data.insight}
                                    </p>
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

const WebcamCapture = ({ isWebcamOpen, setIsWebcamOpen, onScanComplete, userId, email }: { 
    isWebcamOpen: boolean, 
    setIsWebcamOpen: (isWebcamOpen: boolean) => void,
    onScanComplete: (data: ExtendedTrashData) => void,
    userId: string,
    email: string
}) => {
    const webcamRef = useRef<Webcam>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    const capture = React.useCallback(async () => {
        if(isAnalyzing) return {success: false, imageSrc: null};
        try {
            const imageSrc = webcamRef.current?.getScreenshot();
            
            // Use the dummy response directly
            if(!imageSrc) {
                return { success: false, imageSrc: null };
            }
            setIsAnalyzing(true);
            return {success: true, imageSrc};
        } catch (error) {
            console.error("Error analyzing image:", error);
            return { success: false, imageSrc: null };
        }
     
    }, [webcamRef, isAnalyzing]);


    const handleClassifyImage = async (imageSrc: string) => {
        const result = await fetch("/api/classify", {
            method: "POST",
            body: JSON.stringify({ image: imageSrc }),
        });


        if (!result.ok) {
            throw new Error("Failed to classify image");
        }
        const classifiedData = await result.json();
        console.log("data: ", classifiedData);
        return {...classifiedData, imageSrc};
    }

    useEffect(() => {
        if(isAnalyzing) return;
        if (!isWebcamOpen) return;

        const interval = setInterval(async () => {
            const response = await capture();
            console.log("response: ", response);
            if (response.success && !isAnalyzing) {
                console.log("Generating classification...");
                const data = await handleClassifyImage(response.imageSrc as string);
                console.log("JSON DATA: ", data)
                if(!(data.item == "N/A")) {
                    await fetch("/api/image", {
                        method: "POST",
                        body: JSON.stringify({ imageData: response.imageSrc, item: data.item, category: data.category, insight: data.insight, bin: data.bin, userId, email }),
                    });
                    console.log("IMAGE SRC: ", response.imageSrc);
                }
                onScanComplete(data as ExtendedTrashData);
                setIsAnalyzing(true);
                setIsWebcamOpen(false);
                return;
            }
        }, 1000);

        return () => {
            clearInterval(interval);
        };
    }, [capture, isWebcamOpen, setIsWebcamOpen, onScanComplete, isAnalyzing, userId, email]);

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
    const [modalData, setModalData] = useState<ExtendedTrashData | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { user } = useAuth();

    const handleScanComplete = (data: ExtendedTrashData) => {
        setModalData(data);
        setIsModalOpen(true);
    };

    return (
        <main className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 py-12 px-4">
            <div className="max-w-4xl mx-auto">
                <div className="text-center mb-12">
                <h1 className="mb-10 text-7xl font-extralight tracking-tight text-gray-900 [text-shadow:_4px_4px_12px_rgb(0_0_0_/_35%)]">
                    Eco<span className="text-emerald-500">Vision</span>
                </h1>
                    <p className="text-slate-600 text-lg">
                        Point your camera at any item to identify the correct recycling bin
                    </p>
                </div>
                
                <div className="space-y-8">
                    {isWebcamOpen ? (
                        <>
                            {user && (
                                <WebcamCapture 
                                    isWebcamOpen={isWebcamOpen} 
                                    setIsWebcamOpen={setIsWebcamOpen}
                                    onScanComplete={handleScanComplete}
                                    userId={user.uid}
                                    email={user.email || ''}
                                />
                            )}
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

            {modalData && (
                <ResultModal 
                    isOpen={isModalOpen} 
                    onClose={() => setIsModalOpen(false)} 
                    data={modalData} 
                />
            )}
        </main>
    );
}