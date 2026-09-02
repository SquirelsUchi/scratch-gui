import { openAssetsLimitModal } from './modals';

const UPDATE_TARGET_LIST = 'scratch-gui/targets/UPDATE_TARGET_LIST';
const HIGHLIGHT_TARGET = 'scratch-gui/targets/HIGHLIGHT_TARGET';

const MAX_FILES_COUNT = 100;
const MAX_PROJECT_SIZE_BYTES = 20 * 1024 * 1024;

const initialState = {
  sprites: {},
  stage: {},
  highlightedTargetId: null,
  highlightedTargetTime: null
};

let stableSpriteIds = new Set();
let stableCostumesCountMap = new Map();
let stableSoundsCountMap = new Map();
let isInitialized = false;

const getAssetId = (asset) => asset.assetId || asset.md5ext || asset.id;

const getAssetSize = (asset) => {
  if (typeof asset.size === 'number') return asset.size;
  if (typeof asset.asset?.size === 'number') return asset.asset.size;
  if (typeof asset.asset?.data?.byteLength === 'number') return asset.asset.data.byteLength;
  if (typeof asset.asset?.data?.length === 'number') return asset.asset.data.length;
  return 0;
};

const getProjectAssetsInfo = (targets) => {
  const uniqueAssets = new Map();

  targets.forEach((target) => {
    target.costumes?.forEach((costume) => {
      const id = getAssetId(costume);
      if (id) {
        uniqueAssets.set(id, getAssetSize(costume));
      }
    });
    target.sounds?.forEach((sound) => {
      const id = getAssetId(sound);
      if (id) {
        uniqueAssets.set(id, getAssetSize(sound));
      }
    });
  });

  let totalSize = 0;
  uniqueAssets.forEach((size) => {
    totalSize += size;
  });

  return {
    uniqueCount: uniqueAssets.size,
    totalSize: totalSize
  };
};

