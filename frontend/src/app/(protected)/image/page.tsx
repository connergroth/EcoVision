"use client"

import React from 'react';
import { useAuth } from '../../hooks/AuthHook';
import { useRouter } from 'next/navigation';
import LoadingPage from '../../components/LoadingPage';
import WebcamDetection from '../../components/WebcamDetection';

export default function ImagePage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    
    // Redirect to login if not authenticated
    React.useEffect(() => {
        if (!loading && !user) {
            router.push('/auth');
        }
    }, [user, loading, router]);
    
    if (loading || !user) {
        return <LoadingPage />;
    }
    
    return (
        <main className="min-h-screen bg-gray-50 py-12 px-4">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold text-gray-900 mb-6 text-center">
                    EcoVision Scanner
                </h1>
                <p className="text-center text-gray-600 mb-8">
                    Point your camera at a recyclable item to identify it and learn how to dispose of it properly.
                </p>
                
                <WebcamDetection />
                
                <div className="mt-12 text-center">
                    <button 
                        onClick={() => router.push('/')}
                        className="text-emerald-600 hover:text-emerald-800 transition-colors"
                    >
                        Back to Home
                    </button>
                </div>
            </div>
        </main>
    );
}
