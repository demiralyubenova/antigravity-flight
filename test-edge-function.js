const supabaseUrl = "https://jhtmeoyvdwnaadtbcczr.supabase.co";
const anonKey = "sb_publishable_rO-X6GG3TEGyPNp6GAEAGw_ruhcPbnu";

// create a dummy 1x1 image base64
const dummyImageBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

async function testEdgeFunction() {
    console.log("Calling edge function...");
    const response = await fetch(`${supabaseUrl}/functions/v1/outfit-tryon`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${anonKey}`
        },
        body: JSON.stringify({
            personImageUrl: dummyImageBase64,
            clothingItems: [
                {
                    name: "Shirt",
                    category: "Tops",
                    image_url: dummyImageBase64
                },
                {
                    name: "Pants",
                    category: "Bottoms",
                    image_url: dummyImageBase64
                }
            ]
        })
    });
    
    const text = await response.text();
    console.log("Status:", response.status);
    console.log("Response:", text);
}
testEdgeFunction();
