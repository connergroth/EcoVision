import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { db } from "@/firebase/firebaseConfig";
import { collection, doc, getDoc, updateDoc } from "firebase/firestore";



export default async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
        return NextResponse.json({ error: "Username is required" }, { status: 400 });
    }

    const userDocRef = doc(collection(db, "users"), userId);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
        return NextResponse.json({ error: "No user data!" }, { status: 404 });
    }

    const userData = userDoc.data();

    const userTrashData = userData.trashData;

    return NextResponse.json({ userTrashData }, { status: 200 });

}

export async function POST(request: NextRequest) {
    const { userId, trashData } = await request.json();

    const userDocRef = doc(collection(db, "users"), userId);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
        return NextResponse.json({ error: "No user data!" }, { status: 404 });
    }

    try {
        const userData = userDoc.data();
        const existingTrashData = userData.trashData || [];

        await updateDoc(userDocRef, {
            trashData: [...existingTrashData, trashData]
        });

        return NextResponse.json({ message: "Trash data added successfully" }, { status: 200 });
    } catch (error) {
        console.error("Error adding trash data:", error);
        return NextResponse.json({ error: "Failed to add trash data" }, { status: 500 });
    }
}