
import { GoogleGenAI } from "@google/genai";

// Initialize AI with API key directly from process.env.API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const enhanceDescription = async (itemName: string, currentDescription: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Transforme o nome do prato "${itemName}" e a descrição básica "${currentDescription}" em uma descrição gourmet elegante e apetitosa para um restaurante de alto padrão chamado Sertão Gourmet. Mantenha o tom sofisticado e destaque os ingredientes nordestinos. Responda apenas com a nova descrição.`,
    });

    // Access .text property directly as per guidelines
    return response.text?.trim() || currentDescription;
  } catch (error) {
    console.error("Error enhancing description:", error);
    return currentDescription;
  }
};
