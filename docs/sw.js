/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If the loader is already loaded, just stop.
if (!self.define) {
  let registry = {};

  // Used for `eval` and `importScripts` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri;

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri + ".js", parentUri).href;
    return registry[uri] || (
      
        new Promise(resolve => {
          if ("document" in self) {
            const script = document.createElement("script");
            script.src = uri;
            script.onload = resolve;
            document.head.appendChild(script);
          } else {
            nextDefineUri = uri;
            importScripts(uri);
            resolve();
          }
        })
      
      .then(() => {
        let promise = registry[uri];
        if (!promise) {
          throw new Error(`Module ${uri} didn’t register its module`);
        }
        return promise;
      })
    );
  };

  self.define = (depsNames, factory) => {
    const uri = nextDefineUri || ("document" in self ? document.currentScript.src : "") || location.href;
    if (registry[uri]) {
      // Module is already loading or loaded.
      return;
    }
    let exports = {};
    const require = depUri => singleRequire(depUri, uri);
    const specialDeps = {
      module: { uri },
      exports,
      require
    };
    registry[uri] = Promise.all(depsNames.map(
      depName => specialDeps[depName] || require(depName)
    )).then(deps => {
      factory(...deps);
      return exports;
    });
  };
}
define(['./workbox-7e5eb42b'], (function (workbox) { 'use strict';

  self.skipWaiting();
  workbox.clientsClaim();
  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "registerSW.js",
    "revision": "402b66900e731ca748771b6fc5e7a068"
  }, {
    "url": "pwa-maskable-512x512.png",
    "revision": "3e978248d8e54c63afb6db952da873ce"
  }, {
    "url": "pwa-512x512.png",
    "revision": "3e978248d8e54c63afb6db952da873ce"
  }, {
    "url": "pwa-192x192.png",
    "revision": "509406264a02be4b3ac0b9dd89f4559d"
  }, {
    "url": "og-image.svg",
    "revision": "effabeb0303f1e0c19d0fbd79137f190"
  }, {
    "url": "og-image.png",
    "revision": "731a20e32173b861b74ca3928ff83fc3"
  }, {
    "url": "index.html",
    "revision": "f088cd5223313c8c5502833e04c33be0"
  }, {
    "url": "icon.svg",
    "revision": "63fc5de6c0a486a75d2c5c3956f28e3a"
  }, {
    "url": "favicon.ico",
    "revision": "90be07376bde8feeada072c60b961d8a"
  }, {
    "url": "apple-touch-icon.png",
    "revision": "41192bd6d431145ba3b5203287f023c0"
  }, {
    "url": "404.html",
    "revision": "e0cf1de63037ee5a628eb5e47ddee2d3"
  }, {
    "url": "assets/supabase-vendor-s3XNS0mn.js",
    "revision": null
  }, {
    "url": "assets/react-vendor-CPC14Yq_.js",
    "revision": null
  }, {
    "url": "assets/index-DefO5-JN.js",
    "revision": null
  }, {
    "url": "assets/index-DKknxdL5.css",
    "revision": null
  }, {
    "url": "apple-touch-icon.png",
    "revision": "41192bd6d431145ba3b5203287f023c0"
  }, {
    "url": "favicon.ico",
    "revision": "90be07376bde8feeada072c60b961d8a"
  }, {
    "url": "icon.svg",
    "revision": "63fc5de6c0a486a75d2c5c3956f28e3a"
  }, {
    "url": "pwa-192x192.png",
    "revision": "509406264a02be4b3ac0b9dd89f4559d"
  }, {
    "url": "pwa-512x512.png",
    "revision": "3e978248d8e54c63afb6db952da873ce"
  }, {
    "url": "pwa-maskable-512x512.png",
    "revision": "3e978248d8e54c63afb6db952da873ce"
  }, {
    "url": "manifest.webmanifest",
    "revision": "412963a17aa032039be9d1cc97dd1286"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("index.html"), {
    denylist: [/^\/api/, /supabase\.co/]
  }));

}));
