import bindAll from 'lodash.bindall';
import PropTypes from 'prop-types';
import React from 'react';

/**
 * Higher Order Component to manage inputs that submit on blur and <enter>
 * @param {React.Component} Input text input that consumes onChange, onBlur, onKeyPress
 * @returns {React.Component} Buffered input that calls onSubmit on blur and <enter>
 */
export default function (Input) {
  class BufferedInput extends React.Component {
    constructor(props) {
      super(props);
      bindAll(this, ['handleChange', 'handleKeyPress', 'handleBlur']);
      this.state = {
        value: null
      };
    }
    handleKeyPress(e) {
      if (e.key === 'Enter') {
        e.target.blur();
      }
    }
    handleChange(e, callback) {
      this.setState({ value: e.target.value });

      if (callback) callback(e);
    }

    handleBlur() {
      if (this.state.value === null) return;

      const trimmed = this.state.value.trim();
      this.setState({ value: null });
      const handler = this.props.onSubmit || this.props.onBlur;
      handler(trimmed);
    }

    render() {
      const bufferedValue = this.state.value === null ? this.props.value : this.state.value;
      return (
        <Input
          {...this.props}
          value={bufferedValue}
          onChange={(e) => this.handleChange(e, this?.props?.onChange)}
          onKeyPress={this.handleKeyPress}
          onBlur={this.handleBlur}
        />
      );
    }
  }

  BufferedInput.propTypes = {
    onBlur: PropTypes.func,
    onSubmit: PropTypes.func,
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
  };

  return BufferedInput;
}
