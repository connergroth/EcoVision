import { NextRequest, NextResponse } from "next/server";
import { classifyImage } from "@/utils/gpt-image-classifier";
import { bucket } from "@/firebase/firebaseAdminConfig";
import { base64 } from "base64-js";

export async function POST(request: NextRequest) {
    const { image } = await request.json();

    const response = await classifyImage(image);

    const parsedResponse = JSON.parse(response);


    return NextResponse.json(parsedResponse);
}