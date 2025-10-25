// Cross-browser compatibility layer
// This polyfill provides a unified API that works in Chrome, Firefox, Edge, and Safari

(function () {
  'use strict';

  // Check if we're in a browser extension context
  if (typeof chrome === 'undefined' && typeof browser === 'undefined') {
    return;
  }

  // If browser API exists (Firefox), use it directly
  if (typeof browser !== 'undefined' && browser.runtime) {
    window.browserAPI = browser;
    return;
  }

  // Otherwise, create a Promise-based wrapper around chrome API
  const chromeToBrowserAPI = {};

  // Wrap chrome.runtime
  if (chrome.runtime) {
    chromeToBrowserAPI.runtime = {
      sendMessage: (...args) => new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(...args, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(response);
          }
        });
      }),
      onMessage: chrome.runtime.onMessage,
      getURL: chrome.runtime.getURL,
      openOptionsPage: () => new Promise((resolve, reject) => {
        chrome.runtime.openOptionsPage(() => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve();
          }
        });
      }),
      id: chrome.runtime.id,
      getManifest: chrome.runtime.getManifest
    };
  }

  // Wrap chrome.storage
  if (chrome.storage) {
    chromeToBrowserAPI.storage = {
      sync: {
        get: (keys) => new Promise((resolve, reject) => {
          chrome.storage.sync.get(keys, (items) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve(items);
            }
          });
        }),
        set: (items) => new Promise((resolve, reject) => {
          chrome.storage.sync.set(items, () => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve();
            }
          });
        })
      },
      local: {
        get: (keys) => new Promise((resolve, reject) => {
          chrome.storage.local.get(keys, (items) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve(items);
            }
          });
        }),
        set: (items) => new Promise((resolve, reject) => {
          chrome.storage.local.set(items, () => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve();
            }
          });
        })
      }
    };
  }

  // Wrap chrome.tabs
  if (chrome.tabs) {
    chromeToBrowserAPI.tabs = {
      query: (queryInfo) => new Promise((resolve, reject) => {
        chrome.tabs.query(queryInfo, (tabs) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(tabs);
          }
        });
      }),
      sendMessage: (tabId, message) => new Promise((resolve, reject) => {
        chrome.tabs.sendMessage(tabId, message, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(response);
          }
        });
      }),
      create: (createProperties) => new Promise((resolve, reject) => {
        chrome.tabs.create(createProperties, (tab) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(tab);
          }
        });
      })
    };
  }

  window.browserAPI = chromeToBrowserAPI;
})();
