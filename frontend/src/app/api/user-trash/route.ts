import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/firebase/firebaseAdminConfig";




export async function GET(request: NextRequest) {
    console.log('hello');
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
        return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    const userTrashRef = adminDb.collection("users").doc(userId).collection("trash");

    const snapshot = await userTrashRef.get();
    const trashDocs = snapshot.docs.map((doc) => doc.data());
    console.log(trashDocs);

    return NextResponse.json(trashDocs);

}