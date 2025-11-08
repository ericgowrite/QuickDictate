
import { GoogleGenAI } from "@google/genai";

export async function categorizeNote(text: string, userCategories: string[]): Promise<string> {
    if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable not set");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const categoriesString = userCategories.map(c => `"${c}"`).join(', ');

    const prompt = `Please categorize the following note into ONE of these categories: ${categoriesString}, or "General Note" if none apply. Respond with ONLY the category name and nothing else.
    
    Note: "${text}"
    
    Category:`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        const category = response.text.trim();
        const validCategories = [...userCategories, "General Note"];
        // Return a default category if the model's response is not one of the expected ones.
        if (validCategories.includes(category)) {
            return category;
        }
        return "General Note";
    } catch (error) {
        console.error("Error categorizing note:", error);
        return "General Note"; // Fallback category
    }
}
