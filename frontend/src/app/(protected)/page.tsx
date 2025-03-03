"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";

const Home = () => {
    const router = useRouter();
    
    return (
        <main className="min-h-screen bg-white flex flex-col items-center justify-center p-8 relative">
            {/* Abstract background pattern */}
            <div className="absolute inset-0 opacity-5">
                <div className="absolute w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.1)_0%,transparent_50%)]"></div>
                <div className="absolute w-full h-full bg-[radial-gradient(circle_at_80%_20%,rgba(16,185,129,0.1)_0%,transparent_40%)]"></div>
            </div>

            <div className="text-center space-y-8 relative">
                <h1 className="text-7xl font-extralight tracking-tight text-gray-900 [text-shadow:_4px_4px_12px_rgb(0_0_0_/_35%)]">
                    Eco<span className="text-emerald-500">Vision</span>
                </h1>
                <p className="text-xl text-gray-600 max-w-xl mx-auto">
                    Transforming the way we see sustainability
                </p>
                <button 
                    onClick={() => router.push("/image")} 
                    className="cursor-pointer mt-8 px-8 py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 
                    text-white rounded-lg hover:from-emerald-600 hover:to-emerald-700 
                    transition-all duration-300 text-lg font-light tracking-wide shadow-md"
                >
                    Get Started
                </button>
            </div>
        </main>
    );
};

export default Home;