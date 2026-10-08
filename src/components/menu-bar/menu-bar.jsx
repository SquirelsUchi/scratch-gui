import classNames from 'classnames';
import { connect } from 'react-redux';
import { compose } from 'redux';
import { defineMessages, FormattedMessage, injectIntl, intlShape } from 'react-intl';
import PropTypes from 'prop-types';
import bindAll from 'lodash.bindall';
import React from 'react';

import VM from 'scratch-vm';

import Box from '../box/box.jsx';
import Button from '../button/button.jsx';
import { ComingSoonTooltip } from '../coming-soon/coming-soon.jsx';
import { MenuItem, MenuSection } from '../menu/menu.jsx';
import SB3Downloader from '../../containers/sb3-downloader.jsx';
import DeletionRestorer from '../../containers/deletion-restorer.jsx';
import TurboMode from '../../containers/turbo-mode.jsx';
import MenuBarHOC from '../../containers/menu-bar-hoc.jsx';
import {
  isTimeTravel220022BC,
  isTimeTravel1920,
  isTimeTravel1990,
  isTimeTravel2020,
  isTimeTravelNow,
  setTimeTravel
} from '../../reducers/time-travel';
import { autoUpdateProject, getIsUpdating, getIsShowingProject } from '../../reducers/project-state';
import {
  openAboutMenu,
  closeAboutMenu,
  aboutMenuOpen,
  accountMenuOpen,
  openFileMenu,
  closeFileMenu,
  fileMenuOpen,
  openEditMenu,
  closeEditMenu,
  editMenuOpen,
  loginMenuOpen,
  openModeMenu,
  closeModeMenu,
  modeMenuOpen
} from '../../reducers/menus';
import { saveProject, copyProject } from '../../reducers/project-manager.js';
import collectMetadata from '../../lib/collect-metadata';
import sharedMessages from '../../lib/shared-messages';
import { Spinner } from '../../shared/ui/Spinner/index.jsx';
import { openCopyProjectErrorModal } from '../../reducers/modals';
import MenuBarMenu from './menu-bar-menu.jsx';
import ProjectTitleInput from './project-title-input.jsx';

import styles from './menu-bar.css';

import remixIcon from './icon--remix.svg';
import dropdownCaret from './dropdown-caret.svg';
import fileIcon from './icon--file.svg';
import editIcon from './icon--edit.svg';
import copyIcon from './icon--copy.svg';
import saveIcon from './icon--save.svg';

import backButton from './back-button.svg';
import scratchLogo from './scratch-logo.svg';
import ninetiesLogo from './nineties_logo.svg';
import catLogo from './cat_logo.svg';
import prehistoricLogo from './prehistoric-logo.svg';
import oldtimeyLogo from './oldtimey-logo.svg';

const ariaMessages = defineMessages({
  tutorials: {
    id: 'gui.menuBar.tutorialsLibrary',
    defaultMessage: 'Tutorials',
    description: 'accessibility text for the tutorials button'
  },
  debug: {
    id: 'gui.menuBar.debug',
    defaultMessage: 'Debug',
    description: 'accessibility text for the debug button'
  }
});

const MenuBarItemTooltip = ({ children, className, enable, id, place = 'bottom' }) => {
  if (enable) {
    return <React.Fragment>{children}</React.Fragment>;
  }
  return (
    <ComingSoonTooltip
      className={classNames(styles.comingSoon, className)}
      place={place}
      tooltipClassName={styles.comingSoonTooltip}
      tooltipId={id}
    >
      {children}
    </ComingSoonTooltip>
  );
};

MenuBarItemTooltip.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
  enable: PropTypes.bool,
  id: PropTypes.string,
  place: PropTypes.oneOf(['top', 'bottom', 'left', 'right'])
};

const MenuItemTooltip = ({ id, isRtl, children, className }) => (
  <ComingSoonTooltip
    className={classNames(styles.comingSoon, className)}
    isRtl={isRtl}
    place={isRtl ? 'left' : 'right'}
    tooltipClassName={styles.comingSoonTooltip}
    tooltipId={id}
  >
    {children}
  </ComingSoonTooltip>
);

MenuItemTooltip.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
  id: PropTypes.string,
  isRtl: PropTypes.bool
};