const filterTargetsLimit = (vm, incomingTargets, currentTargetsState) => {
  let isLimitExcide = false;

  const filtered = incomingTargets.map((target) => ({
    ...target,
    costumes: target.costumes ? [...target.costumes] : [],
    sounds: target.sounds ? [...target.sounds] : []
  }));

  const { uniqueCount, totalSize } = getProjectAssetsInfo(filtered);

  if (uniqueCount <= MAX_FILES_COUNT && totalSize <= MAX_PROJECT_SIZE_BYTES) {
    stableSpriteIds = new Set(filtered.filter((t) => !t.isStage).map((t) => t.id));
    stableCostumesCountMap = new Map(filtered.map((t) => [t.id, t.costumes?.length || 0]));
    stableSoundsCountMap = new Map(filtered.map((t) => [t.id, t.sounds?.length || 0]));
    isInitialized = true;
    return { filtered, isLimitExcide };
  }

  if (!isInitialized) {
    stableSpriteIds = new Set(Object.keys(currentTargetsState.sprites || {}));
    const initialCostumes = [];
    const initialSounds = [];

    Object.values(currentTargetsState.sprites || {}).forEach((s) => {
      initialCostumes.push([s.id, s.costumes?.length || 0]);
      initialSounds.push([s.id, s.sounds?.length || 0]);
    });
    if (currentTargetsState.stage?.id) {
      initialCostumes.push([currentTargetsState.stage.id, currentTargetsState.stage.costumes?.length || 0]);
      initialSounds.push([currentTargetsState.stage.id, currentTargetsState.stage.sounds?.length || 0]);
    }
    stableCostumesCountMap = new Map(initialCostumes);
    stableSoundsCountMap = new Map(initialSounds);
    isInitialized = true;
  }

  for (let i = filtered.length - 1; i >= 0; i--) {
    const target = filtered[i];

    if (stableCostumesCountMap.has(target.id)) {
      const stableCostumesCount = stableCostumesCountMap.get(target.id) || 0;
      const stableSoundsCount = stableSoundsCountMap.get(target.id) || 0;

      if (target.sounds && target.sounds.length > stableSoundsCount) {
        const soundIndex = target.sounds.length - 1;
        target.sounds.pop();
        isLimitExcide = true;

        setTimeout(() => {
          if (vm && vm.runtime) {
            const vmTarget = vm.runtime.getTargetById(target.id);
            if (vmTarget && typeof vmTarget.deleteSound === 'function') {
              try {
                vmTarget.deleteSound(soundIndex);
              } catch (e) {
                console.error(e);
              }
            }
          }
        }, 0);
        return { filtered, isLimitExcide };
      }

      if (target.costumes && target.costumes.length > stableCostumesCount) {
        const costumeIndex = target.costumes.length - 1;
        target.costumes.pop();
        isLimitExcide = true;

        setTimeout(() => {
          if (vm && vm.runtime) {
            const vmTarget = vm.runtime.getTargetById(target.id);
            if (vmTarget && typeof vmTarget.deleteCostume === 'function') {
              try {
                vmTarget.deleteCostume(costumeIndex);
              } catch (e) {
                console.error(e);
              }
            }
          }
        }, 0);
        return { filtered, isLimitExcide };
      }
    } else if (!target.isStage) {
      if (target.sounds && target.sounds.length > 0) {
        const soundIndex = target.sounds.length - 1;
        target.sounds.pop();
        isLimitExcide = true;

        setTimeout(() => {
          if (vm && vm.runtime) {
            const vmTarget = vm.runtime.getTargetById(target.id);
            if (vmTarget && typeof vmTarget.deleteSound === 'function') {
              try {
                vmTarget.deleteSound(soundIndex);
              } catch (e) {
                console.error(e);
              }
            }
          }
        }, 0);
        return { filtered, isLimitExcide };
      }

      if (target.costumes && target.costumes.length > 1) {
        const costumeIndex = target.costumes.length - 1;
        target.costumes.pop();
        isLimitExcide = true;

        setTimeout(() => {
          if (vm && vm.runtime) {
            const vmTarget = vm.runtime.getTargetById(target.id);
            if (vmTarget && typeof vmTarget.deleteCostume === 'function') {
              try {
                vmTarget.deleteCostume(costumeIndex);
              } catch (e) {
                console.error(e);
              }
            }
          }
        }, 0);
        return { filtered, isLimitExcide };
      }
      filtered.splice(i, 1);
      isLimitExcide = true;

      setTimeout(() => {
        if (vm && typeof vm.deleteSprite === 'function') {
          try {
            vm.deleteSprite(target.id);
          } catch (e) {
            console.error(e);
          }
        }
      }, 0);
      return { filtered, isLimitExcide };
    }
  }

  return { filtered, isLimitExcide };
};

const reducer = function (state = initialState, action) {
  switch (action.type) {
    case UPDATE_TARGET_LIST:
      return Object.assign({}, state, {
        sprites: action.targets
          .filter((target) => !target.isStage)
          .reduce(
            (targets, target, listId) => Object.assign(targets, { [target.id]: { order: listId, ...target } }),
            {}
          ),
        stage: action.targets.filter((target) => target.isStage)[0] || {},
        editingTarget: action.editingTarget
      });

    case HIGHLIGHT_TARGET:
      return Object.assign({}, state, {
        highlightedTargetId: action.targetId,
        highlightedTargetTime: action.updateTime
      });
    default:
      return state;
  }
};

const updateTargets = function (targetList, editingTarget, vm) {
  return (dispatch, getState) => {
    const currentTargetsState = getState().scratchGui.targets || initialState;
    const { filtered: filteredTargets, isLimitExcide } = filterTargetsLimit(vm, targetList, currentTargetsState);

    dispatch({
      type: UPDATE_TARGET_LIST,
      targets: filteredTargets,
      editingTarget: editingTarget
    });

    if (isLimitExcide) {
      dispatch(openAssetsLimitModal());
    }
  };
};

const highlightTarget = function (targetId) {
  return {
    type: HIGHLIGHT_TARGET,
    targetId: targetId,
    updateTime: Date.now()
  };
};

export { reducer as default, initialState as targetsInitialState, updateTargets, highlightTarget };
