const OPEN_MODAL = 'scratch-gui/modals/OPEN_MODAL';
const CLOSE_MODAL = 'scratch-gui/modals/CLOSE_MODAL';

const MODAL_BACKDROP_LIBRARY = 'backdropLibrary';
const MODAL_COSTUME_LIBRARY = 'costumeLibrary';
const MODAL_EXTENSION_LIBRARY = 'extensionLibrary';
const MODAL_LOADING_PROJECT = 'loadingProject';
const MODAL_TELEMETRY = 'telemetryModal';
const MODAL_SOUND_LIBRARY = 'soundLibrary';
const MODAL_SPRITE_LIBRARY = 'spriteLibrary';
const MODAL_SOUND_RECORDER = 'soundRecorder';
const MODAL_CONNECTION = 'connectionModal';
const MODAL_ASSETS_LIMIT = 'assetsLimitModal';
const MODAL_FILE_EXCIDE_SIZE = 'fileExcideSizeModal';
const MODAL_CORRUPT_FILE = 'corruptFileModal';
const MODAL_COPY_PROJECT_ERROR = 'copyProjectError';

const initialState = {
  [MODAL_BACKDROP_LIBRARY]: false,
  [MODAL_COSTUME_LIBRARY]: false,
  [MODAL_EXTENSION_LIBRARY]: false,
  [MODAL_LOADING_PROJECT]: false,
  [MODAL_TELEMETRY]: false,
  [MODAL_SOUND_LIBRARY]: false,
  [MODAL_SPRITE_LIBRARY]: false,
  [MODAL_SOUND_RECORDER]: false,
  [MODAL_CONNECTION]: false,
  [MODAL_ASSETS_LIMIT]: false,
  [MODAL_FILE_EXCIDE_SIZE]: false,
  [MODAL_CORRUPT_FILE]: false,
  [MODAL_COPY_PROJECT_ERROR]: false,
  [MODAL_FILE_EXCIDE_SIZE]: false
};

const reducer = function (state, action) {
  if (typeof state === 'undefined') state = initialState;
  switch (action.type) {
    case OPEN_MODAL:
      return Object.assign({}, state, {
        [action.modal]: true
      });
    case CLOSE_MODAL:
      return Object.assign({}, state, {
        [action.modal]: false
      });
    default:
      return state;
  }
};
const openModal = function (modal) {
  return {
    type: OPEN_MODAL,
    modal: modal
  };
};
const closeModal = function (modal) {
  return {
    type: CLOSE_MODAL,
    modal: modal
  };
};
const openCopyProjectErrorModal = function () {
  return openModal(MODAL_COPY_PROJECT_ERROR);
};
const openBackdropLibrary = function () {
  return openModal(MODAL_BACKDROP_LIBRARY);
};
const openCostumeLibrary = function () {
  return openModal(MODAL_COSTUME_LIBRARY);
};
const openExtensionLibrary = function () {
  return openModal(MODAL_EXTENSION_LIBRARY);
};
const openLoadingProject = function () {
  return openModal(MODAL_LOADING_PROJECT);
};
const openTelemetryModal = function () {
  return openModal(MODAL_TELEMETRY);
};
const openSoundLibrary = function () {
  return openModal(MODAL_SOUND_LIBRARY);
};
const openSpriteLibrary = function () {
  return openModal(MODAL_SPRITE_LIBRARY);
};
const openSoundRecorder = function () {
  return openModal(MODAL_SOUND_RECORDER);
};
const openConnectionModal = function () {
  return openModal(MODAL_CONNECTION);
};
const openAssetsLimitModal = function () {
  return openModal(MODAL_ASSETS_LIMIT);
};
const openFileExcideModal = function () {
  return openModal(MODAL_FILE_EXCIDE_SIZE);
};
const openCorruptFileModal = function () {
  return openModal(MODAL_CORRUPT_FILE);
};
const closeBackdropLibrary = function () {
  return closeModal(MODAL_BACKDROP_LIBRARY);
};
const closeCostumeLibrary = function () {
  return closeModal(MODAL_COSTUME_LIBRARY);
};
const closeExtensionLibrary = function () {
  return closeModal(MODAL_EXTENSION_LIBRARY);
};
const closeLoadingProject = function () {
  return closeModal(MODAL_LOADING_PROJECT);
};
const closeTelemetryModal = function () {
  return closeModal(MODAL_TELEMETRY);
};
const closeSpriteLibrary = function () {
  return closeModal(MODAL_SPRITE_LIBRARY);
};
const closeSoundLibrary = function () {
  return closeModal(MODAL_SOUND_LIBRARY);
};
const closeSoundRecorder = function () {
  return closeModal(MODAL_SOUND_RECORDER);
};
const closeConnectionModal = function () {
  return closeModal(MODAL_CONNECTION);
};
const closeAssetsLimitModal = function () {
  return closeModal(MODAL_ASSETS_LIMIT);
};
const closeFileExcideModal = function () {
  return closeModal(MODAL_FILE_EXCIDE_SIZE);
};
const closeCorruptFileModal = function () {
  return closeModal(MODAL_CORRUPT_FILE);
};
const closeCopyProjectErrorModal = function () {
  return closeModal(MODAL_COPY_PROJECT_ERROR);
};
export {
  reducer as default,
  initialState as modalsInitialState,
  openBackdropLibrary,
  openCostumeLibrary,
  openExtensionLibrary,
  openLoadingProject,
  openSoundLibrary,
  openSpriteLibrary,
  openSoundRecorder,
  openTelemetryModal,
  openConnectionModal,
  openAssetsLimitModal,
  closeBackdropLibrary,
  closeCostumeLibrary,
  closeExtensionLibrary,
  closeLoadingProject,
  closeSpriteLibrary,
  closeSoundLibrary,
  closeSoundRecorder,
  closeTelemetryModal,
  closeConnectionModal,
  closeAssetsLimitModal,
  openFileExcideModal,
  closeFileExcideModal,
  openCorruptFileModal,
  closeCorruptFileModal,
  openCopyProjectErrorModal,
  closeCopyProjectErrorModal
};
