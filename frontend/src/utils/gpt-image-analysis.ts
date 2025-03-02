import OpenAI from "openai";

const deepseekKey = process.env.DEEPSEEK_API_KEY;

const openai = new OpenAI({
    apiKey: deepseekKey,
    baseURL: 'https://api.deepseek.com',
});

export interface TrashData {
    item: string;
    bin: string;
    confidence: number;
    material: string;
    success: boolean;
}

export const analyzeTrash = async (trashData: TrashData) => {
    const response = await openai.chat.completions.create({
        model: "deepseek-chat",
        messages:
            [
                {
                    role: "system",
                    content: `You are a helpful assistant that analyzes trash data and provides helpful information about the trash and how to recycle it. Also, provide further ways to make a positive impact on the environment.`
                },
                {
                    role: "user",
                    content: `Context:
                    - Item: ${trashData.item}
                    - Bin: ${trashData.bin}
                    - Confidence: ${trashData.confidence}
                    - Material: ${trashData.material}

                    Please provide a helpful response based on the trash data. Do not make the response too long. 
                    Keep it only a few sentences, and don't use any markdown formatting.
                `
                }
            ],
    });

    return response.choices[0].message.content;
};