import { fileTypeFromBuffer } from 'file-type';
import { GifReader } from 'omggif';

const DECODABLE_IMAGE_MIMES = new Set(['image/png', 'image/jpeg', 'image/gif']);

const isDecodableGif = (bytes) => {
  try {
    const reader = new GifReader(bytes);
    if (reader.numFrames() < 1) {
      return false;
    }
    const frameInfo = reader.frameInfo(0);
    const pixels = new Uint8Array(reader.width * reader.height * 4);
    reader.decodeAndBlitFrameRGBA(0, pixels);
    return Boolean(frameInfo);
  } catch {
    return false;
  }
};

const isDecodableBitmap = async (bytes, mime) => {
  if (typeof createImageBitmap !== 'function' || typeof Blob === 'undefined') {
    return true;
  }
  let bitmap;
  try {
    const blob = new Blob([bytes], { type: mime });
    bitmap = await createImageBitmap(blob);
    return bitmap.width > 0 && bitmap.height > 0;
  } catch {
    return false;
  } finally {
    if (bitmap && typeof bitmap.close === 'function') {
      bitmap.close();
    }
  }
};

const isDecodableContent = async (bytes, mime) => {
  if (!DECODABLE_IMAGE_MIMES.has(mime)) {
    return true;
  }
  if (mime === 'image/gif') {
    return isDecodableGif(bytes);
  }
  return isDecodableBitmap(bytes, mime);
};

const EXTENSION_TO_DETECTED_MIME = {
  '.png': ['image/png'],
  '.jpg': ['image/jpeg'],
  '.jpeg': ['image/jpeg'],
  '.gif': ['image/gif'],
  '.mp3': ['audio/mpeg'],
  '.wav': ['audio/wav']
};

const buildAllowedMimeSet = (accept) => {
  const allowed = new Set();
  accept.forEach((ext) => {
    const normalized = ext.toLowerCase();
    const mimes = EXTENSION_TO_DETECTED_MIME[normalized];
    if (mimes) {
      mimes.forEach((mime) => allowed.add(mime));
    }
  });
  return allowed;
};

const readFileAsArrayBuffer = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });

const isFileContentValid = async (file, accept) => {
  const allowedMimes = buildAllowedMimeSet(accept);

  let buffer;
  try {
    buffer = await readFileAsArrayBuffer(file);
  } catch {
    return false;
  }

  const bytes = new Uint8Array(buffer);

  if (bytes.length === 0) {
    return false;
  }

  let detected;
  try {
    detected = await fileTypeFromBuffer(bytes);
  } catch {
    return false;
  }

  if (!detected || !detected.mime) {
    return false;
  }

  if (!allowedMimes.has(detected.mime)) {
    return false;
  }

  return isDecodableContent(bytes, detected.mime);
};

export const validateFileContent = async (target, accept, onInvalidFile) => {
  const uploadedFiles = Array.from(target.files || []);

  if (uploadedFiles.length === 0) {
    return [];
  }

  const validationResults = await Promise.all(uploadedFiles.map((file) => isFileContentValid(file, accept)));

  const validFiles = uploadedFiles.filter((_file, index) => validationResults[index]);
  const hasInvalidFile = uploadedFiles.length !== validFiles.length;

  if (hasInvalidFile && typeof onInvalidFile === 'function') {
    onInvalidFile();
  }

  if (validFiles.length === 0) {
    target.value = null;
    return [];
  }

  if (typeof DataTransfer !== 'undefined' && target instanceof HTMLInputElement) {
    const dataTransfer = new DataTransfer();
    validFiles.forEach((file) => dataTransfer.items.add(file));
    target.files = dataTransfer.files;
  } else {
    target.files = validFiles;
  }

  return validFiles;
};
