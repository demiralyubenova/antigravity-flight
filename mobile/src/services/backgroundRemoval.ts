/**
 * Background Removal Service for Mobile
 * 
 * Calls the Express server's /api/remove-background endpoint, which uses
 * @imgly/background-removal-node — the same library the web app uses.
 * 
 * This replaces the broken WebView/WASM approach that couldn't run on
 * iOS due to WKWebView WASM memory limitations.
 */

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3011';

/**
 * Remove background from an image by sending it to the backend server.
 * 
 * @param base64DataUrl - The image as a base64 data URL (e.g., "data:image/jpeg;base64,...")
 * @returns The processed image as a base64 data URL with transparent background
 * @throws Error if the server is unreachable or processing fails
 */
export async function removeBackgroundServer(base64DataUrl: string): Promise<string> {
  console.log('Sending image to server for background removal...');
  
  const response = await fetch(`${API_URL}/api/remove-background`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ imageUrl: base64DataUrl }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Server error' }));
    throw new Error(errorData.error || `Server returned ${response.status}`);
  }

  const data = await response.json();

  if (!data.result) {
    throw new Error('No result returned from background removal service');
  }

  console.log('Background removal successful');
  return data.result;
}
