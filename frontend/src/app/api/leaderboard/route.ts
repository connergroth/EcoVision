import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/firebase/firebaseAdminConfig";

export async function GET(request: NextRequest) {

    const userRef = adminDb.collection("users").orderBy("trashCaptures", "desc").limit(10);
    const snapshot = await userRef.get();
    const userDocs = snapshot.docs.map((doc) => doc.data());

    return NextResponse.json(userDocs);
}