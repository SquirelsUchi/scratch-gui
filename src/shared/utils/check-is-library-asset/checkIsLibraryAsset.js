import backdrops from '../../../lib/libraries/backdrops.json';
import costumes from '../../../lib/libraries/costumes.json';
import { DEFAULT_BACKGROUND } from '../../config/default-assets';

export const checkIsLibraryAsset = (assetName) =>
  [...backdrops, ...costumes, { md5ext: DEFAULT_BACKGROUND + '.png' }].some(({ md5ext }) => {
    return md5ext === assetName;
  });
