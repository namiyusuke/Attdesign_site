import * as THREE from "three";

// グローバル変数の型定義
declare global {
  interface Window {
    __PHOTO_DATA__?: Array<{ imageUrl: string; linkUrl: string }>;
    swup?: {
      navigate: (url: string) => void;
      hooks: {
        on: (event: string, callback: () => void) => void;
      };
    };
  }
}

const ATLAS_COLS = 5;
const ATLAS_ROWS = 2;
const baseRepeat = 3;

export class WebGL {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private geometry: THREE.PlaneGeometry;
  private material: THREE.ShaderMaterial;
  private mesh: THREE.Mesh;
  private canvas: HTMLCanvasElement;
  private atlasTexture: THREE.CanvasTexture | null = null;

  // microCMSから取得した画像データ
  private imagePaths: string[] = [];
  private imageURLs: string[] = [];

  // アニメーション用の変数
  private offset = { x: 0, y: 0 };
  private velocity = { x: 0, y: 0 };
  private isDragging = false;
  private lastMousePos = { x: 0, y: 0 };
  private friction = 0.95;

  // ギャップ・奥行きアニメーション用
  private currentGap = 0;
  private currentDepth = 0;
  private gapSmoothing = 0.1;
  private depthSmoothing = 0.08;

  // イベントリスナーのバインド
  private boundOnResize: () => void;
  private boundOnMouseDown: (e: MouseEvent) => void;
  private boundOnMouseMove: (e: MouseEvent) => void;
  private boundOnMouseUp: () => void;
  private boundOnMouseLeave: () => void;
  private boundOnTouchStart: (e: TouchEvent) => void;
  private boundOnTouchMove: (e: TouchEvent) => void;
  private boundOnTouchEnd: () => void;
  private boundOnWheel: (e: WheelEvent) => void;
  private boundOnClick: (e: MouseEvent) => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    // microCMSから取得したデータを使用
    const photoData = window.__PHOTO_DATA__ || [];
    this.imagePaths = photoData.map((p) => p.imageUrl);
    this.imageURLs = photoData.map((p) => p.linkUrl);