class MenuBar extends React.Component {
  constructor(props) {
    super(props);
    bindAll(this, [
      'handleSetMode',
      'handleRestoreOption',
      'getSaveToComputerHandler',
      'restoreOptionMessage',
      'handleSaveClick',
      'handleCopyClick'
    ]);
  }
  handleSetMode(mode) {
    return () => {
      // Turn on/off filters for modes.
      if (mode === '1920') {
        document.documentElement.style.filter = 'brightness(.9)contrast(.8)sepia(1.0)';
        document.documentElement.style.height = '100%';
      } else if (mode === '1990') {
        document.documentElement.style.filter = 'hue-rotate(40deg)';
        document.documentElement.style.height = '100%';
      } else {
        document.documentElement.style.filter = '';
        document.documentElement.style.height = '';
      }

      // Change logo for modes
      if (mode === '1990') {
        document.getElementById('logo_img').src = ninetiesLogo;
      } else if (mode === '2020') {
        document.getElementById('logo_img').src = catLogo;
      } else if (mode === '1920') {
        document.getElementById('logo_img').src = oldtimeyLogo;
      } else if (mode === '220022BC') {
        document.getElementById('logo_img').src = prehistoricLogo;
      } else {
        document.getElementById('logo_img').src = this.props.logo;
      }

      this.props.onSetTimeTravelMode(mode);
    };
  }
  handleRestoreOption(restoreFun) {
    return () => {
      restoreFun();
      this.props.onRequestCloseEdit();
    };
  }
  getSaveToComputerHandler(downloadProjectCallback) {
    return () => {
      this.props.onRequestCloseFile();
      downloadProjectCallback();
      if (this.props.onProjectTelemetryEvent) {
        const metadata = collectMetadata(this.props.vm, this.props.locale);
        this.props.onProjectTelemetryEvent('projectDidSave', metadata);
      }
    };
  }
  restoreOptionMessage(deletedItem) {
    switch (deletedItem) {
      case 'Sprite':
        return (
          <FormattedMessage
            defaultMessage="Restore Sprite"
            description="Menu bar item for restoring the last deleted sprite."
            id="gui.menuBar.restoreSprite"
          />
        );
      case 'Sound':
        return (
          <FormattedMessage
            defaultMessage="Restore Sound"
            description="Menu bar item for restoring the last deleted sound."
            id="gui.menuBar.restoreSound"
          />
        );
      case 'Costume':
        return (
          <FormattedMessage
            defaultMessage="Restore Costume"
            description="Menu bar item for restoring the last deleted costume."
            id="gui.menuBar.restoreCostume"
          />
        );
      default: {
        return (
          <FormattedMessage
            defaultMessage="Restore"
            description="Menu bar item for restoring the last deleted item in its disabled state." /* eslint-disable-line max-len */
            id="gui.menuBar.restore"
          />
        );
      }
    }
  }
  wrapAboutMenuCallback(callback) {
    return () => {
      callback();
      this.props.onRequestCloseAbout();
    };
  }
  handleSaveClick() {
    return () => {
      if (this.props.isSaveSpinnerRequired) return;

      this.props.onClickSave(this.props.vm, this.props.currentProjectUuid);
    };
  }
  handleCopyClick() {
    return () => {
      if (this.props.isCopySpinnerRequired) return;

      this.props.onClickCopy(this.props.currentProjectUuid);
    };
  }
  render() {
    const saveNowMessage = (
      <FormattedMessage defaultMessage="Save now" description="Menu bar item for saving now" id="gui.menuBar.saveNow" />
    );
    const createCopyMessage = (
      <FormattedMessage
        defaultMessage="Save as a copy"
        description="Menu bar item for saving as a copy"
        id="gui.menuBar.saveAsCopy"
      />
    );
    const remixMessage = (
      <FormattedMessage defaultMessage="Remix" description="Menu bar item for remixing" id="gui.menuBar.remix" />
    );
    const newProjectMessage = (
      <FormattedMessage
        defaultMessage="New"
        description="Menu bar item for creating a new project"
        id="gui.menuBar.new"
      />
    );
    const remixButton = (
      <Button
        className={classNames(styles.menuBarButton, styles.remixButton)}
        iconClassName={styles.remixButtonIcon}
        iconSrc={remixIcon}
        onClick={this.handleClickRemix}
      >
        {remixMessage}
      </Button>
    );
    return (
      <Box className={classNames(this.props.className, styles.menuBar)}>
        <div className={styles.mainMenu}>
          <div className={styles.fileGroup}>
            <div data-allow-interaction="true" className={classNames(styles.menuBarItem, styles.backButtonWrapper)}>
              <img
                id="back_img"
                alt="Scratch"
                className={styles.backButton}
                draggable={false}
                src={backButton}
                onClick={() => {
                  location = `${location.origin}/code-cat-studio/hub`;
                }}
              />
            </div>

            <div className={classNames(styles.menuBarItem, styles.scratchLogoWrapper)}>
              <img id="logo_img" alt="Scratch" className={styles.scratchLogo} draggable={false} src={this.props.logo} />
            </div>

            {this.props.canManageFiles && (
              <div
                className={classNames(styles.menuBarItem, styles.hoverable, {
                  [styles.active]: this.props.fileMenuOpen
                })}
                onMouseUp={this.props.onClickFile}
              >
                <img src={fileIcon} />
                <span className={styles.collapsibleLabel}>
                  <FormattedMessage
                    defaultMessage="File"
                    description="Text for file dropdown menu"
                    id="gui.menuBar.file"
                  />
                </span>
                <img src={dropdownCaret} />
                <MenuBarMenu
                  className={classNames(styles.menuBarMenu)}
                  open={this.props.fileMenuOpen}
                  place={this.props.isRtl ? 'left' : 'right'}
                  onRequestClose={this.props.onRequestCloseFile}
                >
                  <MenuSection>
                    <MenuItem onClick={this.props.onStartSelectingFileUpload}>
                      {this.props.intl.formatMessage(sharedMessages.loadFromComputerTitle)}
                    </MenuItem>
                    <SB3Downloader>
                      {(className, downloadProjectCallback) => (
                        <MenuItem
                          className={className}
                          onClick={this.getSaveToComputerHandler(downloadProjectCallback)}
                        >
                          <FormattedMessage
                            defaultMessage="Save to your computer"
                            description="Menu bar item for downloading a project to your computer" // eslint-disable-line max-len
                            id="gui.menuBar.downloadToComputer"
                          />
                        </MenuItem>
                      )}
                    </SB3Downloader>
                  </MenuSection>
                </MenuBarMenu>
              </div>
            )}

            <div
              className={classNames(styles.menuBarItem, styles.hoverable, {
                [styles.active]: this.props.editMenuOpen
              })}
              onMouseUp={this.props.onClickEdit}
            >
              <img src={editIcon} />
              <span className={styles.collapsibleLabel}>
                <FormattedMessage
                  defaultMessage="Edit"
                  description="Text for edit dropdown menu"
                  id="gui.menuBar.edit"
                />
              </span>
              <img src={dropdownCaret} />
              <MenuBarMenu
                className={classNames(styles.menuBarMenu)}
                open={this.props.editMenuOpen}
                place={this.props.isRtl ? 'left' : 'right'}
                onRequestClose={this.props.onRequestCloseEdit}
              >
                <DeletionRestorer>
                  {(handleRestore, { restorable, deletedItem }) => (
                    <MenuItem
                      className={classNames({
                        [styles.disabled]: !restorable
                      })}
                      onClick={this.handleRestoreOption(handleRestore)}
                    >
                      {this.restoreOptionMessage(deletedItem)}
                    </MenuItem>
                  )}
                </DeletionRestorer>
                <MenuSection>
                  <TurboMode>
                    {(toggleTurboMode, { turboMode }) => (
                      <MenuItem onClick={toggleTurboMode}>
                        {turboMode ? (
                          <FormattedMessage
                            defaultMessage="Turn off Turbo Mode"
                            description="Menu bar item for turning off turbo mode"
                            id="gui.menuBar.turboModeOff"
                          />
                        ) : (
                          <FormattedMessage
                            defaultMessage="Turn on Turbo Mode"
                            description="Menu bar item for turning on turbo mode"
                            id="gui.menuBar.turboModeOn"
                          />
                        )}
                      </MenuItem>
                    )}
                  </TurboMode>
                </MenuSection>
              </MenuBarMenu>
            </div>

            {this.props.isTotallyNormal && (
              <div
                className={classNames(styles.menuBarItem, styles.hoverable, {
                  [styles.active]: this.props.modeMenuOpen
                })}
                onMouseUp={this.props.onClickMode}
              >
                <div className={classNames(styles.editMenu)}>
                  <FormattedMessage
                    defaultMessage="Mode"
                    description="Mode menu item in the menu bar"
                    id="gui.menuBar.modeMenu"
                  />
                </div>
                <MenuBarMenu
                  className={classNames(styles.menuBarMenu)}
                  open={this.props.modeMenuOpen}
                  place={this.props.isRtl ? 'left' : 'right'}
                  onRequestClose={this.props.onRequestCloseMode}
                >
                  <MenuSection>
                    <MenuItem onClick={this.handleSetMode('NOW')}>
                      <span
                        className={classNames({
                          [styles.inactive]: !this.props.modeNow
                        })}
                      >
                        {'✓'}
                      </span>{' '}
                      <FormattedMessage
                        defaultMessage="Normal mode"
                        description="April fools: resets editor to not have any pranks"
                        id="gui.menuBar.normalMode"
                      />
                    </MenuItem>
                    <MenuItem onClick={this.handleSetMode('2020')}>
                      <span
                        className={classNames({
                          [styles.inactive]: !this.props.mode2020
                        })}
                      >
                        {'✓'}
                      </span>{' '}
                      <FormattedMessage
                        defaultMessage="Caturday mode"
                        description="April fools: Cat blocks mode"
                        id="gui.menuBar.caturdayMode"
                      />
                    </MenuItem>
                  </MenuSection>
                </MenuBarMenu>
              </div>
            )}

            {!this.props.isSandbox &&
              (this.props.isEditable ? (
                <div
                  className={classNames(styles.menuBarItem, styles.hoverable, styles.manageProjectWrapper)}
                  onClick={this.handleSaveClick()}
                >
                  {this.props.isSaveSpinnerRequired && <Spinner className={styles.buttonSpinner} />}

                  <img
                    id="save_img"
                    alt="Scratch"
                    draggable={false}
                    src={saveIcon}
                    className={classNames(this.props.isSaveSpinnerRequired && styles.hidden)}
                  />

                  <span>Сохранить</span>
                </div>
              ) : (
                <div
                  data-allow-interaction="true"
                  className={classNames(
                    styles.menuBarItem,
                    styles.hoverable,
                    styles.manageProjectWrapper,
                    !this.props.isCopied && styles.disabled
                  )}
                  onClick={this.handleCopyClick()}
                >
                  {this.props.isCopySpinnerRequired && <Spinner className={styles.buttonSpinner} />}

                  <img
                    id="copy_img"
                    alt="Scratch"
                    draggable={false}
                    src={copyIcon}
                    className={classNames(this.props.isCopySpinnerRequired && styles.hidden)}
                  />
                  <span>Создать копию</span>
                </div>
              ))}
          </div>

          <div className={classNames(styles.menuBarItem, styles.growable, styles.menuBarInput)}>
            <MenuBarItemTooltip enable id="title-field">
              <ProjectTitleInput className={classNames(styles.titleFieldGrowable)} />
            </MenuBarItemTooltip>
          </div>

          <div className={classNames(styles.menuBarItem, styles.hoverable, styles.menuBarItem_right)}>
            <a
              href="https://github.com/SquirelsUchi/scratch-gui"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.sourceLink}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M7.99654 0.157662C5.33974 0.765718 3.16203 2.27691 1.66377 4.56605C-0.958192 8.59888 -0.435542 14.0088 2.90942 17.4604C3.91116 18.4976 5.43556 19.4991 6.58539 19.8836C7.01222 20.0267 7.06448 20.0267 7.25612 19.8926C7.46518 19.7495 7.47389 19.7138 7.47389 18.6854V17.6303L6.70734 17.675C5.81012 17.7197 5.11326 17.5587 4.69514 17.1921C4.54705 17.0669 4.2596 16.6377 4.05925 16.2443C3.72824 15.5826 3.48433 15.2785 2.80489 14.6615C2.57841 14.4559 2.56969 14.4469 2.72649 14.3307C3.10106 14.0445 3.8589 14.3217 4.33799 14.9119C5.17423 15.9581 5.49653 16.2353 5.97563 16.3426C6.40246 16.432 6.79445 16.3963 7.38678 16.2174C7.46518 16.1906 7.56971 16.0028 7.62198 15.7882C7.67424 15.5826 7.81361 15.2696 7.92686 15.0997L8.13591 14.7867L7.43034 14.6437C5.9495 14.3307 5.03486 13.7852 4.43381 12.8553C3.87632 11.9968 3.69339 11.2546 3.68468 9.86864C3.68468 8.56312 3.82405 8.0266 4.37284 7.29335C4.61674 6.97144 4.64287 6.87308 4.57319 6.6853C4.44252 6.36339 4.47737 5.00421 4.61674 4.59288C4.72998 4.28885 4.79096 4.2352 5.02615 4.20838C5.41814 4.16367 6.14985 4.42298 6.89027 4.8522L7.52616 5.22776L8.08365 5.09363C8.87634 4.90585 11.2544 4.91479 11.9687 5.09363L12.5088 5.2367L13.014 4.92373C13.6847 4.5124 14.5384 4.19049 14.9652 4.19049C15.3049 4.19049 15.3049 4.19943 15.4443 4.65547C15.5924 5.18305 15.6185 6.13984 15.4879 6.59588C15.4182 6.86414 15.4356 6.94462 15.6272 7.20394C16.5767 8.49158 16.6812 10.6287 15.8798 12.3813C15.3398 13.5349 14.1987 14.3396 12.6655 14.6347L11.9338 14.7778L12.2039 15.2696L12.4826 15.7703L12.5088 17.7644L12.5436 19.7585L12.7614 19.9015C12.9617 20.0357 13.0053 20.0357 13.4234 19.8836C14.1203 19.6422 15.3136 18.9805 15.967 18.4708C19.852 15.4842 21.1063 10.128 18.9548 5.67486C17.6917 3.05486 15.3049 1.04292 12.5697 0.291793C11.3763 -0.030118 9.12895 -0.101653 7.99654 0.157662Z"
                  fill="white"
                />
              </svg>
            </a>
          </div>
        </div>
      </Box>
    );
  }
}

