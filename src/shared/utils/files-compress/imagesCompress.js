import { fileTypeFromBuffer } from 'file-type';

export const compressImage = async (file) => {
  const fileExtension = file.name.split('.').pop().toLowerCase();

  const originalBuffer = await new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsArrayBuffer(file);
  });

  const { ext, mime } = await fileTypeFromBuffer(originalBuffer);

  if (ext === 'gif') return file;

  const compressedBuffer = await compressBrowserImage(originalBuffer, fileExtension, mime);

  return new File([compressedBuffer], `image.${ext}`, { type: mime });
};

const compressBrowserImage = async (arrayBuffer, fileType, mimeType) => {
  const headerBytes = new Uint8Array(arrayBuffer.slice(0, 3));
  const isRealGif = headerBytes[0] === 71 && headerBytes[1] === 73 && headerBytes[2] === 70;
  if (fileType === 'gif' || isRealGif) {
    return arrayBuffer;
  }

  return new Promise((resolve) => {
    const blob = new Blob([arrayBuffer], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);

      let width = img.width;
      let height = img.height;
      const MAX_SIZE = 1920;

      if (width > MAX_SIZE || height > MAX_SIZE) {
        if (width > height) {
          height = Math.round((height * MAX_SIZE) / width);
          width = MAX_SIZE;
        } else {
          width = Math.round((width * MAX_SIZE) / height);
          height = MAX_SIZE;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d', {
        willReadFrequently: true,
        colorSpace: 'srgb'
      });

      ctx.drawImage(img, 0, 0, width, height);

      const quality = ['image/jpeg', 'image/jpg'].includes(mimeType) ? 0.75 : 1;

      canvas.toBlob(
        (resultBlob) => {
          resultBlob.arrayBuffer().then(resolve);
        },
        mimeType,
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(arrayBuffer);
    };

    img.src = url;
  });
};
