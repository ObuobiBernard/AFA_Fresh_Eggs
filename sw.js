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
    "revision": "a763c702ac31c43b433b5b45ecef2e2b"
  }, {
    "url": "pwa-512x512.png",
    "revision": "abfd2a60d4128672a7aa434df84e2aef"
  }, {
    "url": "pwa-192x192.png",
    "revision": "9949aa543efca7ca0b0ed49e338d144f"
  }, {
    "url": "index.html",
    "revision": "258400e3207bbbdc7409ef654a1460af"
  }, {
    "url": "icon.svg",
    "revision": "c5472a07a029cb56aa77797510f91163"
  }, {
    "url": "favicon.ico",
    "revision": "d3d3b980920869c6e0a1c28dd75dd359"
  }, {
    "url": "apple-touch-icon.png",
    "revision": "49ceee345f353ea0f4ac957a3c8440ea"
  }, {
    "url": "assets/index-DJJZ7zvU.js",
    "revision": null
  }, {
    "url": "assets/index-0PUZ6QiW.css",
    "revision": null
  }, {
    "url": "apple-touch-icon.png",
    "revision": "49ceee345f353ea0f4ac957a3c8440ea"
  }, {
    "url": "favicon.ico",
    "revision": "d3d3b980920869c6e0a1c28dd75dd359"
  }, {
    "url": "icon.svg",
    "revision": "c5472a07a029cb56aa77797510f91163"
  }, {
    "url": "pwa-192x192.png",
    "revision": "9949aa543efca7ca0b0ed49e338d144f"
  }, {
    "url": "pwa-512x512.png",
    "revision": "abfd2a60d4128672a7aa434df84e2aef"
  }, {
    "url": "pwa-maskable-512x512.png",
    "revision": "a763c702ac31c43b433b5b45ecef2e2b"
  }, {
    "url": "assets/bernard.jpg",
    "revision": "02342e71edcd59b2dbdefaa10a0b3efd"
  }, {
    "url": "manifest.webmanifest",
    "revision": "412963a17aa032039be9d1cc97dd1286"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("index.html"), {
    denylist: [/^\/api/, /supabase\.co/]
  }));

}));
