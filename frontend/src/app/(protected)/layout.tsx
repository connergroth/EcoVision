"use client"
import NavBar from "../components/NavBar";
import { useAuth } from "../hooks/AuthHook";
import {useEffect} from "react";
import { useRouter } from "next/navigation";
import LoadingPage from "../components/LoadingPage";



export default function Layout({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const router = useRouter();
    useEffect(() => {
        if(!loading && !user) {
            router.push("/auth");
        }
    }, [user, loading, router]);

    if(loading || !user) {
        return <LoadingPage />;
    }

    return (
        <div>
            <NavBar />
            <main>
                {children}
            </main>
        </div>
    );
}