import * as THREE from "three";
import gsap from "gsap";

export class BulgeImage {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private geometry: THREE.PlaneGeometry;
  private material: THREE.ShaderMaterial;
  private mesh: THREE.Mesh;
  private canvas: HTMLCanvasElement;
  private container: HTMLElement;
  private texture: THREE.Texture | null = null;

  // アニメーション用
  private animationId: number | null = null;

  constructor(container: HTMLElement, imageUrl: string) {
    this.container = container;

    // Canvas作成
    this.canvas = document.createElement("canvas");
    this.canvas.style.width = "100%";
    this.canvas.style.height = "100%";
    this.canvas.style.display = "block";
    this.container.appendChild(this.canvas);

    const rect = this.container.getBoundingClientRect();

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
    });
    this.renderer.setSize(rect.width, rect.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Scene
    this.scene = new THREE.Scene();

    // Camera (Orthographic)
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    this.camera.position.z = 1;

    // Geometry
    this.geometry = new THREE.PlaneGeometry(2, 2);

    // Material with bulge shader
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTexture: { value: null },
        uOffset: { value: 1.0 }, // 1.0 = 最大bulge, 0.0 = no bulge
        uTime: { value: 0 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        precision highp float;
        uniform float uTime;
        uniform float uOffset;
        varying vec2 vUv;
        uniform sampler2D uTexture;

        const float radius = 0.5;
        const float strength = .8;

        vec2 bulge(vec2 uv) {
          float dist = length(uv) / radius;
          float distPow = pow(dist, 2.0);
          float strengthAmount = strength / (1.0 + distPow);
          uv *= strengthAmount;
          return uv;
        }

        void main() {
          // 中心を(0.5, 0.5)から(0, 0)に移動
          vec2 centeredUv = vUv - 0.5;

          // bulge効果を適用
          vec2 bulgedUv = bulge(centeredUv);
          // 中心を元に戻す
          bulgedUv += 0.5;

          // 変形されたUV座標でテクスチャをサンプリング
          vec4 textureColor = texture2D(uTexture, mix(vUv, bulgedUv, uOffset));

          gl_FragColor = vec4(textureColor.rgb, 1.0);
        }
      `,
    });

    // Mesh
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.scene.add(this.mesh);

    // Load texture
    this.loadTexture(imageUrl);

    // Handle resize
    window.addEventListener("resize", this.onResize.bind(this));
  }

  private loadTexture(imageUrl: string): void {
    const loader = new THREE.TextureLoader();
    loader.crossOrigin = "anonymous";
    loader.load(imageUrl, (texture) => {
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      this.texture = texture;
      this.material.uniforms.uTexture.value = texture;

      // テクスチャがロードされたらアニメーション開始
      this.startAnimation();
    });
  }

  private onResize(): void {
    const rect = this.container.getBoundingClientRect();
    this.renderer.setSize(rect.width, rect.height);
  }

  private startAnimation(): void {
    // 初期状態: bulge効果が最大 (uOffset = 1.0)
    this.material.uniforms.uOffset.value = 1.0;

    // アニメーションループ開始
    this.animate();

    // GSAPでuOffsetを1.0から0.0にアニメーション
    gsap.to(this.material.uniforms.uOffset, {
      value: 0.0,
      duration: 1.2,
      ease: "power3.out",
      delay: 0.2,
    });
  }

  private animate(): void {
    this.animationId = requestAnimationFrame(this.animate.bind(this));
    this.renderer.render(this.scene, this.camera);
  }

  public destroy(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    window.removeEventListener("resize", this.onResize.bind(this));

    if (this.texture) {
      this.texture.dispose();
    }
    this.geometry.dispose();
    this.material.dispose();
    this.renderer.dispose();

    if (this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
  }
}