MenuBar.propTypes = {
  aboutMenuOpen: PropTypes.bool,
  accountMenuOpen: PropTypes.bool,
  authorId: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]),
  authorThumbnailUrl: PropTypes.string,
  authorUsername: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]),
  autoUpdateProject: PropTypes.func,
  canManageFiles: PropTypes.bool,
  className: PropTypes.string,
  confirmReadyToReplaceProject: PropTypes.func,
  currentLocale: PropTypes.string.isRequired,
  editMenuOpen: PropTypes.bool,
  fileMenuOpen: PropTypes.bool,
  intl: intlShape,
  isRtl: PropTypes.bool,
  isShowingProject: PropTypes.bool,
  isTotallyNormal: PropTypes.bool,
  isUpdating: PropTypes.bool,
  locale: PropTypes.string.isRequired,
  loginMenuOpen: PropTypes.bool,
  logo: PropTypes.string,
  mode1920: PropTypes.bool,
  mode1990: PropTypes.bool,
  mode2020: PropTypes.bool,
  mode220022BC: PropTypes.bool,
  modeMenuOpen: PropTypes.bool,
  modeNow: PropTypes.bool,
  onClickAbout: PropTypes.oneOfType([
    PropTypes.func, // button mode: call this callback when the About button is clicked
    PropTypes.arrayOf(
      // menu mode: list of items in the About menu
      PropTypes.shape({
        title: PropTypes.string, // text for the menu item
        onClick: PropTypes.func // call this callback when the menu item is clicked
      })
    )
  ]),
  onClickEdit: PropTypes.func,
  onClickFile: PropTypes.func,
  onClickMode: PropTypes.func,
  onClickSettings: PropTypes.func,
  onLogOut: PropTypes.func,
  onOpenRegistration: PropTypes.func,
  onOpenTipLibrary: PropTypes.func,
  onProjectTelemetryEvent: PropTypes.func,
  onRequestCloseAbout: PropTypes.func,
  onRequestCloseEdit: PropTypes.func,
  onRequestCloseFile: PropTypes.func,
  onRequestCloseMode: PropTypes.func,
  onRequestCloseSettings: PropTypes.func,
  onRequestOpenAbout: PropTypes.func,
  onSetTimeTravelMode: PropTypes.func,
  onClickSave: PropTypes.func,
  onClickCopy: PropTypes.func,
  currentProjectUuid: PropTypes.string,
  onShare: PropTypes.func,
  onStartSelectingFileUpload: PropTypes.func,
  onToggleLoginOpen: PropTypes.func,
  renderLogin: PropTypes.func,
  sessionExists: PropTypes.bool,
  shouldSaveBeforeTransition: PropTypes.func,
  showComingSoon: PropTypes.bool,
  username: PropTypes.string,
  userOwnsProject: PropTypes.bool,
  vm: PropTypes.instanceOf(VM).isRequired,
  isSaveSpinnerRequired: PropTypes.bool,
  isCopySpinnerRequired: PropTypes.bool,
  isEditable: PropTypes.bool,
  isSandbox: PropTypes.bool,
  isCopied: PropTypes.bool
};

