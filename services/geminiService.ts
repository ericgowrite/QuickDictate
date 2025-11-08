/**
 * @file This service is responsible for all interactions with the Google Gemini API.
 */
import { GoogleGenAI } from "@google/genai";

/**
 * Sends transcribed text to the Gemini API to determine its category.
 * It constructs a prompt with the user's text and a list of possible categories.
 * If the API call fails or returns an invalid category, it defaults to "Notes".
 *
 * @param {string} text The transcribed text of the note to be categorized.
 * @param {string[]} userCategories The list of categories the user has configured.
 * @returns {Promise<string>} A promise that resolves to the determined category name.
 */
export async function categorizeNote(text: string, userCategories: string[]): Promise<string> {
    if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable not set");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const categoriesString = userCategories.map(c => `"${c}"`).join(', ');

    const prompt = `Please categorize the following note into ONE of these categories: ${categoriesString}. If none of the other categories are a good fit, categorize it as "Notes". Respond with ONLY the category name and nothing else.
    
    Note: "${text}"
    
    Category:`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        const category = response.text.trim();
        // Return a default category if the model's response is not one of the expected ones.
        if (userCategories.includes(category)) {
            return category;
        }
        return "Notes";
    } catch (error) {
        console.error("Error categorizing note:", error);
        return "Notes"; // Fallback category
    }
}