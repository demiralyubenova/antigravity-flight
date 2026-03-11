const SUPABASE_URL = "https://jhtmeoyvdwnaadtbcczr.supabase.co/functions/v1";
const anonKey = "sb_publishable_rO-X6GG3TEGyPNp6GAEAGw_ruhcPbnu";

// create a dummy 1x1 image base64
const dummyImageBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

async function testVirtualTryonSingle() {
    console.log("Calling virtual tryon (SINGLE ITEM)...");
    const response = await fetch(`${supabaseUrl}/functions/v1/virtual-tryon`, {
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
                    imageUrl: dummyImageBase64
                }
            ]
        })
    });
    
    const text = await response.text();
    console.log("Status:", response.status);
    console.log("Response:", text);
}

async function testVirtualTryonMulti() {
    console.log("Calling virtual tryon (MULTI ITEM)...");
    const response = await fetch(`${supabaseUrl}/functions/v1/virtual-tryon`, {
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
                    imageUrl: dummyImageBase64
                },
                {
                    name: "Pants",
                    category: "Bottoms",
                    imageUrl: dummyImageBase64
                }
            ]
        })
    });
    
    const text = await response.text();
    console.log("Status:", response.status);
    console.log("Response:", text);
}

async function run() {
    await testVirtualTryonSingle();
    await testVirtualTryonMulti();
}
run();
