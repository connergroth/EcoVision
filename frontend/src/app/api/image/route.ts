import { NextRequest, NextResponse } from "next/server";
import { bucket } from "@/firebase/firebaseAdminConfig";
import base64 from "base64-js";

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

        if (!base64Image) {
            return NextResponse.json({ error: 'No image data provided' }, { status: 400 });
        }

        // Validate image size (example: 5MB limit)
        const sizeInBytes = Buffer.from(base64Image, 'base64').length;
        if (sizeInBytes > 5 * 1024 * 1024) {
            return NextResponse.json({ error: 'Image size exceeds 5MB limit' }, { status: 400 });
        }

        // Validate image type
        const validMimeTypes = ['data:image/jpeg', 'data:image/png', 'data:image/gif'];
        const isValidType = validMimeTypes.some(type => base64Image.startsWith(type));
        if (!isValidType) {
            return NextResponse.json({ error: 'Invalid image type. Supported types: JPEG, PNG, GIF' }, { status: 400 });
        }

        // Remove the data URL prefix if present
        const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');

        // Validate base64 string
        try {
            base64.toByteArray(base64Data);
        } catch (e) {
            return NextResponse.json({ error: 'Invalid base64 encoding' }, { status: 400 });
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