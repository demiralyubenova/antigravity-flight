const GEMINI_API_KEY = "AIzaSyCEZg-KDQD2WpBaZ1CgygovRGT7GeRoLcE";

const dummyImageBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

async function testGenerate() {
    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${GEMINI_API_KEY}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [
                            {
                                inline_data: { mimeType: 'image/png', data: dummyImageBase64 }
                            },
                            {
                                text: "A photo of a person wearing this exact clothing."
                            }
                        ]
                    }
                ],
                safetySettings: [
                    { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" }
                ],
                generationConfig: {
                    responseModalities: ["IMAGE"]
                }
            })
        }
    );

    const data = await response.json();
    console.log("Status:", response.status);
    console.log(JSON.stringify(data, null, 2));
}

testGenerate();
