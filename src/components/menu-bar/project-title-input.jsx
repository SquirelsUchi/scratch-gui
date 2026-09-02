import classNames from 'classnames';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import React, { useState } from 'react';
import { defineMessages, intlShape, injectIntl } from 'react-intl';
import { renameInputValidate } from '@code-cat-studio/input-validation';

import BufferedInputHOC from '../forms/buffered-input-hoc.jsx';
import Input from '../forms/input.jsx';
const BufferedInput = BufferedInputHOC(Input);

import { renameProject } from '../../reducers/project-manager.js';
import styles from './project-title-input.css';

const messages = defineMessages({
  projectTitlePlaceholder: {
    id: 'gui.gui.projectTitlePlaceholder',
    description: 'Placeholder for project title when blank',
    defaultMessage: 'Project title here'
  }
});

const ProjectTitleInput = ({ className, intl, ...props }) => {
  const [isInputInvalid, setIsInputInvalid] = useState(false);

  const onInputChange = (e) => {
    const isValid = renameInputValidate(e?.target?.value);
    setIsInputInvalid(!isValid);

    if (!isValid) return;
    props.dispatchRenameProject(props.projectUUID, e?.target?.value, isValid);
  };

  const onBlur = (name) => {
    const isValid = renameInputValidate(name);
    setIsInputInvalid(!isValid);

    if (!isValid) return;
    props.dispatchRenameProject(props.projectUUID, name, isValid);
  };

  const isDisabled = props.isSandbox || !props.isEditable;

  return (
    <BufferedInput
      className={classNames(
        styles.titleField,
        isInputInvalid && styles['title-field_invalid'],
        isDisabled && styles['title-field_disabled'],
        className
      )}
      maxLength="30"
      placeholder={intl.formatMessage(messages.projectTitlePlaceholder)}
      tabIndex="0"
      type="text"
      value={props.projectTitle}
      onChange={onInputChange}
      onBlur={onBlur}
      disabled={isDisabled}
    />
  );
};

ProjectTitleInput.propTypes = {
  className: PropTypes.string,
  intl: intlShape.isRequired,
  dispatchRenameProject: PropTypes.func,
  isSandbox: PropTypes.bool,
  isEditable: PropTypes.bool,
  projectUUID: PropTypes.string
};

const mapStateToProps = (state) => ({
  isSandbox: state.scratchGui.projectManager.isSandbox,
  isEditable: state.scratchGui.projectManager.isEditable,
  projectTitle: state.scratchGui.projectManager.projectName,
  projectUUID: state.scratchGui.projectManager.currentProjectUuid
});

const mapDispatchToProps = (dispatch) => ({
  dispatchRenameProject: (projectUUID, name, isNameValid) => dispatch(renameProject(projectUUID, name, isNameValid))
});

export default injectIntl(connect(mapStateToProps, mapDispatchToProps)(ProjectTitleInput));
