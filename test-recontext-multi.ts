import fs from "fs";

let GEMINI_API_KEY = "AIzaSyCEZg-KDQD2WpBaZ1CgygovRGT7GeRoLcE";
try {
    const envFile = fs.readFileSync(".env.local", "utf8");
    const match = envFile.match(/GOOGLE_GEMINI_API_KEY=(.*)/);
    if (match) GEMINI_API_KEY = match[1].replace(/["']/g, '');
} catch(e){}

// create a dummy 1x1 image base64
const dummyImageBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

async function testRecontext() {
    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/imagen-product-recontext-preview-06-30:recontextImage?key=${GEMINI_API_KEY}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                source: {
                    personImage: {
                        bytesBase64Encoded: dummyImageBase64
                    },
                    productImages: [
                        { productImage: { bytesBase64Encoded: dummyImageBase64 } },
                        { productImage: { bytesBase64Encoded: dummyImageBase64 } }
                    ]
                },
                config: {
                    numberOfImages: 1,
                    personGeneration: "ALLOW_ADULT"
                }
            })
        }
    );

    const text = await response.text();
    console.log("Status:", response.status);
    console.log("Response:", text.substring(0, 500));
}
testRecontext();
