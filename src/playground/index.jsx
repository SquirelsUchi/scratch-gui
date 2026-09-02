// Polyfills
import 'es6-object-assign/auto';
import 'core-js/fn/array/includes';
import 'core-js/fn/promise/finally';
import 'intl'; // For Safari 9

import React from 'react';
import ReactDOM from 'react-dom';
import { initSentry } from '@code-cat-studio/sentry';

import AppStateHOC from '../lib/app-state-hoc.jsx';
import BrowserModalComponent from '../components/browser-modal/browser-modal.jsx';
import supportedBrowser from '../lib/supported-browser';

import styles from './index.css';

initSentry({
  dsn: process.env.SENTRY_DSN,
  release: process.env.SENTRY_RELEASE,
  environment: process.env.SENTRY_ENVIRONMENT,
  enabled: process.env.NODE_ENV === 'production'
});

const appTarget = document.createElement('div');
appTarget.className = styles.app;
document.body.appendChild(appTarget);

if (supportedBrowser()) {
  // require needed here to avoid importing unsupported browser-crashing code
  // at the top level
  require('./render-gui.jsx').default(appTarget);
} else {
  BrowserModalComponent.setAppElement(appTarget);
  const WrappedBrowserModalComponent = AppStateHOC(BrowserModalComponent, true /* localesOnly */);
  const handleBack = () => {};
  // eslint-disable-next-line react/jsx-no-bind
  ReactDOM.render(<WrappedBrowserModalComponent onBack={handleBack} />, appTarget);
}
