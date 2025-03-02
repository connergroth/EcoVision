import { NextRequest, NextResponse } from "next/server";
import { bucket } from "@/firebase/firebaseAdminConfig";
import base64 from "base64-js";
import { adminDb } from "@/firebase/firebaseAdminConfig";


export async function GET(request: NextRequest) {
    const imageUrl = request.nextUrl.searchParams.get("imageUrl");
    console.log(imageUrl)
    if (!imageUrl) {
        return NextResponse.json({ error: "Image URL is required" }, { status: 400 });
    }

    try {
        const imageRef = bucket.file(imageUrl);
        const [exists] = await imageRef.exists();

        if (!exists) {
            return NextResponse.json({ error: "Image not found" }, { status: 404 });
        }

        const [signedUrl] = await imageRef.getSignedUrl({
            action: "read",
            expires: Date.now() + 24 * 60 * 60 * 1000, // 24 hours from now
        });

        return NextResponse.json({ signedUrl }, { status: 200 });
    } catch (error) {
        console.error('Error generating signed URL:', error);
        return NextResponse.json({ error: "Failed to generate signed URL" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const data = await request.json();
        const base64Image = data.imageData;
        const { item, category, insight, bin, userId } = data;


        if (!base64Image) {
            return NextResponse.json({ error: 'No image data provided' }, { status: 400 });
        }

        // Validate image size (example: 5MB limit)
        const sizeInBytes = Buffer.from(base64Image, 'base64').length;
        if (sizeInBytes > 5 * 1024 * 1024) {
            return NextResponse.json({ error: 'Image size exceeds 5MB limit' }, { status: 400 });
        }

        // Validate image type and format
        if (!base64Image.includes('base64,')) {
            return NextResponse.json({ error: 'Invalid image format. Must be a base64 data URL' }, { status: 400 });
        }

        // Remove the data URL prefix if present
        const base64Data = base64Image.split('base64,')[1];

        // Validate base64 string
        try {
            if (!base64Data || base64Data.trim() === '') {
                return NextResponse.json({ error: 'Empty base64 data' }, { status: 400 });
            }
            base64.toByteArray(base64Data);
        } catch (e) {
            console.error('Base64 validation error:', e);
            return NextResponse.json({
                error: 'Invalid base64 encoding. Please ensure the image is properly encoded',
                details: e instanceof Error ? e.message : 'Unknown error'
            }, { status: 400 });
        }

        // Convert base64 to buffer
        const imageBuffer = Buffer.from(base64Data, 'base64');

        // Generate a unique filename with UUID or similar
        const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpeg`;

        // Upload to Firebase Storage
        const file = bucket.file(filename);
        await file.save(imageBuffer, {
            metadata: {
                contentType: 'image/jpeg',
                cacheControl: 'public, max-age=31536000' // Optional: Add caching headers
            }
        });

        const imageUrl = `https://storage.googleapis.com/trash-app-images/${filename}`;


        const trashData = {
            item: item,
            category: category,
            insight: insight,
            bin: bin,
            imageUrl: imageUrl,
            createdAt: new Date()
        }

        // Create a new document in the "trash" subcollection under the user's document
        const userTrashRef = adminDb
            .collection("users")
            .doc(userId)
            .collection("trash")
            .doc(); // This will auto-generate a new document ID

        await userTrashRef.set(trashData);

        return NextResponse.json({
            success: true,
            filename: filename
        });

    } catch (error) {
        console.error('Error processing image:', error);
        // More specific error messages based on error type
        const errorMessage = error instanceof Error ? error.message : 'Failed to process image';
        return NextResponse.json(
            { error: errorMessage },
            { status: 500 }
        );
    }
}