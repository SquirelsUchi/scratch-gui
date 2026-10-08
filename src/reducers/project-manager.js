import JSZip from 'jszip';
import apiClient, { isDev, STUDENT_HEADERS } from '../lib/api-client.js';
import { getFileExtension } from '../shared/utils/file-extension/fileExtension.js';
import { checkIsLibraryAsset } from '../shared/utils/check-is-library-asset/checkIsLibraryAsset.js';
import { debounceFetch } from '../shared/utils/debounce/debounceFetch.js';

const UPDATE_PROJECT_MANAGER_STATE = 'scratch-gui/project-manager/UPDATE_PROJECT_MANAGER_STATE';
const SAVE_PROJECT = 'scratch-gui/project-manager/SAVE_PROJECT';
const SWITCH_SAVE_SPINNER = 'scratch-gui/project-manager/SWITCH_SAVE_SPINNER';
const SWITCH_COPY_SPINNER = 'scratch-gui/project-manager/SWITCH_COPY_SPINNER';

const minimalRequiredTimeForSpinner = 1_000;
const assetsPacketSize = 20;

const MIME_TYPES = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  mp3: 'audio/mpeg',
  wav: 'audio/wav'
};

const initialState = {
  currentProjectUuid: null,
  projectName: 'Проект Scratch',
  isSandbox: true,
  isEditable: false,
  isCopied: false,
  isSaveSpinnerRequired: false,
  isCopySpinnerRequired: false,
  wasmResvgPackage: null
};

const reducer = function (state, action) {
  if (typeof state === 'undefined') state = initialState;

  switch (action.type) {
    case UPDATE_PROJECT_MANAGER_STATE:
      return Object.assign({}, state, action.state);
    case SWITCH_SAVE_SPINNER:
      return Object.assign({}, state, action.state);
    case SWITCH_COPY_SPINNER:
      return Object.assign({}, state, action.state);
    default:
      return state;
  }
};

const updateProjectManagerState = (state) => ({
  type: UPDATE_PROJECT_MANAGER_STATE,
  state: state
});

const readZipFiles = async (vm) => {
  const projectSb3 = await vm.saveProjectSb3();
  const zip = await JSZip.loadAsync(projectSb3);

  const filePromises = [];
  zip.forEach((relativePath, zipEntry) => {
    filePromises.push(zipEntry.async('blob').then((blob) => ({ name: zipEntry.name, content: blob })));
  });

  return Promise.all(filePromises);
};

const filterAssets = (files) =>
  files.filter((file) => {
    const extension = getFileExtension(file.name);
    return extension !== 'json' && !checkIsLibraryAsset(file.name);
  });

const batchAssets = (assets, size) => {
  const batches = [];
  for (let i = 0; i < assets.length; i += size) {
    batches.push(assets.slice(i, i + size));
  }
  return batches;
};

const uploadAssetPack = async (projectUuid, assetPack, apiClient) => {
  const bodyForGenerateUrls = {
    assets: assetPack.map((asset) => ({
      filename: asset.name,
      mime: MIME_TYPES[getFileExtension(asset.name)],
      size: asset.content.size
    }))
  };

  const { upload } = await apiClient.generateUploadURLs(projectUuid, bodyForGenerateUrls);
  const uploadId = upload?.uuid;
  const generatedUrls = upload?.urls;

  if (!uploadId || !generatedUrls) return;

  const results = await Promise.allSettled(
    Object.keys(generatedUrls).map(async (assetName) => {
      const asset = assetPack.find((a) => a.name === assetName);

      const response = await fetch(generatedUrls[assetName], {
        method: 'PUT',
        headers: {
          'Content-Type': MIME_TYPES[getFileExtension(assetName)],
          ...(isDev ? STUDENT_HEADERS : {})
        },
        body: asset.content
      });

      if (!response.ok) {
        throw new Error(`Upload failed for ${assetName}: ${response.status}`);
      }

      return { filename: assetName, version_id: response.headers.get('x-amz-version-id') };
    })
  );

  results.filter((r) => r.status === 'rejected').forEach((r) => console.warn(r.reason));

  const assets = results.filter((r) => r.status === 'fulfilled').map((r) => r.value);
  if (assets.length === 0) return;

  await apiClient.completeSaveAssets(projectUuid, uploadId, { assets });
};

const saveProjectJson = async (allFiles, projectUuid, apiClient) => {
  const projectJsonFile = allFiles.find((file) => getFileExtension(file.name) === 'json');
  const projectJson = JSON.parse(await projectJsonFile.content.text());

  await apiClient.saveProjectJSON(projectUuid, projectJson);
};

const withMinSpinnerTime = (dispatch, task, minimalRequiredTime) => {
  const startTime = performance.now();
  dispatch({ type: SWITCH_SAVE_SPINNER, state: { isSaveSpinnerRequired: true } });

  return task.finally(() => {
    const passedTime = performance.now() - startTime;
    const delay = Math.max(0, minimalRequiredTime - passedTime);
    setTimeout(() => {
      dispatch({ type: SWITCH_SAVE_SPINNER, state: { isSaveSpinnerRequired: false } });
    }, delay);
  });
};

const saveProject = (vm, projectUuid) => async (dispatch, getState) => {
  const task = (async () => {
    const allFiles = await readZipFiles(vm);
    const assets = filterAssets(allFiles);
    const batches = batchAssets(assets, assetsPacketSize);

    for (const assetPack of batches) {
      await uploadAssetPack(projectUuid, assetPack, apiClient);
    }

    await saveProjectJson(allFiles, projectUuid, apiClient);
  })();

  return withMinSpinnerTime(dispatch, task, minimalRequiredTimeForSpinner).catch((error) => {
    console.warn(error);
  });
};

const copyProject = (templateUuid) => {
  return async (dispatch, getState) => {
    try {
      dispatch({
        type: SWITCH_COPY_SPINNER,
        state: { isCopySpinnerRequired: true }
      });

      const [response] = await Promise.all([
        apiClient.copyProject(templateUuid),
        // Минимальное время лоадера, для уменьшения нагрузки на бэккенд
        new Promise((resolve) => {
          setTimeout(resolve, minimalRequiredTimeForSpinner);
        })
      ]);

      dispatch({
        type: SWITCH_COPY_SPINNER,
        state: { isCopySpinnerRequired: false }
      });

      location = `${location.origin}/code-cat-studio/project/${response.uuid}`;
    } catch (error) {
      console.warn(error);
      dispatch({
        type: SWITCH_COPY_SPINNER,
        state: { isCopySpinnerRequired: false }
      });
    }
  };
};

const renameProject = (projectUUID, newProjectName, isValid) => async (dispatch, getState) => {
  const trimmed = newProjectName.trim();
  const state = getState();
  const currentName = state.scratchGui.projectManager.projectName;

  dispatch({
    type: UPDATE_PROJECT_MANAGER_STATE,
    state: { projectName: newProjectName }
  });

  if (!isValid || currentName === trimmed) return;

  debouncedPatch(projectUUID, { name: trimmed });
};

const debouncedPatch = debounceFetch(async (projectUUID, patchObject, signal) => {
  try {
    await apiClient.patchProject(projectUUID, patchObject, signal);
  } catch (e) {
    console.warn(e);
  }
});

export {
  reducer as default,
  initialState as projectManagerInitialState,
  updateProjectManagerState,
  saveProject,
  copyProject,
  renameProject
};
