import JSZip from 'jszip';

const MAX_SINGLE_FILE_SIZE = 2 * 1024 * 1024;

export const isSingleFileSizeValid = (fileSize) => fileSize <= MAX_SINGLE_FILE_SIZE;

export const validateFileSizeLimit = (target, onLimitExceeded) => {
  const uploadedFiles = Array.from(target.files || []);

  const validFiles = uploadedFiles.filter((file) => isSingleFileSizeValid(file.size));
  const hasOverweightFile = uploadedFiles.length !== validFiles.length;

  if (hasOverweightFile && typeof onLimitExceeded === 'function') {
    onLimitExceeded();
  }

  if (validFiles.length === 0) {
    target.value = null;
    return [];
  }

  const dataTransfer = new DataTransfer();
  validFiles.forEach((file) => dataTransfer.items.add(file));
  target.files = dataTransfer.files;

  return validFiles;
};

export const validateZipFilesSizes = async (fileData) => {
  try {
    if (!fileData) return false;

    const zipFile = await JSZip.loadAsync(fileData);

    if (!zipFile || !zipFile.files) return false;

    const fileEntries = Object.keys(zipFile.files).filter((fileName) => !fileName.endsWith('.json'));

    for (const fileName of fileEntries) {
      const file = zipFile.files[fileName];
      if (file.dir) continue;
      const arrayBuffer = await file.async('arraybuffer');
      let finalBytesLength = arrayBuffer.byteLength;

      const isValid = isSingleFileSizeValid(finalBytesLength);
      if (!isValid) {
        return false;
      }
    }
    return true;
  } catch (e) {
    console.warn(e);
  }
};
