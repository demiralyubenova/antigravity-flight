import { removeBackground as imglyRemoveBackground } from '@imgly/background-removal';

export const removeBackground = async (file: File, type: 'CLOTHING' | 'PERSON' = 'CLOTHING'): Promise<string> => {
    try {
        console.log('Removing background using browser-based AI...');

        // Run background removal entirely in the browser (no server needed)
        const blob = await imglyRemoveBackground(file, {
            publicPath: `${window.location.origin}/`,
            device: 'gpu',
            model: 'small', // 'small' is faster, 'medium' is more accurate
            output: {
                format: 'image/png',
                quality: 0.9,
            },
        });

        // Convert blob to base64 data URL
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error("Background removal failed", error);
        throw error;
    }
};
