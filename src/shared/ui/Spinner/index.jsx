import React from 'react';

import cn from 'classnames';
import styles from './index.module.css';

export const Spinner = ({ className }) => (
  <div className={cn(styles.spinnerWrapper, className)}>
    <div className={styles.spinner}>
      <div />
      <div />
      <div />
      <div />
      <div />
      <div />
      <div />
      <div />
      <div />
      <div />
      <div />
      <div />
    </div>
  </div>
);
