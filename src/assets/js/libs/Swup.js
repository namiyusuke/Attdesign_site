import Swup from "swup";
import SwupJsPlugin from "@swup/js-plugin";
import SwupHeadPlugin from "@swup/head-plugin";
import SwupScriptsPlugin from "@swup/scripts-plugin";
import { BulgeImage } from "./BulgeImage";
import { LeafShadow } from "./LeafShadow";
import { initMenuController } from "./MenuController";
import { initPhotoGallery } from "./PhotoGallery";
import { MenuFilter } from "./MenuFilter";
import { WebGL } from "./WebGL";
// グローバルにインスタンスを保持
let bulgeInstance = null;
let leafShadowInstance = null;

function initLeafShadow() {
  requestAnimationFrame(() => {
    const canvas = document.getElementById("leaf-shadow-canvas");
    if (!canvas) return;

    // 既存のインスタンスがあれば破棄
    if (leafShadowInstance) {
      leafShadowInstance.destroy();
      leafShadowInstance = null;
    }

    leafShadowInstance = new LeafShadow(canvas);
  });
}

function updateTimeOverlay() {
  const overlay = document.getElementById("time-overlay");
  if (!overlay) return;

  const hour = new Date().getHours();

  // 既存のクラスをリセット
  overlay.classList.remove("is-morning", "is-daytime", "is-evening", "is-night");

  if (hour >= 5 && hour < 10) {
    // 朝 (5:00 - 10:00)
    overlay.classList.add("is-morning");
  } else if (hour >= 10 && hour < 17) {
    // 昼 (10:00 - 17:00)
    overlay.classList.add("is-daytime");
  } else if (hour >= 17 && hour < 19) {
    // 夕方 (17:00 - 19:00)
    overlay.classList.add("is-evening");
  } else {
    // 夜 (19:00 - 5:00)
    overlay.classList.add("is-night");
  }
}

function initBulgeImage() {
  requestAnimationFrame(() => {
    const container = document.getElementById("bulge-container");
    if (!container) return;

    const imageUrl = container.dataset.imageUrl;
    if (!imageUrl) return;

    // 既存のインスタンスがあれば破棄
    if (bulgeInstance) {
      bulgeInstance.destroy();
      bulgeInstance = null;
    }

    bulgeInstance = new BulgeImage(container, imageUrl);
  });
}

export default function swupFunc() {
  const swup = new Swup({
    plugins: [
      new SwupHeadPlugin({
        persistAssets: true,
      }),
      new SwupScriptsPlugin({
        head: true,
        body: true,
      }),
      new SwupJsPlugin({
        animations: [
          {
            from: "(.*)",
            to: "(.*)",
            in: async () => {
              // シャッターアニメーション後はシャッターをリセット
              const shutterOverlay = document.getElementById("shutter-overlay");
              if (shutterOverlay && shutterOverlay.classList.contains("-is-active")) {
                shutterOverlay.classList.remove("-is-active");
                shutterOverlay.style.opacity = "";
              }
              const container = document.querySelector("#swup");
              await container.animate([{ opacity: 0 }, { opacity: 1 }], 250).finished;
            },
            out: async () => {
              // シャッターアニメーション中はoutアニメーションをスキップ
              const shutterOverlay = document.getElementById("shutter-overlay");
              if (shutterOverlay && shutterOverlay.classList.contains("-is-active")) {
                return;
              }
              const container = document.querySelector("#swup");
              await container.animate([{ opacity: 1 }, { opacity: 0 }], 250).finished;
            },
          },
        ],
      }),
    ],
  });
  let webglInstance;
  function initWebGL(skipIntro = false) {
    const canvas = document.getElementById("webgl");
    if (!canvas) return;

    // window.__PHOTO_DATA__が設定されるまでポーリング
    let attempts = 0;
    const maxAttempts = 20;

    function tryInit() {
      attempts++;

      if (window.__PHOTO_DATA__ && window.__PHOTO_DATA__.length > 0) {
        if (webglInstance) {
          webglInstance.destroy();
        }
        webglInstance = new WebGL(canvas, skipIntro);
      } else if (attempts < maxAttempts) {
        setTimeout(tryInit, 50);
      } else {
      }
    }

    tryInit();
  }

  // ページ遷移完了後に初期化
  swup.hooks.on("page:view", () => {
    initBulgeImage();
    initLeafShadow();
    updateTimeOverlay();
    initMenuController();
    initPhotoGallery();
    initWebGL(true); // swup遷移時はイントロをスキップ
    MenuFilter();
    document.documentElement.classList.add("swup-load");
    // if ( document.documentElement.contains('swup-load')) {
    //    setTimeout(() => {
    //   document.documentElement.classList.remove('swup-load')
    // },500)
    // }
  });

  // 初回ロード時もチェック
  initBulgeImage();
  MenuFilter();
  initLeafShadow();
  updateTimeOverlay();
  initWebGL(false);
  // DOMContentLoadedを確認
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      initPhotoGallery();
    });
  } else {
    initPhotoGallery();
    document.documentElement.classList.add("swup-load");
    // if ( document.documentElement.contains('swup-load')) {
    //    setTimeout(() => {
    //   document.documentElement.classList.remove('swup-load');
    // },500)
    // }
  }

  // グローバルに公開（WebGLなどからナビゲーションに使用）
  window.swup = swup;
}
