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
