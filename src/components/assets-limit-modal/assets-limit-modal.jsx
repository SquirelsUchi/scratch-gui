import PropTypes from 'prop-types';
import React from 'react';
import ReactModal from 'react-modal';
import { connect } from 'react-redux';

import { closeAssetsLimitModal, closeFileExcideModal, closeCorruptFileModal } from '../../reducers/modals';

import closeIcon from '../../shared/assets/close.svg';
import styles from './assets-limit-modal.css';

const AssetsLimitModal = ({ intl, ...props }) => (
  <ReactModal isOpen className={styles.modalContent} overlayClassName={styles.modalOverlay}>
    <div className={styles.texWrapper}>
      <span className={styles.title}>Ой!</span>
      {props.isCorruptFileMode ? (
        <span>
          Не удалось загрузить файл.
          <br /> Он повреждён или имеет
          <br /> неподходящий формат.
        </span>
      ) : props.isFileExcideMode ? (
        <span>
          Файл слишком большой для
          <br /> загрузки
        </span>
      ) : (
        <span>
          В этот проект больше
          <br /> нельзя загрузить файлы.
        </span>
      )}
    </div>

    <button
      data-allow-interaction="true"
      className={styles.confirmButton}
      onClick={() => props.closeModal(props.isFileExcideMode, props.isCorruptFileMode)}
    >
      ОК
    </button>
    <button
      data-allow-interaction="true"
      className={styles.closeButton}
      onClick={() => props.closeModal(props.isFileExcideMode, props.isCorruptFileMode)}
    >
      <img src={closeIcon} draggable={false} />
    </button>
  </ReactModal>
);

AssetsLimitModal.setAppElement = ReactModal.setAppElement;

AssetsLimitModal.propTypes = {
  isFileExcideMode: PropTypes.bool.isRequired,
  isCorruptFileMode: PropTypes.bool,
  closeModal: PropTypes.func.isRequired
};

const mapDispatchToProps = (dispatch) => ({
  closeModal: (isFileExcideMode, isCorruptFileMode) => {
    if (isCorruptFileMode) {
      dispatch(closeCorruptFileModal());
    } else if (isFileExcideMode) {
      dispatch(closeFileExcideModal());
    } else {
      dispatch(closeAssetsLimitModal());
    }
  }
});

export default connect(null, mapDispatchToProps)(AssetsLimitModal);
