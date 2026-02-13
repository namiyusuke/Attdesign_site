import * as THREE from "three";
import gsap from "gsap";

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

const baseRepeat = 3;
const TILE_SIZE = 512;

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

  // クリック時のアニメーション用
  private isAnimating = false;

  // タップ判定用
  private touchStartPos = { x: 0, y: 0 };

  // ホバーアニメーション用
  private hoveredTile = { x: -9999, y: -9999 };
  private hoverScale = 1.0;
  private hoverTween: gsap.core.Tween | null = null;
  // 離れるタイルのフェードアウト用
  private prevHoveredTile = { x: -9999, y: -9999 };
  private prevHoverScale = 1.0;
  private prevHoverTween: gsap.core.Tween | null = null;

  // アトラス・タイル配置用
  private atlasCols = 4;
  private atlasRows = 4;
  private tileStride = 9;
  private imageCount = 0;

  // イントロアニメーション用
  private isIntro = true;
  private skipIntro = false;

  // イベントリスナーのバインド
  private boundOnResize: () => void;
  private boundOnMouseDown: (e: MouseEvent) => void;
  private boundOnMouseMove: (e: MouseEvent) => void;
  private boundOnMouseUp: () => void;
  private boundOnMouseLeave: () => void;
  private boundOnTouchStart: (e: TouchEvent) => void;
  private boundOnTouchMove: (e: TouchEvent) => void;
  private boundOnTouchEnd: (e: TouchEvent) => void;
  private boundOnWheel: (e: WheelEvent) => void;
  private boundOnClick: (e: MouseEvent) => void;

  constructor(canvas: HTMLCanvasElement, skipIntro = false) {
    this.canvas = canvas;
    this.skipIntro = skipIntro;

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
        u_resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        u_gap: { value: 0.0 },
        u_baseGap: { value: 2.0 }, // 固定の隙間（ピクセル）
        u_depth: { value: 0.0 },
        u_imageCount: { value: 16.0 },
        u_atlasCols: { value: 4.0 },
        u_atlasRows: { value: 4.0 },
        u_tileStride: { value: 9.0 },
        u_bulge: { value: 1.0 },
        u_hoverTile: { value: new THREE.Vector2(-9999, -9999) },
        u_hoverScale: { value: 1.0 },
        u_prevHoverTile: { value: new THREE.Vector2(-9999, -9999) },
        u_prevHoverScale: { value: 1.0 },
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
        uniform vec2 u_resolution;
        uniform float u_gap;
        uniform float u_baseGap;
        uniform float u_depth;
        uniform float u_imageCount;
        uniform float u_atlasCols;
        uniform float u_atlasRows;
        uniform float u_tileStride;
        uniform float u_bulge;
        uniform vec2 u_hoverTile;
        uniform float u_hoverScale;
        uniform vec2 u_prevHoverTile;
        uniform float u_prevHoverScale;

        // バルジ（魚眼）歪曲関数
        const float bulgeRadius = 0.5;
        const float bulgeStrength = 0.9;

        vec2 bulge(vec2 uv) {
          float dist = length(uv) / bulgeRadius;
          float distPow = pow(dist, 2.0);
          float strengthAmount = bulgeStrength / (1.0 + distPow);
          uv *= strengthAmount;
          return uv;
        }

        void main() {
          // === バルジ歪曲をUV全体に適用 ===
          vec2 centeredRaw = v_uv - 0.5;
          vec2 bulgedRaw = bulge(centeredRaw);
          // u_bulgeが1.0のとき最大歪曲、0.0のとき歪曲なし
          vec2 baseUV = mix(v_uv, bulgedRaw + 0.5, u_bulge);

          // 画面中心からの距離
          vec2 centered = baseUV - 0.5;
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

          // ギャップを適用（固定ピクセル + 速度による動的ギャップ）
          vec2 tileSize = u_resolution / u_repeat;
          float baseGapUV = u_baseGap / min(tileSize.x, tileSize.y);
          float dynamicGap = u_gap * 0.09;
          float gap = baseGapUV + dynamicGap;
          vec2 scaledUV = (tileUV - 0.5) / (1.0 - gap * 2.0) + 0.5;

          // タイル外かどうかチェック（ホバースケール適用前にgap判定）
          bool isOutside = scaledUV.x < 0.0 || scaledUV.x > 1.0 || scaledUV.y < 0.0 || scaledUV.y > 1.0;

          // ホバー中のタイルなら画像をスケール（テクスチャ参照のみ、gap判定には影響しない）
          bool isHovered = (tileIndex.x == u_hoverTile.x && tileIndex.y == u_hoverTile.y);
          bool isPrevHovered = (tileIndex.x == u_prevHoverTile.x && tileIndex.y == u_prevHoverTile.y);
          if (isHovered && u_hoverScale > 1.001) {
            scaledUV = (scaledUV - 0.5) / u_hoverScale + 0.5;
          } else if (isPrevHovered && u_prevHoverScale > 1.001) {
            scaledUV = (scaledUV - 0.5) / u_prevHoverScale + 0.5;
          }

          vec4 color;
          if (isOutside) {
            color = vec4(0.922, 0.922, 0.922, 1.0);
          } else {
            // XとY座標を組み合わせて決定（隣接タイルで被らないようストライド値を使用）
            float indexFloat = mod(tileIndex.x + tileIndex.y * u_tileStride, u_imageCount);
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
    const atlasWidth = this.atlasCols * TILE_SIZE;
    const atlasHeight = this.atlasRows * TILE_SIZE;
    const tileWidth = TILE_SIZE;
    const tileHeight = TILE_SIZE;

    const atlasCanvas = document.createElement("canvas");
    atlasCanvas.width = atlasWidth;
    atlasCanvas.height = atlasHeight;
    const ctx = atlasCanvas.getContext("2d")!;

    // 背景を暗い色に
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, atlasWidth, atlasHeight);

    // 各画像をcover方式で配置（タイル全体を埋める）
    images.forEach((img, index) => {
      const col = index % this.atlasCols;
      const row = Math.floor(index / this.atlasCols);
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
      // 画像枚数に応じてアトラスのグリッドサイズを計算
      this.imageCount = images.length;
      this.atlasCols = Math.ceil(Math.sqrt(this.imageCount));
      this.atlasRows = Math.ceil(this.imageCount / this.atlasCols);
      this.tileStride = this.computeTileStride(this.imageCount);

      // uniformを更新
      this.material.uniforms.u_imageCount.value = this.imageCount;
      this.material.uniforms.u_atlasCols.value = this.atlasCols;
      this.material.uniforms.u_atlasRows.value = this.atlasRows;
      this.material.uniforms.u_tileStride.value = this.tileStride;

      this.atlasTexture = this.createTextureAtlas(images);
      this.material.uniforms.u_texture.value = this.atlasTexture;
      this.updateAspect();
      this.animate();
      this.playIntroAnimation();
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
    this.material.uniforms.u_resolution.value.set(window.innerWidth, window.innerHeight);
    this.updateAspect();
  }

  private onMouseDown(e: MouseEvent): void {
    if (this.isIntro) return;
    this.isDragging = true;
    this.lastMousePos.x = e.clientX;
    this.lastMousePos.y = e.clientY;
    this.velocity.x = 0;
    this.velocity.y = 0;
    this.clearHover();
  }

  private screenToTile(clientX: number, clientY: number): { x: number; y: number } | null {
    const rect = this.canvas.getBoundingClientRect();
    const x = (clientX - rect.left) / rect.width;
    const y = 1.0 - (clientY - rect.top) / rect.height;

    const repeatX = this.material.uniforms.u_repeat.value.x;
    const repeatY = this.material.uniforms.u_repeat.value.y;

    const uv_x = x * repeatX + this.offset.x;
    const uv_y = y * repeatY + this.offset.y;

    const tileIndexX = Math.floor(uv_x);
    const tileIndexY = Math.floor(uv_y);

    // ギャップ内かチェック
    const tileUV_x = uv_x - tileIndexX;
    const tileUV_y = uv_y - tileIndexY;
    const gap = this.currentGap * 0.09;
    const scaledUV_x = (tileUV_x - 0.5) / (1.0 - gap * 2.0) + 0.5;
    const scaledUV_y = (tileUV_y - 0.5) / (1.0 - gap * 2.0) + 0.5;

    if (scaledUV_x < 0.0 || scaledUV_x > 1.0 || scaledUV_y < 0.0 || scaledUV_y > 1.0) {
      return null;
    }

    return { x: tileIndexX, y: tileIndexY };
  }

  private animatePrevOut(): void {
    // 前のtweenをキャンセル
    if (this.prevHoverTween) this.prevHoverTween.kill();

    // 現在のホバータイルとスケールをprevに引き継ぐ
    this.prevHoveredTile = { ...this.hoveredTile };
    this.prevHoverScale = this.hoverScale;
    this.material.uniforms.u_prevHoverTile.value.set(this.prevHoveredTile.x, this.prevHoveredTile.y);
    this.material.uniforms.u_prevHoverScale.value = this.prevHoverScale;

    // prevをスケールダウンアニメーション
    this.prevHoverTween = gsap.to(this, {
      prevHoverScale: 1.0,
      duration: 0.3,
      ease: "power2.out",
      onUpdate: () => {
        this.material.uniforms.u_prevHoverScale.value = this.prevHoverScale;
      },
      onComplete: () => {
        this.prevHoveredTile = { x: -9999, y: -9999 };
        this.material.uniforms.u_prevHoverTile.value.set(-9999, -9999);
      },
    });
  }

  private updateHover(clientX: number, clientY: number): void {
    if (this.isAnimating || this.isIntro || this.isDragging) {
      this.clearHover();
      return;
    }

    const tile = this.screenToTile(clientX, clientY);
    if (!tile) {
      this.clearHover();
      return;
    }

    // 同じタイルなら何もしない
    if (tile.x === this.hoveredTile.x && tile.y === this.hoveredTile.y) return;

    // 既にホバー中のタイルがあればprevとしてフェードアウト
    if (this.hoveredTile.x !== -9999) {
      this.animatePrevOut();
    }

    // 現在のtweenをキャンセル
    if (this.hoverTween) this.hoverTween.kill();

    // 新しいタイルをスケールアップ
    this.hoverScale = 1.0;
    this.material.uniforms.u_hoverScale.value = 1.0;
    this.hoveredTile = tile;
    this.material.uniforms.u_hoverTile.value.set(tile.x, tile.y);

    this.hoverTween = gsap.to(this, {
      hoverScale: 1.07,
      duration: 0.4,
      ease: "power2.out",
      onUpdate: () => {
        this.material.uniforms.u_hoverScale.value = this.hoverScale;
      },
    });
  }

  private clearHover(): void {
    if (this.hoveredTile.x === -9999) return;

    // 現在のホバーをprevに移してフェードアウト
    if (this.hoverTween) this.hoverTween.kill();
    this.animatePrevOut();

    // 現在のホバーをリセット
    this.hoveredTile = { x: -9999, y: -9999 };
    this.hoverScale = 1.0;
    this.material.uniforms.u_hoverTile.value.set(-9999, -9999);
    this.material.uniforms.u_hoverScale.value = 1.0;
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
    } else {
      this.updateHover(e.clientX, e.clientY);
    }
  }

  private onMouseUp(): void {
    this.isDragging = false;
  }

  private onMouseLeave(): void {
    this.isDragging = false;
    this.clearHover();
  }

  private onTouchStart(e: TouchEvent): void {
    e.preventDefault();
    if (this.isIntro) return;
    this.isDragging = true;
    const touch = e.touches[0];
    this.lastMousePos.x = touch.clientX;
    this.lastMousePos.y = touch.clientY;
    this.touchStartPos.x = touch.clientX;
    this.touchStartPos.y = touch.clientY;
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

  private onTouchEnd(e: TouchEvent): void {
    this.isDragging = false;

    // タップ判定: ドラッグ距離が小さければタップとみなす
    const touch = e.changedTouches[0];
    const dx = touch.clientX - this.touchStartPos.x;
    const dy = touch.clientY - this.touchStartPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 10) {
      // MouseEventを合成してonClickに渡す
      const syntheticEvent = new MouseEvent("click", {
        clientX: touch.clientX,
        clientY: touch.clientY,
      });
      this.onClick(syntheticEvent);
    }
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    if (this.isIntro) return;
    this.velocity.x += e.deltaX * 0.0002;
    this.velocity.y -= e.deltaY * 0.0002;
  }

  private onClick(e: MouseEvent): void {
    // アニメーション中・イントロ中はクリックを無視
    if (this.isAnimating || this.isIntro) return;

    // クリック位置を0〜1のUV座標に変換
    const rect = this.canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = 1.0 - (e.clientY - rect.top) / rect.height; // 上下反転

    // 画面中心からの距離（奥行き効果の計算）
    const centered_x = x - 0.5;
    const centered_y = y - 0.5;
    const distFromCenter = Math.sqrt(centered_x * centered_x + centered_y * centered_y);

    // 奥行きワープを適用（シェーダーと同じ）
    const depthStrength = 0;
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
    const calcValue = tileIndexX + tileIndexY * this.tileStride;
    const imageIndex = ((calcValue % this.imageCount) + this.imageCount) % this.imageCount;

    // 遷移先URLとimage URLを取得
    const targetUrl = this.imageURLs[imageIndex];
    const imageUrl = this.imagePaths[imageIndex];
    if (!targetUrl || !imageUrl) return;

    // クリック位置でのタイルの画面上の矩形を計算
    const tileLeft = (tileIndexX - this.offset.x) / repeatX;
    const tileRight = (tileIndexX + 1 - this.offset.x) / repeatX;
    const tileBottom = (tileIndexY - this.offset.y) / repeatY;
    const tileTop = (tileIndexY + 1 - this.offset.y) / repeatY;

    // 画面座標に変換（px）
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const startLeft = tileLeft * screenWidth;
    const startTop = (1 - tileTop) * screenHeight; // Y軸反転
    const startWidth = (tileRight - tileLeft) * screenWidth;
    const startHeight = (tileTop - tileBottom) * screenHeight;

    // DOMアニメーション開始
    this.isAnimating = true;
    this.velocity.x = 0;
    this.velocity.y = 0;

    // オーバーレイ要素を取得
    const overlay = document.getElementById("photo-overlay");
    const img = document.getElementById("photo-overlay-img") as HTMLImageElement;
    if (!overlay || !img) return;

    // 画像を設定し、初期位置に配置
    img.src = imageUrl;
    img.style.left = `${startLeft}px`;
    img.style.top = `${startTop}px`;
    img.style.width = `${startWidth}px`;
    img.style.height = `${startHeight}px`;
    img.classList.remove("-is-animating");

    // オーバーレイを表示
    overlay.classList.add("-is-active");

    // 次のフレームでアニメーション開始
    requestAnimationFrame(() => {
      img.classList.add("-is-animating");

      // 画面中央に拡大
      const finalWidth = Math.min(screenWidth * 0.9, screenHeight * 0.9);
      const finalHeight = finalWidth;
      const finalLeft = (screenWidth - finalWidth) / 2;
      const finalTop = (screenHeight - finalHeight) / 2;

      img.style.left = `${finalLeft}px`;
      img.style.top = `${finalTop}px`;
      img.style.width = `${finalWidth}px`;
      img.style.height = `${finalHeight}px`;
    });

    // 写真アニメーション完了後にシャッターアニメーション
    setTimeout(() => {
      this.playShutterAnimation(() => {
        // シャッター閉じた後にページ遷移
        if (window.swup) {
          window.swup.navigate(targetUrl);
        } else {
          window.location.href = targetUrl;
        }
        // クリーンアップ
        setTimeout(() => {
          overlay.classList.remove("-is-active");
          img.classList.remove("-is-animating");
          this.isAnimating = false;
        }, 100);
      });
    }, 2000);
  }

  // シャッターアニメーション
  private playShutterAnimation(onComplete: () => void): void {
    const NUM_BLADES = 6;
    const CENTER = 200;
    const OUTER_RADIUS = 200;
    const GAP_HALF = 2.5;
    const DIRECTION_OFFSET = Math.PI / 6;

    const shutterOverlay = document.getElementById("shutter-overlay");
    const bladesGroup = document.getElementById("blades");
    if (!shutterOverlay || !bladesGroup) {
      onComplete();
      return;
    }

    // 直線と円の交点計算
    const lineCircleIntersection = (px: number, py: number, lineAngle: number, radius: number) => {
      const dx = Math.cos(lineAngle);
      const dy = Math.sin(lineAngle);
      const ox = px - CENTER;
      const oy = py - CENTER;
      const b = ox * dx + oy * dy;
      const c = ox * ox + oy * oy - radius * radius;
      const discriminant = b * b - c;
      if (discriminant < 0) return null;
      const sqrtD = Math.sqrt(discriminant);
      const t1 = -b + sqrtD;
      const t2 = -b - sqrtD;
      return [
        { x: px + t1 * dx, y: py + t1 * dy },
        { x: px + t2 * dx, y: py + t2 * dy },
      ];
    };

    // ブレードのパス生成
    const createBladePath = (index: number, apertureValue: number): string => {
      const angleStep = (Math.PI * 2) / NUM_BLADES;
      const closedInnerRadius = 0;
      const openInnerRadius = 190;
      const innerRadius = closedInnerRadius + (openInnerRadius - closedInnerRadius) * apertureValue;
      const rotation = apertureValue * angleStep * 0.5;

      const pos1Angle = angleStep * index - Math.PI / 2 + rotation;
      const dir1Angle = pos1Angle + DIRECTION_OFFSET;
      const pos2Angle = angleStep * (index + 1) - Math.PI / 2 + rotation;
      const dir2Angle = pos2Angle + DIRECTION_OFFSET;

      const edge1PassX = CENTER + Math.cos(pos1Angle) * 50 + Math.cos(dir1Angle + Math.PI / 2) * GAP_HALF;
      const edge1PassY = CENTER + Math.sin(pos1Angle) * 50 + Math.sin(dir1Angle + Math.PI / 2) * GAP_HALF;
      const edge2PassX = CENTER + Math.cos(pos2Angle) * 50 + Math.cos(dir2Angle - Math.PI / 2) * GAP_HALF;
      const edge2PassY = CENTER + Math.sin(pos2Angle) * 50 + Math.sin(dir2Angle - Math.PI / 2) * GAP_HALF;

      const outer1Points = lineCircleIntersection(edge1PassX, edge1PassY, dir1Angle, OUTER_RADIUS);
      const outer2Points = lineCircleIntersection(edge2PassX, edge2PassY, dir2Angle, OUTER_RADIUS);
      const inner1Points = lineCircleIntersection(edge1PassX, edge1PassY, dir1Angle, Math.max(innerRadius, 1));
      const inner2Points = lineCircleIntersection(edge2PassX, edge2PassY, dir2Angle, Math.max(innerRadius, 1));

      if (!outer1Points || !outer2Points || !inner1Points || !inner2Points) return "";

      const bladeCenterAngle = angleStep * (index + 0.5) - Math.PI / 2 + rotation;
      const bladeCenterX = CENTER + Math.cos(bladeCenterAngle) * 100;
      const bladeCenterY = CENTER + Math.sin(bladeCenterAngle) * 100;

      const selectClosest = (points: { x: number; y: number }[], refX: number, refY: number) => {
        const d0 = Math.hypot(points[0].x - refX, points[0].y - refY);
        const d1 = Math.hypot(points[1].x - refX, points[1].y - refY);
        return d0 < d1 ? points[0] : points[1];
      };

      const outerPoint1 = selectClosest(outer1Points, bladeCenterX, bladeCenterY);
      const outerPoint2 = selectClosest(outer2Points, bladeCenterX, bladeCenterY);
      const innerPoint1 = selectClosest(inner1Points, bladeCenterX, bladeCenterY);
      const innerPoint2 = selectClosest(inner2Points, bladeCenterX, bladeCenterY);

      const safeInnerRadius = Math.max(innerRadius, 1);
      return `
        M ${innerPoint1.x} ${innerPoint1.y}
        L ${outerPoint1.x} ${outerPoint1.y}
        A ${OUTER_RADIUS} ${OUTER_RADIUS} 0 0 1 ${outerPoint2.x} ${outerPoint2.y}
        L ${innerPoint2.x} ${innerPoint2.y}
        A ${safeInnerRadius} ${safeInnerRadius} 0 0 0 ${innerPoint1.x} ${innerPoint1.y}
        Z
      `;
    };

    // ブレード要素を初期化
    bladesGroup.innerHTML = "";
    for (let i = 0; i < NUM_BLADES; i++) {
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("fill", "#1a1a1a");
      path.setAttribute("d", createBladePath(i, 1));
      bladesGroup.appendChild(path);
    }

    // オーバーレイを表示
    shutterOverlay.classList.add("-is-active");

    // シャッター音を再生（0.3秒遅延）
    const shutterSound = new Audio("/camera.mp3");
    shutterSound.volume = 0.1;
    setTimeout(() => {
      shutterSound.play().catch(() => {});
    }, 300);

    // アニメーション
    let aperture = 1;
    const targetAperture = 0.15; // 0だとブレードが消えるので、少し開いた状態で止める
    const animationSpeed = 0.03; // ゆっくり閉じる
    const scaleStart = 1.15; // 初期スケール（少し大きい状態から）
    const scaleEnd = 0.7; // 最終スケール

    const svg = shutterOverlay.querySelector("svg");
    if (svg) {
      svg.style.transition = "none";
      svg.style.transform = `scale(${scaleStart})`;
    }

    const animateShutter = () => {
      const diff = targetAperture - aperture;
      if (Math.abs(diff) > 0.001) {
        aperture += diff * animationSpeed * 2.5;
        const paths = bladesGroup.querySelectorAll("path");
        paths.forEach((path, i) => {
          path.setAttribute("d", createBladePath(i, aperture));
        });
        // apertureの進行率に応じてスケールを補間
        const progress = 1 - (aperture - targetAperture) / (1 - targetAperture);
        const scale = scaleStart + (scaleEnd - scaleStart) * progress;
        if (svg) {
          svg.style.transform = `scale(${scale})`;
        }
        requestAnimationFrame(animateShutter);
      } else {
        aperture = targetAperture;
        const paths = bladesGroup.querySelectorAll("path");
        paths.forEach((path, i) => {
          path.setAttribute("d", createBladePath(i, aperture));
        });
        if (svg) {
          svg.style.transform = `scale(${scaleEnd})`;
        }
        // シャッターが閉じた状態を維持するためインラインスタイルで固定
        shutterOverlay.style.opacity = "1";
        // シャッターが閉じた状態を少し見せてからページ遷移
        setTimeout(() => {
          onComplete();
        }, 100);
      }
    };

    requestAnimationFrame(animateShutter);
  }

  private playIntroAnimation(): void {
    // トップページ以外、またはswup遷移後はイントロをスキップ
    if (this.skipIntro || window.location.pathname !== "/") {
      this.isIntro = false;
      this.material.uniforms.u_bulge.value = 0.0;
      const introOverlay = document.getElementById("intro-overlay");
      if (introOverlay) {
        introOverlay.classList.add("-is-hidden");
      }
      return;
    }

    this.isIntro = true;
    this.material.uniforms.u_bulge.value = 1.0;

    const introOverlay = document.getElementById("intro-overlay");
    if (!introOverlay) {
      // フォールバック: 従来のアニメーション
      gsap.to(this.material.uniforms.u_bulge, {
        value: 0.0,
        duration: 1.5,
        ease: "power3.out",
        delay: 0.3,
        onComplete: () => {
          this.isIntro = false;
        },
      });
      return;
    }

    // イントロ用の8枚の画像（publicフォルダ）- photo08が最後（一番上）になる順番
    const selectedImages = [
      "/intro-photo01.jpg",
      "/intro-photo02.jpg",
      "/intro-photo03.jpg",
      "/intro-photo04.jpg",
      "/intro-photo05.jpg",
      "/intro-photo06.jpg",
      "/intro-photo07.jpg",
      "/intro-photo08.jpg",
    ];
    const imgElements: HTMLImageElement[] = [];

    // Phase 1: 画像要素を生成してフェードイン
    const timeline = gsap.timeline();

    selectedImages.forEach((src, index) => {
      const img = document.createElement("img");
      img.src = src;
      img.className = "intro-overlay__img";
      img.style.zIndex = String(index + 1);
      // ランダムな回転（-15° 〜 +15°）
      const rotation = (Math.random() - 0.5) * 30;
      img.style.transform = `rotate(${rotation}deg)`;
      introOverlay.appendChild(img);
      imgElements.push(img);

      // 0.4秒間隔でフェードイン
      timeline.to(
        img,
        {
          opacity: 1,
          duration: 0.6,
          ease: "power1.out",
        },
        index * 0.9,
      );
    });

    // Phase 2: 散らばる（Phase 1完了後）
    timeline.add(() => {
      const count = imgElements.length;
      // 開始角度をランダムにして毎回違う方向に
      const startAngle = Math.random() * Math.PI * 2;

      imgElements.forEach((img, index) => {
        // 均等な角度（360° / 枚数）+ 少しランダムなオフセット
        const baseAngle = (Math.PI * 2 * index) / count;
        const angleOffset = (Math.random() - 0.5) * (Math.PI / count);
        const angle = startAngle + baseAngle + angleOffset;

        // 距離も均等に分散
        const baseDistance = 0.6 + (index / count) * 0.4;
        const distanceOffset = (Math.random() - 0.5) * 0.2;
        const distance = window.innerWidth * (baseDistance + distanceOffset);

        const x = Math.cos(angle) * distance;
        const y = Math.sin(angle) * distance;
        // 追加のランダム
        const extraRotation = (Math.random() - 0.5) * 60;

        gsap.to(img, {
          x: x,
          y: y,
          rotation: `+=${extraRotation}`,
          opacity: 0,
          duration: 0.8,
          ease: "power2.in",
        });
      });
    }, "+=0.3");

    // Phase 3: タイル化（散らばり完了後）
    timeline.add(() => {
      // 白い背景をフェードアウト
      gsap.to(introOverlay, {
        opacity: 0,
        duration: 1.0,
        ease: "power3.out",
      });

      gsap.to(this.material.uniforms.u_bulge, {
        value: 0.0,
        duration: 1.0,
        ease: "power3.out",
        onComplete: () => {
          this.isIntro = false;
          // DOM要素をクリーンアップ
          imgElements.forEach((img) => img.remove());
          introOverlay.classList.add("-is-hidden");
          introOverlay.style.opacity = "";
          document.body.classList.add("-intro-completed");
          setTimeout(() => {
            document.body.classList.remove("-intro-completed");
          }, 3000);
        },
      });
    }, "+=0.8");
  }

  private animate(): void {
    requestAnimationFrame(this.animate.bind(this));

    // アニメーション中・イントロ中はWebGLの動きを止める
    if (!this.isAnimating && !this.isIntro) {
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
    }

    // シェーダーのuniformを更新
    this.material.uniforms.u_offset.value.set(this.offset.x, this.offset.y);
    this.material.uniforms.u_gap.value = this.currentGap;
    this.material.uniforms.u_depth.value = this.currentDepth;

    this.renderer.render(this.scene, this.camera);
  }

  /**
   * 画面内で隣接タイルが被らない最適なストライド値を計算する。
   * ストライドは画面上の表示列数より大きく、かつimageCountと互いに素な値を選ぶ。
   */
  private computeTileStride(imageCount: number): number {
    if (imageCount <= 1) return 1;
    // 画面上に表示されるタイル列数（ウルトラワイド想定で余裕をもたせる）
    const minStride = 7;
    const target = Math.max(minStride, Math.ceil(imageCount / 3));
    for (let m = target; m < imageCount * 2; m++) {
      if (this.gcd(m, imageCount) === 1) return m;
    }
    return target;
  }

  private gcd(a: number, b: number): number {
    while (b) {
      [a, b] = [b, a % b];
    }
    return a;
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
