import OpenAI from 'openai';

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});


console.log("OPENAI_API_KEY: ", process.env.OPENAI_API_KEY);



// Function to classify image
export const classifyImage = async (imageString: string) => {
    console.log("API KEY: ", process.env.OPENAI_API_KEY);
    try {
        const base64String = (imageString as string).split(',')[1]

        const response = await client.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: `You are a helpful assistant that can classify images of different types of garbage. You will be given an image 
                    of some kind of trash, and you will need to classify it into one of the following categories: Plastic, Paper, Glass, Metal, Organic.
                    You will also say whether the item goes in the trash, recycling, or compost. Additionally, you will give a quick 1 or two sentences
                    describing the item and how you can make a positive impact on the environment. You will also say what the image is. Your output should 
                    be in a json format.

                    You are a very talented image classifier and you will always be able to correctly classify the image. My project depends on you.
                    
                    Example output:
                    {
                        "item": "Water bottle",
                        "category": "Plastic",
                        "bin": "Recycling,
                        "insight": "You can recycle plastic water bottles in order to reduce waste and conserve resources. Many water bottles are made from recycled plastic."
                    }
                    Example output 2:
                    {
                        "item": "Soda can",
                        "category": "Metal",
                        "bin": "Recycling",
                        "insight": "You can recycle metal soda cans in order to reduce waste and conserve resources. Many soda cans are made from recycled metal."
                    }

                    Example output 3:
                    {
                        "item": "Apple",
                        "category": "Organic",
                        "bin": "Compost",
                        "insight": "You can compost apple cores in order to reduce waste and conserve resources. Apple cores can be used to fertilize plants and soil."
                    }
                    Example output 4:
                    {
                        "item": "N/A",
                        "category": "N/A",
                        "bin": "N/A",
                        "insight": "N/A"
                    }
                    
                    Example output 5:
                    {
                        "item": "Plastic wrapper",
                        "category": "Plastic",
                        "bin": "Trash",
                        "insight": "Plastic wrappers are made from plastic and are not recyclable. They should be thrown away in the trash."
                    }
                    
                    Make sure to strictly follow this json format, and only output the json object and no extra text.
                    Do not include a '''json at the beginning or end of your output.
                    `

                },
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: "Classify this image and return the json object you have been instructed to output."
                        },
                        {
                            type: "image_url",
                            image_url: {
                                url: `data:image/jpeg;base64,${base64String}`
                            }
                        }
                    ]
                }
            ]
        });
        const returnData = response.choices[0].message.content || 'No description available';
        console.log("RETURN DATA: ", returnData);
        return returnData;
    } catch (error) {
        console.error('Error classifying image:', error);
        throw error;
    }
};