import PropTypes from 'prop-types';
import React from 'react';
import { compose } from 'redux';
import { connect } from 'react-redux';
import ReactModal from 'react-modal';
import VM from 'scratch-vm';
import { injectIntl, intlShape } from 'react-intl';
import bindAll from 'lodash.bindall';
import JSZip from 'jszip';
import apiClient from '../lib/api-client.js';

import ErrorBoundaryHOC from '../lib/error-boundary-hoc.jsx';
import { getIsError, getIsShowingProject } from '../reducers/project-state';
import { activateTab, BLOCKS_TAB_INDEX, COSTUMES_TAB_INDEX, SOUNDS_TAB_INDEX } from '../reducers/editor-tab';
import {
  closeCostumeLibrary,
  closeBackdropLibrary,
  closeTelemetryModal,
  openExtensionLibrary
} from '../reducers/modals';
import { updateProjectManagerState } from '../reducers/project-manager';

import FontLoaderHOC from '../lib/font-loader-hoc.jsx';
import LocalizationHOC from '../lib/localization-hoc.jsx';
import SBFileUploaderHOC from '../lib/sb-file-uploader-hoc.jsx';
import ProjectFetcherHOC from '../lib/project-fetcher-hoc.jsx';
import ProjectSaverHOC from '../lib/project-saver-hoc.jsx';
import QueryParserHOC from '../lib/query-parser-hoc.jsx';
import storage from '../lib/storage';
import vmListenerHOC from '../lib/vm-listener-hoc.jsx';
import vmManagerHOC from '../lib/vm-manager-hoc.jsx';
import cloudManagerHOC from '../lib/cloud-manager-hoc.jsx';
import systemPreferencesHOC from '../lib/system-preferences-hoc.jsx';

import GUIComponent from '../components/gui/gui.jsx';
import { setIsScratchDesktop } from '../lib/isScratchDesktop.js';
import { sandboxConfig } from '../shared/config/sandbox-config.js';

const { RequestMetadata, setMetadata, unsetMetadata } = storage.scratchFetch;

const setProjectIdMetadata = (projectId) => {
  // If project ID is '0' or zero, it's not a real project ID. In that case, remove the project ID metadata.
  // Same if it's null undefined.
  if (projectId && projectId !== '0') {
    setMetadata(RequestMetadata.ProjectId, projectId);
  } else {
    unsetMetadata(RequestMetadata.ProjectId);
  }
};

const events = ['click', 'dragstart', 'mousedown', 'mouseup'];
const MAX_PROJECTS_AMOUNT = 350;

