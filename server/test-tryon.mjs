import fetch from 'node-fetch';

async function test() {
  const url = 'https://jhtmeoyvdwnaadtbcczr.supabase.co/functions/v1/outfit-tryon';
  const myKey = 'sb_publishable_rO-X6GG3TEGyPNp6GAEAGw_ruhcPbnu';
  
  const payload = {
    personImageUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRg...',
    clothingItems: [
      { name: 'shirt', category: 'tops', image_url: 'https://example.com/image.jpg' }
    ]
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${myKey}`,
      'Apikey': myKey
    },
    body: JSON.stringify(payload)
  });

  const text = await response.text();
  console.log('Status:', response.status);
  console.log('Body:', text);
}
test();
