import { GoogleGenAI, SubjectReferenceImage, StyleReferenceImage } from "@google/genai";
import fs from "fs";

let GEMINI_API_KEY = "AIzaSyCEZg-KDQD2WpBaZ1CgygovRGT7GeRoLcE";
try {
    const envFile = fs.readFileSync(".env.local", "utf8");
    const match = envFile.match(/GOOGLE_GEMINI_API_KEY=(.*)/);
    if (match) GEMINI_API_KEY = match[1].replace(/["']/g, '');
} catch(e){}

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
const dummyImageBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

async function testEditImage() {
    try {
        console.log("Calling editImage...");
        const response = await ai.models.editImage({
            model: 'imagen-3.0-generate-001',
            prompt: 'A photorealistic fashion image showing the person wearing exactly these clothing items. Clean neutral background.',
            referenceImages: [
                new SubjectReferenceImage({
                    referenceImage: { bytesBase64Encoded: dummyImageBase64 },
                    referenceId: 1
                }),
                new StyleReferenceImage({
                    referenceImage: { bytesBase64Encoded: dummyImageBase64 },
                    referenceId: 2
                })
            ]
        });

        console.log("Success Edit:", response?.generatedImages?.[0]?.bytesBase64Encoded?.length);
    } catch (error) {
        console.error("Error Edit Image:", error);
    }
}
testEditImage();