class GUI extends React.Component {
  constructor(props) {
    super(props);
    bindAll(this, [
      'loadProject',
      'startProjectFromZip',
      'getCurrentProjectUuid',
      'handleGlobalInteraction',
      'getIsScratchLoaded',
      'redirectToSandbox',
      'redirectToHub'
    ]);
  }
  componentDidMount() {
    this.loadProject().then(async () => {
      const wasmResvgPackage = await fetch(new URL('@resvg/resvg-wasm/index_bg.wasm', import.meta.url));
      this.props.updateProjectManagerState({ wasmResvgPackage });

      setIsScratchDesktop(this.props.isScratchDesktop);
      this.props.onStorageInit(storage);
      this.props.onVmInit(this.props.vm);
      setProjectIdMetadata(this.props.projectId);

      events.forEach((eventType) => {
        window.addEventListener(eventType, this.handleGlobalInteraction, true);
      });

      if (this.getIsScratchLoaded()) {
        window.guiLoaderData.preloader.finishFillBar();
      }
    });
  }
  componentDidUpdate(prevProps) {
    if (this.props.projectId !== prevProps.projectId) {
      if (this.props.projectId !== null) {
        this.props.onUpdateProjectId(this.props.projectId);
      }
      setProjectIdMetadata(this.props.projectId);
    }
    if (this.props.isShowingProject && !prevProps.isShowingProject) {
      // this only notifies container when a project changes from not yet loaded to loaded
      // At this time the project view in www doesn't need to know when a project is unloaded
      this.props.onProjectLoaded();
    }
    if (this.props.shouldStopProject && !prevProps.shouldStopProject) {
      this.props.vm.stopAll();
    }

    if (
      this.getIsScratchLoaded() &&
      (prevProps.isLoading || prevProps.loadingStateVisible || prevProps.fetchingProject)
    ) {
      window.guiLoaderData.preloader.finishFillBar();
    }
  }
  componentWillUnmount() {
    events.forEach((eventType) => {
      window.removeEventListener(eventType, this.handleGlobalInteraction, true);
    });
  }
  async loadProject() {
    const projectMeta = this.getCurrentProjectUuid();
    if (!projectMeta?.projectUuid) {
      this.redirectToSandbox();
      return;
    }

    const projectResponse = {
      is_editable: true,
      name: 'Проект Scratch',
      config: '',
      assetUrls: []
    };

    const isSandbox = Boolean(projectMeta.projectMode === 'sandbox' && sandboxConfig[projectMeta?.projectUuid]);
    const projectsResponse = {
      projects: []
    };

    const assetPrefix = `${process.env.S3_PUBLIC}/`;

    try {
      if (projectMeta.projectMode === 'project') {
        const [actualProjectResponse, actualProjectsResponse] = await Promise.all([
          apiClient.getProjectByUUID(projectMeta?.projectUuid),
          apiClient.getProjects()
        ]);

        projectResponse.name = actualProjectResponse.name;
        projectResponse.config = actualProjectResponse.config;
        projectResponse.assetUrls = actualProjectResponse.asset_urls.map((name) => assetPrefix + name);
        projectResponse.is_editable = actualProjectResponse.is_editable;

        projectsResponse.projects = actualProjectsResponse.projects;
      } else if (isSandbox) {
        projectResponse.name = sandboxConfig[projectMeta?.projectUuid]?.name;

        projectResponse.assetUrls = sandboxConfig[projectMeta?.projectUuid]?.assetUrls.map(
          (name) => assetPrefix + name
        );

        projectResponse.config = await (
          await fetch(`${assetPrefix}library/sandbox_${projectMeta?.projectUuid}.json`)
        ).json();
      } else {
        this.redirectToHub();
        return;
      }

      this.props.updateProjectManagerState({
        isSandbox,
        isEditable: projectResponse.is_editable,
        isCopied: projectsResponse.projects.length < MAX_PROJECTS_AMOUNT,
        currentProjectUuid: projectMeta.projectUuid,
        projectName: projectResponse.name
      });

      const assetResponses = await Promise.all(projectResponse.assetUrls.map((url) => fetch(`${url}?cache=reload`)));
      let assetBuffers = await Promise.all(
        assetResponses.map((res, i) => {
          if (!res.ok && res.status !== 404) {
            this.redirectToHub();
            throw new Error(`Не удалось скачать ассет: ${res.url}`);
          }
          return res.status === 404 ? null : { [projectResponse.assetUrls[i]]: res.arrayBuffer() };
        })
      );

      assetBuffers = assetBuffers.filter((resultValue) => resultValue !== null);

      await this.startProjectFromZip(assetBuffers, projectResponse);
    } catch (error) {
      console.error(error);
    }
  }
  async startProjectFromZip(assetBuffers, projectResponse) {
    const zip = new JSZip();

    assetBuffers.forEach((bufferObject) => {
      const fullUrl = Object.keys(bufferObject)[0];
      const fileName = fullUrl.substring(fullUrl.lastIndexOf('/') + 1);

      zip.file(fileName, bufferObject[fullUrl]);
    });

    const jsonString = JSON.stringify(projectResponse.config);
    zip.file('project.json', jsonString);

    const sb3Blob = await zip.generateAsync({ type: 'blob' });

    const arrayBuffer = await sb3Blob.arrayBuffer();

    await this.props.vm.loadProject(arrayBuffer);

    await this.props.vm.start();
  }
  getCurrentProjectUuid() {
    const splittedLocation = `${location}`.split('/');

    if (
      !splittedLocation.length ||
      (splittedLocation[splittedLocation.length - 2] !== 'project' &&
        splittedLocation[splittedLocation.length - 2] !== 'sandbox')
    ) {
      return null;
    }
    const projectUuid = splittedLocation[splittedLocation.length - 1];
    return { projectUuid: projectUuid, projectMode: splittedLocation[splittedLocation.length - 2] };
  }
  redirectToSandbox() {
    location = `${location.origin}/code-cat-studio/sandbox/1`;
  }
  redirectToHub() {
    location = `${location.origin}/code-cat-studio/hub`;
  }
  handleGlobalInteraction(event) {
    if (this.props.isEditable) return;

    const isException = event.target.closest('[data-allow-interaction="true"]');
    if (isException) return;

    event.stopPropagation();
    event.preventDefault();
  }
  getIsScratchLoaded() {
    return !this.props.isLoading && !this.props.loadingStateVisible && !this.props.fetchingProject;
  }
  render() {
    if (this.props.isError) {
      throw new Error(`Error in Scratch GUI [location=${window.location}]: ${this.props.error}`);
    }
    const {
      /* eslint-disable no-unused-vars */
      assetHost,
      cloudHost,
      error,
      isError,
      isScratchDesktop,
      isShowingProject,
      onProjectLoaded,
      onStorageInit,
      onUpdateProjectId,
      onVmInit,
      projectHost,
      projectId,
      fetchingProject,
      isEditable,
      shouldStopProject,
      updateProjectManagerState,
      /* eslint-enable no-unused-vars */
      children,
      isLoading,
      loadingStateVisible,
      ...componentProps
    } = this.props;
    return <GUIComponent {...componentProps}>{children}</GUIComponent>;
  }
}

