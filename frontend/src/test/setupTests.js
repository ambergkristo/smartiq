import '@testing-library/jest-dom/vitest';

let resizeObserverWidth = 1024;

globalThis.__setResizeObserverWidth = (width) => {
  resizeObserverWidth = width;
};

class MockResizeObserver {
  constructor(callback) {
    this.callback = callback;
  }

  observe(target) {
    this.callback([
      {
        target,
        contentRect: {
          width: resizeObserverWidth,
          height: 720
        }
      }
    ]);
  }

  disconnect() {}
}

globalThis.ResizeObserver = MockResizeObserver;
