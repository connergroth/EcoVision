"use client";
import SignIn from "../components/SignIn";
import { useAuth } from "../hooks/AuthHook";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import LoadingPage from "../components/LoadingPage";
export default function Auth() {
    const router = useRouter();
    const { user, loading } = useAuth();

    useEffect(() => {
        if (!loading && user) {
            router.push("/");
        }
    }, [user, loading, router]);

    if(loading) {
        return (
            <LoadingPage />
        );
    }

    return (
        <div>
            <SignIn />
        </div>
    );
}