    // イベントリスナーをバインド
    this.boundOnResize = this.onResize.bind(this);
    this.boundOnMouseDown = this.onMouseDown.bind(this);
    this.boundOnMouseMove = this.onMouseMove.bind(this);
    this.boundOnMouseUp = this.onMouseUp.bind(this);
    this.boundOnMouseLeave = this.onMouseLeave.bind(this);
    this.boundOnTouchStart = this.onTouchStart.bind(this);
    this.boundOnTouchMove = this.onTouchMove.bind(this);
    this.boundOnTouchEnd = this.onTouchEnd.bind(this);
    this.boundOnWheel = this.onWheel.bind(this);
    this.boundOnClick = this.onClick.bind(this);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);

    // Scene
    this.scene = new THREE.Scene();

    // Camera (Orthographic)
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    this.camera.position.z = 1;

    // Geometry
    this.geometry = new THREE.PlaneGeometry(2, 2);

    // Material
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        u_texture: { value: null },
        u_offset: { value: new THREE.Vector2(0, 0) },
        u_repeat: { value: new THREE.Vector2(baseRepeat, baseRepeat) },
        u_gap: { value: 0.0 },
        u_depth: { value: 0.0 },
        u_imageCount: { value: 10.0 },
        u_atlasCols: { value: 5.0 },
        u_atlasRows: { value: 2.0 },
      },
      vertexShader: `
        varying vec2 v_uv;
        void main() {
          v_uv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        precision mediump float;
        varying vec2 v_uv;
        uniform sampler2D u_texture;
        uniform vec2 u_offset;
        uniform vec2 u_repeat;
        uniform float u_gap;
        uniform float u_depth;
        uniform float u_imageCount;
        uniform float u_atlasCols;
        uniform float u_atlasRows;

        void main() {
          // 画面中心からの距離
          vec2 centered = v_uv - 0.5;
          float distFromCenter = length(centered);

          // 奥行き効果
          float depthStrength = u_depth * 0.3;
          vec2 depthWarp = centered * (1.0 - depthStrength * distFromCenter * 2.0);
          vec2 warpedUV = depthWarp + 0.5;

          // タイリング用のUV
          vec2 uv = warpedUV * u_repeat + u_offset;

          // タイルのインデックス
          vec2 tileIndex = floor(uv);

          // タイル内のローカルUV
          vec2 tileUV = fract(uv);

          // ギャップを適用
          float gap = u_gap * 0.09;
          vec2 scaledUV = (tileUV - 0.5) / (1.0 - gap * 2.0) + 0.5;

          // タイル外かどうかチェック
          bool isOutside = scaledUV.x < 0.0 || scaledUV.x > 1.0 || scaledUV.y < 0.0 || scaledUV.y > 1.0;

          vec4 color;
          if (isOutside) {
            color = vec4(1., 1., 1., 1.0);
          } else {
            // XとY座標を組み合わせて決定（縦横で異なる画像になる）
            float indexFloat = mod(tileIndex.x + tileIndex.y * u_atlasCols, u_imageCount);
            int imageIndex = int(indexFloat);

            // アトラス内の位置を計算（5x2グリッド）
            float atlasCol = mod(float(imageIndex), u_atlasCols);
            float atlasRow = floor(float(imageIndex) / u_atlasCols);

            // アトラスUVを計算（Y座標を反転）
            vec2 atlasUV = vec2(
              (atlasCol + scaledUV.x) / u_atlasCols,
              ((u_atlasRows - 1.0 - atlasRow) + scaledUV.y) / u_atlasRows
            );

            color = texture2D(u_texture, atlasUV);
          }

          // トンネル効果
          color.rgb *= 1.0 - u_depth * 0.2;

          gl_FragColor = color;
        }
      `,
    });

    // Mesh
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.scene.add(this.mesh);

    // Events
    window.addEventListener("resize", this.boundOnResize);
    this.canvas.addEventListener("mousedown", this.boundOnMouseDown);
    this.canvas.addEventListener("mousemove", this.boundOnMouseMove);
    this.canvas.addEventListener("mouseup", this.boundOnMouseUp);
    this.canvas.addEventListener("mouseleave", this.boundOnMouseLeave);
    this.canvas.addEventListener("touchstart", this.boundOnTouchStart);
    this.canvas.addEventListener("touchmove", this.boundOnTouchMove);
    this.canvas.addEventListener("touchend", this.boundOnTouchEnd);
    this.canvas.addEventListener("wheel", this.boundOnWheel);
    this.canvas.addEventListener("click", this.boundOnClick);

    // Load images and start
    this.loadAllImages();
  }

  private createTextureAtlas(images: (HTMLImageElement | HTMLCanvasElement)[]): THREE.CanvasTexture {
    const atlasWidth = 2560; // 512 * 5
    const atlasHeight = 1024; // 512 * 2
    const tileWidth = atlasWidth / ATLAS_COLS;
    const tileHeight = atlasHeight / ATLAS_ROWS;

    const atlasCanvas = document.createElement("canvas");
    atlasCanvas.width = atlasWidth;
    atlasCanvas.height = atlasHeight;
    const ctx = atlasCanvas.getContext("2d")!;

    // 背景を暗い色に
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, atlasWidth, atlasHeight);

    // 各画像をcover方式で配置（タイル全体を埋める）
    images.forEach((img, index) => {
      const col = index % ATLAS_COLS;
      const row = Math.floor(index / ATLAS_COLS);
      const x = col * tileWidth;
      const y = row * tileHeight;

      const imgAspect = img.width / img.height;
      const tileAspect = tileWidth / tileHeight;

      // cover方式（タイル全体を埋める、アスペクト比を保持）
      let drawWidth: number, drawHeight: number, drawX: number, drawY: number;
      if (imgAspect > tileAspect) {
        // 画像がタイルより横長 → 縦を合わせて横をはみ出す
        drawHeight = tileHeight;
        drawWidth = tileHeight * imgAspect;
        drawX = x - (drawWidth - tileWidth) / 2;
        drawY = y;
      } else {
        // 画像がタイルより縦長 → 横を合わせて縦をはみ出す
        drawWidth = tileWidth;
        drawHeight = tileWidth / imgAspect;
        drawX = x;
        drawY = y - (drawHeight - tileHeight) / 2;
      }

      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, tileWidth, tileHeight);
      ctx.clip();
      ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
      ctx.restore();
    });

    const texture = new THREE.CanvasTexture(atlasCanvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    return texture;
  }

  private loadAllImages(): void {
    const promises = this.imagePaths.map((path: string) => {
      return new Promise<HTMLImageElement | HTMLCanvasElement>((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous"; // CORS対応
        img.onload = () => resolve(img);
        img.onerror = () => {
          const dummy = document.createElement("canvas");
          dummy.width = 100;
          dummy.height = 100;
          const ctx = dummy.getContext("2d")!;
          ctx.fillStyle = "#333";
          ctx.fillRect(0, 0, 100, 100);
          resolve(dummy);
        };
        img.src = path;
      });
    });

    Promise.all(promises).then((images) => {
      this.atlasTexture = this.createTextureAtlas(images);
      this.material.uniforms.u_texture.value = this.atlasTexture;
      this.updateAspect();
      this.animate();
    });
  }

  private updateAspect(): void {
    const screenAspect = window.innerWidth / window.innerHeight;
    if (screenAspect > 1) {
      this.material.uniforms.u_repeat.value.set(baseRepeat * screenAspect, baseRepeat);
    } else {
      this.material.uniforms.u_repeat.value.set(baseRepeat, baseRepeat / screenAspect);
    }
  }

  private onResize(): void {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.updateAspect();
  }

  private onMouseDown(e: MouseEvent): void {
    this.isDragging = true;
    this.lastMousePos.x = e.clientX;
    this.lastMousePos.y = e.clientY;
    this.velocity.x = 0;
    this.velocity.y = 0;
  }

  private onMouseMove(e: MouseEvent): void {
    if (this.isDragging) {
      const deltaX = e.clientX - this.lastMousePos.x;
      const deltaY = e.clientY - this.lastMousePos.y;

      this.velocity.x = deltaX * 0.002;
      this.velocity.y = -deltaY * 0.002;

      this.offset.x += this.velocity.x;
      this.offset.y += this.velocity.y;

      this.lastMousePos.x = e.clientX;
      this.lastMousePos.y = e.clientY;
    }
  }

  private onMouseUp(): void {
    this.isDragging = false;
  }

  private onMouseLeave(): void {
    this.isDragging = false;
  }

  private onTouchStart(e: TouchEvent): void {
    e.preventDefault();
    this.isDragging = true;
    const touch = e.touches[0];
    this.lastMousePos.x = touch.clientX;
    this.lastMousePos.y = touch.clientY;
    this.velocity.x = 0;
    this.velocity.y = 0;
  }

  private onTouchMove(e: TouchEvent): void {
    e.preventDefault();
    if (this.isDragging) {
      const touch = e.touches[0];
      const deltaX = touch.clientX - this.lastMousePos.x;
      const deltaY = touch.clientY - this.lastMousePos.y;

      this.velocity.x = deltaX * 0.002;
      this.velocity.y = -deltaY * 0.002;

      this.offset.x += this.velocity.x;
      this.offset.y += this.velocity.y;

      this.lastMousePos.x = touch.clientX;
      this.lastMousePos.y = touch.clientY;
    }
  }

  private onTouchEnd(): void {
    this.isDragging = false;
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    this.velocity.x += e.deltaX * 0.0002;
    this.velocity.y -= e.deltaY * 0.0002;
  }

  private onClick(e: MouseEvent): void {
    // クリック位置を0〜1のUV座標に変換
    const rect = this.canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = 1.0 - (e.clientY - rect.top) / rect.height; // 上下反転

    // 画面中心からの距離（奥行き効果の計算）
    const centered_x = x - 0.5;
    const centered_y = y - 0.5;
    const distFromCenter = Math.sqrt(centered_x * centered_x + centered_y * centered_y);

    // 奥行きワープを適用（シェーダーと同じ）
    const depthStrength = 0; // this.currentDepth * 0.3;
    const warpFactor = 1.0 - depthStrength * distFromCenter * 2.0;
    const warpedX = centered_x * warpFactor + 0.5;
    const warpedY = centered_y * warpFactor + 0.5;

    // リピート倍率を取得
    const repeatX = this.material.uniforms.u_repeat.value.x;
    const repeatY = this.material.uniforms.u_repeat.value.y;

    // UV座標を計算
    const uv_x = warpedX * repeatX + this.offset.x;
    const uv_y = warpedY * repeatY + this.offset.y;

    // タイルのインデックス
    const tileIndexX = Math.floor(uv_x);
    const tileIndexY = Math.floor(uv_y);

    // タイル内のローカルUV
    const tileUV_x = uv_x - tileIndexX;
    const tileUV_y = uv_y - tileIndexY;

    // ギャップチェック（タイルの隙間をクリックした場合は無視）
    const gap = this.currentGap * 0.09;
    const scaledUV_x = (tileUV_x - 0.5) / (1.0 - gap * 2.0) + 0.5;
    const scaledUV_y = (tileUV_y - 0.5) / (1.0 - gap * 2.0) + 0.5;

    // タイル外（隙間）をクリックした場合は何もしない
    if (scaledUV_x < 0.0 || scaledUV_x > 1.0 || scaledUV_y < 0.0 || scaledUV_y > 1.0) {
      return;
    }

    // XとY座標を組み合わせて決定（シェーダーと同じ計算）
    const calcValue = tileIndexX + tileIndexY * 5;
    const imageIndex = ((calcValue % 10) + 10) % 10;

    // デバッグ情報を表示
    console.log("=== クリック情報 ===");
    console.log("クリック座標(画面):", e.clientX.toFixed(0), e.clientY.toFixed(0));
    console.log("UV座標:", x.toFixed(4), y.toFixed(4));
    console.log("currentDepth:", this.currentDepth.toFixed(4));
    console.log("奥行きワープ後:", warpedX.toFixed(4), warpedY.toFixed(4));
    console.log("repeat:", repeatX.toFixed(2), repeatY.toFixed(2));
    console.log("offset:", this.offset.x.toFixed(4), this.offset.y.toFixed(4));
    console.log("最終UV:", uv_x.toFixed(4), uv_y.toFixed(4));
    console.log("タイル位置:", tileIndexX, tileIndexY);
    console.log("計算（X+Y*5）:", `${tileIndexX} + ${tileIndexY} * 5 = ${calcValue}`);
    console.log("最終:", `((${calcValue} % 10) + 10) % 10 = ${imageIndex}`);
    console.log("画像:", this.imagePaths[imageIndex]);
    console.log("URL:", this.imageURLs[imageIndex]);
    console.log("==================");

    // 対応するURLに飛ぶ（swup経由でアニメーション遷移）
    if (this.imageURLs[imageIndex]) {
      if (window.swup) {
        window.swup.navigate(this.imageURLs[imageIndex]);
      } else {
        window.location.href = this.imageURLs[imageIndex];
      }
    }
  }

  private animate(): void {
    requestAnimationFrame(this.animate.bind(this));

    this.offset.x += 0.003;

    // 慣性を適用
    if (!this.isDragging) {
      this.offset.x += this.velocity.x;
      this.offset.y += this.velocity.y;
      this.velocity.x *= this.friction;
      this.velocity.y *= this.friction;
    }

    // 速度の大きさを計算
    const speed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y);

    // 目標ギャップ値
    const targetGap = Math.min(speed * 20, 1.0);

    // 目標奥行き値
    const targetDepth = Math.min(speed * 15, 1.0);

    // 滑らかに補間
    this.currentGap += (targetGap - this.currentGap) * this.gapSmoothing;
    this.currentDepth += (targetDepth - this.currentDepth) * this.depthSmoothing;

    // シェーダーのuniformを更新
    this.material.uniforms.u_offset.value.set(this.offset.x, this.offset.y);
    this.material.uniforms.u_gap.value = this.currentGap;
    this.material.uniforms.u_depth.value = this.currentDepth;

    this.renderer.render(this.scene, this.camera);
  }

  public destroy(): void {
    window.removeEventListener("resize", this.boundOnResize);
    this.canvas.removeEventListener("mousedown", this.boundOnMouseDown);
    this.canvas.removeEventListener("mousemove", this.boundOnMouseMove);
    this.canvas.removeEventListener("mouseup", this.boundOnMouseUp);
    this.canvas.removeEventListener("mouseleave", this.boundOnMouseLeave);
    this.canvas.removeEventListener("touchstart", this.boundOnTouchStart);
    this.canvas.removeEventListener("touchmove", this.boundOnTouchMove);
    this.canvas.removeEventListener("touchend", this.boundOnTouchEnd);
    this.canvas.removeEventListener("wheel", this.boundOnWheel);
    this.canvas.removeEventListener("click", this.boundOnClick);

    if (this.atlasTexture) {
      this.atlasTexture.dispose();
    }
    this.geometry.dispose();
    this.material.dispose();
    this.renderer.dispose();
  }
}
