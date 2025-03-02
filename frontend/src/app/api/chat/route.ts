import { NextRequest } from "next/server";
import { analyzeTrash } from "@/utils/gpt-image-analysis";
import { NextResponse } from "next/server";

export const POST = async (req: NextRequest) => {
    const { data } = await req.json();

    const response = await analyzeTrash(data);
    return NextResponse.json({ response });
};
