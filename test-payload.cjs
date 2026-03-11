const fs = require('fs');

async function testLargePayload() {
    const keyMatch = fs.readFileSync(".env", "utf8").match(/VITE_SUPABASE_PUBLISHABLE_KEY="(.*?)"/);
    if (!keyMatch) {
        console.error("No anon key found");
        return;
    }
    const key = keyMatch[1];
    
    console.log("Generating 2MB dummy payload...");
    // A 1 megabyte string representing an image
    const largeDummyImage = "data:image/png;base64," + "A".repeat(1024 * 1024 * 2);
    
    console.log("Sending payload...");
    const req = await fetch("https://jhtmeoyvdwnaadtbcczr.supabase.co/functions/v1/virtual-tryon", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${key}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            personImageUrl: largeDummyImage,
            clothingItems: [{
                imageUrl: largeDummyImage
            }]
        })
    });
    
    console.log("Status:", req.status);
    console.log("Response:", await req.text());
}

testLargePayload();
