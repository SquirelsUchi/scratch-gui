import { DEFAULT_BACKGROUND } from '../../shared/config/default-assets';
import projectData from './project-data';

const defaultProject = (translator) => {
  const projectJson = projectData(translator);
  return [
    {
      id: 0,
      assetType: 'Project',
      dataFormat: 'JSON',
      data: JSON.stringify(projectJson)
    },
    {
      id: DEFAULT_BACKGROUND,
      dataFormat: 'png',
      md5ext: DEFAULT_BACKGROUND + '.png'
    }
  ];
};

export default defaultProject;
