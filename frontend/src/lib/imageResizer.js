/**
 * Reads an image file, resizes it using an HTML5 Canvas to target constraints,
 * and returns a compressed base64 data URL.
 * 
 * @param {File} file - The file uploaded by the user
 * @param {number} maxW - The maximum allowed width
 * @param {number} maxH - The maximum allowed height
 * @returns {Promise<string>} Resolves with the base64 data URL
 */
export const resizeImageFile = (file, maxW = 256, maxH = 256) => {
  return new Promise((resolve, reject) => {
    if (!file) {
      resolve('');
      return;
    }
    
    // Check if it's an image
    if (!file.type.startsWith('image/')) {
      reject(new Error('Selected file is not an image.'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Resize logic keeping aspect ratio
        if (width > height) {
          if (width > maxW) {
            height = Math.round((height * maxW) / width);
            width = maxW;
          }
        } else {
          if (height > maxH) {
            width = Math.round((width * maxH) / height);
            height = maxH;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        // Clear and draw image
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Export as compressed jpeg or png
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
        resolve(compressedBase64);
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load image file.'));
      };

      img.src = e.target.result;
    };

    reader.onerror = () => {
      reject(new Error('Failed to read image file.'));
    };

    reader.readAsDataURL(file);
  });
};
