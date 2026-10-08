import PropTypes from 'prop-types';
import React from 'react';
import ReactModal from 'react-modal';
import { connect } from 'react-redux';

import { closeCopyProjectErrorModal } from '../../reducers/modals';

import closeIcon from '../../shared/assets/close.svg';
import styles from './copy-project-error-modal.css';

const CopyProjectErrorModal = (props) => (
  <ReactModal isOpen className={styles.modalContent} overlayClassName={styles.modalOverlay}>
    <div className={styles.texWrapper}>
      <span className={styles.title}>Ой! Создать копию нельзя</span>
      <span>
        Проектов слишком много. Чтобы создать
        <br /> копию проекта, удали старый.
      </span>
    </div>

    <button data-allow-interaction="true" className={styles.confirmButton} onClick={() => props.closeModal()}>
      ОК
    </button>
    <button data-allow-interaction="true" className={styles.closeButton} onClick={() => props.closeModal()}>
      <img src={closeIcon} draggable={false} alt="close img" />
    </button>
  </ReactModal>
);

CopyProjectErrorModal.setAppElement = ReactModal.setAppElement;

CopyProjectErrorModal.propTypes = {
  closeModal: PropTypes.func.isRequired
};

const mapDispatchToProps = (dispatch) => ({
  closeModal: () => dispatch(closeCopyProjectErrorModal())
});

export default connect(null, mapDispatchToProps)(CopyProjectErrorModal);
