"use client";
import LoadingPage from "../components/LoadingPage";
import { useAuth } from "../hooks/AuthHook";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { signOut } from "firebase/auth";
import { auth } from "../../firebase/firebaseConfig";

const Home = () => {
    const router = useRouter();
    return (
        <main className="min-h-screen bg-white flex flex-col items-center justify-center p-8">
            <div className="text-center">
                <h1 className="text-6xl font-light text-emerald-600 mb-4">
                    EcoVision
                </h1>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                    Transforming the way we see sustainability
                </p>
                <div className="mt-12">
                    <button onClick={() => router.push("/image")} className="px-8 py-3 bg-emerald-500 text-white rounded-full 
                        hover:bg-emerald-600 transition-colors duration-300">
                        Get Started
                    </button>
                    <button onClick={() => signOut(auth)} className="px-8 py-3 bg-emerald-500 text-white rounded-full 
                        hover:bg-emerald-600 transition-colors duration-300">
                        Sign Out
                    </button>
                </div>
            </div>
        </main>
    );
};

export default Home;