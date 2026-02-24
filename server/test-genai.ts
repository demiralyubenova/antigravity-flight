import { GoogleGenAI } from '@google/genai';

const GEMINI_API_KEY = "AIzaSyCEZg-KDQD2WpBaZ1CgygovRGT7GeRoLcE";
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

const dummyImageBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

async function testEditImage() {
    try {
        const response = await ai.models.editImage({
            model: 'imagen-3.0-generate-001',
            prompt: 'A photo of a person wearing this outfit',
            referenceImages: [
                {
                    referenceType: "SUBJECT",
                    referenceImage: { bytesBase64Encoded: dummyImageBase64 },
                    referenceId: 1
                }
            ]
        });

        console.log("Success Edit:", response?.generatedImages?.[0]?.bytesBase64Encoded?.length);
    } catch (error) {
        console.error("Error Edit Image:", error);
    }
}

testEditImage();
