import { defineMessages } from 'react-intl';
import sharedMessages from '../shared-messages';
import { DEFAULT_BACKGROUND } from '../../shared/config/default-assets';

let messages = defineMessages({
  meow: {
    defaultMessage: 'Meow',
    description: 'Name for the meow sound',
    id: 'gui.defaultProject.meow'
  },
  variable: {
    defaultMessage: 'my variable',
    description: 'Name for the default variable',
    id: 'gui.defaultProject.variable'
  }
});

messages = { ...messages, ...sharedMessages };

// use the default message if a translation function is not passed
const defaultTranslator = (msgObj) => msgObj.defaultMessage;

/**
 * Generate a localized version of the default project
 * @param {function} translateFunction a function to use for translating the default names
 * @return {object} the project data json for the default project
 */
const projectData = (translateFunction) => {
  const translator = translateFunction || defaultTranslator;
  return {
    targets: [
      {
        isStage: true,
        name: 'Stage',
        variables: {},
        lists: {},
        broadcasts: {},
        blocks: {},
        currentCostume: 0,
        costumes: [
          {
            assetId: DEFAULT_BACKGROUND,
            name: translator(messages.backdrop, { index: 1 }),
            md5ext: DEFAULT_BACKGROUND + '.png',
            dataFormat: 'png',
            rotationCenterX: 240,
            rotationCenterY: 180
          }
        ],
        sounds: [],
        volume: 100
      }
    ],
    meta: {
      semver: '3.0.0',
      vm: '0.1.0',
      agent: '' // eslint-disable-line max-len
    }
  };
};

export default projectData;