MenuBar.defaultProps = {
  logo: scratchLogo,
  onShare: () => {}
};

const mapStateToProps = (state, ownProps) => {
  const loadingState = state.scratchGui.projectState.loadingState;
  const user = state.session && state.session.session && state.session.session.user;
  return {
    aboutMenuOpen: aboutMenuOpen(state),
    accountMenuOpen: accountMenuOpen(state),
    currentLocale: state.locales.locale,
    fileMenuOpen: fileMenuOpen(state),
    editMenuOpen: editMenuOpen(state),
    isRtl: state.locales.isRtl,
    isUpdating: getIsUpdating(loadingState),
    isShowingProject: getIsShowingProject(loadingState),
    locale: state.locales.locale,
    loginMenuOpen: loginMenuOpen(state),
    modeMenuOpen: modeMenuOpen(state),
    sessionExists: state.session && typeof state.session.session !== 'undefined',
    username: user ? user.username : null,
    userOwnsProject: ownProps.authorUsername && user && ownProps.authorUsername === user.username,
    vm: state.scratchGui.vm,
    mode220022BC: isTimeTravel220022BC(state),
    mode1920: isTimeTravel1920(state),
    mode1990: isTimeTravel1990(state),
    mode2020: isTimeTravel2020(state),
    modeNow: isTimeTravelNow(state),
    isSaveSpinnerRequired: state.scratchGui.projectManager.isSaveSpinnerRequired,
    isCopySpinnerRequired: state.scratchGui.projectManager.isCopySpinnerRequired,
    isEditable: state.scratchGui.projectManager.isEditable,
    currentProjectUuid: state.scratchGui.projectManager.currentProjectUuid,
    isSandbox: state.scratchGui.projectManager.isSandbox,
    isCopied: state.scratchGui.projectManager.isCopied
  };
};

