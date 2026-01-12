import { GoogleGenAI } from "@google/genai";

export const enhanceDescription = async (itemName: string, currentDescription: string): Promise<string> => {
  try {
    // Initialize AI with API key directly from process.env.API_KEY inside the function
    // to prevent crashes if the environment isn't fully ready at module load time.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
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