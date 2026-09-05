import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';
import { emitToast } from './ToastContext.jsx';
import { JSDOM } from 'jsdom';

describe('emitToast', () => {
  let dom;

  beforeEach(() => {
    dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' });
    global.window = dom.window;
    global.CustomEvent = dom.window.CustomEvent;
  });

  test('emits aura:toast event with default type', (t, done) => {
    global.window.addEventListener('aura:toast', (e) => {
      assert.deepStrictEqual(e.detail, { message: 'Success message', type: 'success' });
      done();
    });
    emitToast('Success message');
  });

  test('emits aura:toast event with specified type', (t, done) => {
    global.window.addEventListener('aura:toast', (e) => {
      assert.deepStrictEqual(e.detail, { message: 'Error message', type: 'error' });
      done();
    });
    emitToast('Error message', 'error');
  });

  test('handles missing window gracefully', () => {
    const oldWindow = global.window;

    // In Node.js environment, the global object is global, not window.
    // jsdom assigns dom.window to global.window.
    // To properly simulate the browser "typeof window" check failing in Node,
    // we just need to ensure the global property "window" is undefined.
    delete global.window;

    // Should not throw an error
    // In node, "typeof window" is "undefined" and we deleted global.window,
    // so emitToast returns early without trying to access window.dispatchEvent
    assert.doesNotThrow(() => {
      emitToast('Hello without window');
    });

    global.window = oldWindow;
  });
});
