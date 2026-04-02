import { removeBackground as imglyRemoveBackground } from '@imgly/background-removal';

export const removeBackground = async (file: File, type: 'CLOTHING' | 'PERSON' = 'CLOTHING'): Promise<string> => {
    try {
        console.log("Processing background removal in the browser...");

        // Ensure file is safely standardized before passing to imgly (Fixes AVIF issues)
        const safeBlob = await new Promise<Blob>((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                if (!ctx) return resolve(file);
                ctx.drawImage(img, 0, 0);
                canvas.toBlob((blob) => {
                    resolve(blob || file);
                }, 'image/jpeg', 0.95);
            };
            img.onerror = () => resolve(file); // if unreadable, pass original and hope for best
            img.src = URL.createObjectURL(file);
        });
        
        // Use imgly to remove background locally in the browser
        const imageBlob = await imglyRemoveBackground(safeBlob as any);
        
        // Convert the returned Blob into a base64 data URL
        const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(imageBlob);
        });

        return base64;
    } catch (error) {
        console.error("Background removal failed", error);
        throw error;
    }
};
