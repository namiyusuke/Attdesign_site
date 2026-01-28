import * as THREE from 'three';

export class LeafShadow {
  constructor(canvas) {
    this.canvas = canvas;
    this.material = null;
    this.renderer = null;
    this.animationId = null;

    this.init();
  }

  init() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    this.camera.position.z = 1;

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      antialias: true,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const vertexShader = `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      uniform float uTime;
      uniform float uAmplitude;
      uniform float uSpeed;
      uniform float uScreenAspect;
      uniform float uTextureAspect;
      uniform sampler2D uTexture;
      varying vec2 vUv;

      vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
      float snoise(vec2 v) {
        const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
        vec2 i = floor(v + dot(v, C.yy));
        vec2 x0 = v - i + dot(i, C.xx);
        vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
        vec4 x12 = x0.xyxy + C.xxzz;
        x12.xy -= i1;
        i = mod(i, 289.0);
        vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
        vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
        m = m*m*m*m;
        vec3 x = 2.0 * fract(p * C.www) - 1.0;
        vec3 h = abs(x) - 0.5;
        vec3 ox = floor(x + 0.5);
        vec3 a0 = x - ox;
        m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
        vec3 g;
        g.x = a0.x * x0.x + h.x * x0.y;
        g.yz = a0.yz * x12.xz + h.yz * x12.yw;
        return 130.0 * dot(m, g);
      }

      void main() {
        vec2 uv = vUv;

        // アスペクト比を補正（object-fit: cover のような動作）
        if (uScreenAspect > uTextureAspect) {
          float scale = uScreenAspect / uTextureAspect;
          uv.y = (uv.y - 0.5) / scale + 0.5;
        } else {
          float scale = uTextureAspect / uScreenAspect;
          uv.x = (uv.x - 0.5) / scale + 0.5;
        }

        float time = uTime * uSpeed;
        float noise1 = snoise(vec2(uv.x * 3.0 + time * 0.3, uv.y * 2.0 + time * 0.2));
        float noise2 = snoise(vec2(uv.x * 5.0 - time * 0.2, uv.y * 4.0 + time * 0.35)) * 0.5;
        float combinedNoise = noise1 + noise2;
        float displacement = combinedNoise * uAmplitude * 0.001;
        uv.x += displacement * 1.5;
        uv.y += displacement * 0.5;
        uv = clamp(uv, 0.0, 1.0);
        gl_FragColor = texture2D(uTexture, uv);
      }
    `;

    const textureLoader = new THREE.TextureLoader();
    textureLoader.load('/shadow.png', (texture) => {
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;

      const textureAspect = texture.image.width / texture.image.height;

      this.material = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uAmplitude: { value: 5 },
          uSpeed: { value: 1.0 },
          uScreenAspect: { value: window.innerWidth / window.innerHeight },
          uTextureAspect: { value: textureAspect },
          uTexture: { value: texture },
        },
        vertexShader,
        fragmentShader,
        transparent: true,
      });

      const geometry = new THREE.PlaneGeometry(2, 2);
      const mesh = new THREE.Mesh(geometry, this.material);
      this.scene.add(mesh);

      this.animate();
    });

    this.handleResize = this.handleResize.bind(this);
    window.addEventListener('resize', this.handleResize);
  }

  animate() {
    this.animationId = requestAnimationFrame(() => this.animate());
    if (this.material) {
      this.material.uniforms.uTime.value += 0.016;
    }
    this.renderer.render(this.scene, this.camera);
  }

  handleResize() {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    if (this.material) {
      this.material.uniforms.uScreenAspect.value = window.innerWidth / window.innerHeight;
    }
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    window.removeEventListener('resize', this.handleResize);
    if (this.renderer) {
      this.renderer.dispose();
    }
    if (this.material) {
      this.material.dispose();
    }
  }
}
