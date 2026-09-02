export const debounceFetch = (callback, delay = 500) => {
  let timeoutId = null;
  let controller = null;

  return (...params) => {
    if (timeoutId) clearTimeout(timeoutId);
    if (controller) controller.abort();

    controller = new AbortController();
    const { signal } = controller;

    timeoutId = setTimeout(() => {
      timeoutId = null;
      callback(...params, signal);
    }, delay);
  };
};