GUI.propTypes = {
  assetHost: PropTypes.string,
  children: PropTypes.node,
  cloudHost: PropTypes.string,
  error: PropTypes.oneOfType([PropTypes.object, PropTypes.string]),
  fetchingProject: PropTypes.bool,
  intl: intlShape,
  isError: PropTypes.bool,
  isLoading: PropTypes.bool,
  isScratchDesktop: PropTypes.bool,
  isShowingProject: PropTypes.bool,
  isTotallyNormal: PropTypes.bool,
  loadingStateVisible: PropTypes.bool,
  onProjectLoaded: PropTypes.func,
  onStorageInit: PropTypes.func,
  onUpdateProjectId: PropTypes.func,
  onVmInit: PropTypes.func,
  projectHost: PropTypes.string,
  projectId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  shouldStopProject: PropTypes.bool,
  telemetryModalVisible: PropTypes.bool,
  vm: PropTypes.instanceOf(VM).isRequired,
  isEditable: PropTypes.bool
};

GUI.defaultProps = {
  isScratchDesktop: false,
  isTotallyNormal: false,
  onStorageInit: () => {},
  onProjectLoaded: () => {},
  onUpdateProjectId: () => {},
  onVmInit: (/* vm */) => {}
};

const mapStateToProps = (state) => {
  const loadingState = state.scratchGui.projectState.loadingState;
  return {
    activeTabIndex: state.scratchGui.editorTab.activeTabIndex,
    alertsVisible: state.scratchGui.alerts.visible,
    backdropLibraryVisible: state.scratchGui.modals.backdropLibrary,
    blocksTabVisible: state.scratchGui.editorTab.activeTabIndex === BLOCKS_TAB_INDEX,
    cardsVisible: state.scratchGui.cards.visible,
    connectionModalVisible: state.scratchGui.modals.connectionModal,
    costumeLibraryVisible: state.scratchGui.modals.costumeLibrary,
    costumesTabVisible: state.scratchGui.editorTab.activeTabIndex === COSTUMES_TAB_INDEX,
    error: state.scratchGui.projectState.error,
    isError: getIsError(loadingState),
    isFullScreen: state.scratchGui.mode.isFullScreen,
    isPlayerOnly: state.scratchGui.mode.isPlayerOnly,
    isRtl: state.locales.isRtl,
    isShowingProject: getIsShowingProject(loadingState),
    loadingStateVisible: state.scratchGui.modals.loadingProject,
    projectId: state.scratchGui.projectState.projectId,
    soundsTabVisible: state.scratchGui.editorTab.activeTabIndex === SOUNDS_TAB_INDEX,
    targetIsStage:
      state.scratchGui.targets.stage && state.scratchGui.targets.stage.id === state.scratchGui.targets.editingTarget,
    telemetryModalVisible: state.scratchGui.modals.telemetryModal,
    vm: state.scratchGui.vm,
    isEditable: state.scratchGui.projectManager.isEditable
  };
};

const mapDispatchToProps = (dispatch) => ({
  onExtensionButtonClick: () => dispatch(openExtensionLibrary()),
  onActivateTab: (tab) => dispatch(activateTab(tab)),
  onActivateCostumesTab: () => dispatch(activateTab(COSTUMES_TAB_INDEX)),
  onActivateSoundsTab: () => dispatch(activateTab(SOUNDS_TAB_INDEX)),
  onRequestCloseBackdropLibrary: () => dispatch(closeBackdropLibrary()),
  onRequestCloseCostumeLibrary: () => dispatch(closeCostumeLibrary()),
  onRequestCloseTelemetryModal: () => dispatch(closeTelemetryModal()),
  updateProjectManagerState: (newState) => dispatch(updateProjectManagerState(newState))
});

const ConnectedGUI = injectIntl(connect(mapStateToProps, mapDispatchToProps)(GUI));

// note that redux's 'compose' function is just being used as a general utility to make
// the hierarchy of HOC constructor calls clearer here; it has nothing to do with redux's
// ability to compose reducers.
const WrappedGui = compose(
  LocalizationHOC,
  ErrorBoundaryHOC('Top Level App'),
  FontLoaderHOC,
  QueryParserHOC,
  ProjectFetcherHOC,
  ProjectSaverHOC,
  vmListenerHOC,
  vmManagerHOC,
  SBFileUploaderHOC,
  cloudManagerHOC,
  systemPreferencesHOC
)(ConnectedGUI);

WrappedGui.setAppElement = ReactModal.setAppElement;
export default WrappedGui;