const mapDispatchToProps = (dispatch) => ({
  autoUpdateProject: () => dispatch(autoUpdateProject()),
  onClickFile: () => dispatch(openFileMenu()),
  onRequestCloseFile: () => dispatch(closeFileMenu()),
  onClickEdit: () => dispatch(openEditMenu()),
  onRequestCloseEdit: () => dispatch(closeEditMenu()),
  onClickMode: () => dispatch(openModeMenu()),
  onRequestCloseMode: () => dispatch(closeModeMenu()),
  onRequestOpenAbout: () => dispatch(openAboutMenu()),
  onRequestCloseAbout: () => dispatch(closeAboutMenu()),
  onSetTimeTravelMode: (mode) => dispatch(setTimeTravel(mode)),
  onClickSave: (vm, projectUuid) => dispatch(saveProject(vm, projectUuid)),
  copyProject: (templateUuid) => dispatch(copyProject(templateUuid)),
  openCopiedErrorModal: (templateUuid) => dispatch(openCopyProjectErrorModal(templateUuid))
});

const mergeProps = (stateProps, dispatchProps, ownProps) => {
  return {
    ...stateProps,
    ...dispatchProps,
    ...ownProps,
    onClickCopy: stateProps.isCopied ? dispatchProps.copyProject : dispatchProps.openCopiedErrorModal
  };
};

export default compose(injectIntl, MenuBarHOC, connect(mapStateToProps, mapDispatchToProps, mergeProps))(MenuBar);
