import { auth } from "@/firebase/firebaseConfig";
import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";


export const useAuth = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setUser(user);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    return { user, loading };
}