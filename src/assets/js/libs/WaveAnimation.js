// export default class WaveAnimation {
//   constructor(targetId, options = {}) {
//     this.canvas = document.getElementById(targetId);
//     this.ctx = this.canvas.getContext("2d");
//     this.time = 0;
//     this.waveLength = options.waveLength || 0.01;
//     this.amplitude = options.amplitude || 3;
//     this.maxAmplitude = options.maxAmplitude || 10;
//     this.isHovering = false;
//     this.colors = options.colors || ["#fff", "#fff", "#fff"];
//     this.animeOff=options.animeOff || true;
//     this.isVisible = false;
//     this.progress = 0;
//     this.animationDuration = options.animationDuration || 1000;
//     this.startTime = null;

//     this.canvas.addEventListener("mouseenter", () => (this.isHovering = true));
//     this.canvas.addEventListener("mouseleave", () => (this.isHovering = false));

//     this.setupIntersectionObserver();
//     this.animate();
//   }

//   setupIntersectionObserver() {
//     const observer = new IntersectionObserver(
//       (entries) => {
//         entries.forEach((entry) => {
//           if (entry.isIntersecting && !this.isVisible) {
//             entry.target.classList.add("is-visible");
//             this.isVisible = true;
//             this.startTime = performance.now();
//           }
//         });
//       },
//       {
//         threshold: 0.1
//       }
//     );

//     observer.observe(this.canvas);
//   }

//   drawWave(yOffset, color, amplitude, xoffset) {
//     this.ctx.beginPath();
//     this.ctx.moveTo(-10, yOffset);

//     for (let x = -10; x <= this.canvas.width + 10; x++) {
//       const y = Math.sin((x + xoffset) * this.waveLength + this.time) * amplitude * 3 + yOffset;
//       this.ctx.lineTo(x, y);
//     }

//     this.ctx.strokeStyle = color;
//     this.ctx.lineWidth = .8;
//     this.ctx.lineCap = 'round';
//     this.ctx.lineJoin = 'round';
//     this.ctx.stroke();
//   }

//   drawRevealMask() {
//     if (this.isVisible && this.startTime) {
//       const elapsed = performance.now() - this.startTime;
//       const currentProgress = Math.min(elapsed / this.animationDuration, 1);

//       this.ctx.save();
//       this.ctx.globalCompositeOperation = 'destination-in';
//       this.ctx.fillStyle = '#000';
//       this.ctx.fillRect(0, 0, this.canvas.width * currentProgress, this.canvas.height);
//       this.ctx.restore();
//     }
//   }

//   drawWaves() {
//     this.ctx.clearRect(-10, 0, this.canvas.width + 20, this.canvas.height);

//     // 波のアニメーションを常に描画
//     this.drawWave(this.canvas.height / 4, this.colors[0], this.amplitude, 0);
//     this.drawWave(this.canvas.height / 2, this.colors[1], this.amplitude, 180);
//     this.drawWave((3 * this.canvas.height) / 4, this.colors[2], this.amplitude, 0);

//     // 出現アニメーションのマスクを適用
//     if (!this.isVisible) {
//       this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
//     } else {
//       this.drawRevealMask();
//     }
//   }

//   animate() {

//     this.time += 0.05;

//     if (this.isHovering && this.amplitude < this.maxAmplitude) {
//       this.amplitude += 0.5;
//     } else if (!this.isHovering && this.amplitude > 3) {
//       this.amplitude -= 0.5;
//     }

//     this.drawWaves();

//     requestAnimationFrame(() => this.animate());
//   }

//   setColors(colors) {
//     if (Array.isArray(colors) && colors.length === 3) {
//       this.colors = colors;
//     } else {
//       console.error("Colors should be an array of 3 color strings");
//     }
//   }

//   reset() {
//     this.isVisible = false;
//     this.startTime = null;
//     this.drawWaves();
//   }
// }
export default class WaveAnimation {
  constructor(targetId, options = {}) {
    this.canvas = document.getElementById(targetId);
    this.ctx = this.canvas.getContext("2d", { alpha: true });

   const dpr = window.devicePixelRatio || 1;
const rect = this.canvas.getBoundingClientRect();
const isMobile = window.innerWidth <= 768;

    // モバイルデバイスの判定と高さ設定
    // const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const canvasHeight = isMobile ? 200 : rect.height;
if (isMobile) {
  this.canvas.style.height = '200px';
  this.canvas.style.width = '100%';
  this.canvas.width = rect.width * dpr;
  this.canvas.height = 200 * dpr;
} else {
  this.canvas.width = rect.width * dpr;
  this.canvas.height = rect.height * dpr;
  this.canvas.style.width = `${rect.width}px`;
  this.canvas.style.height = `${rect.height}px`;
}

    // 残りのコンストラクタは同じ
    this.time = 0;
    this.waveLength = options.waveLength || 0.01;
    this.amplitude = options.amplitude || 3;
    this.maxAmplitude = options.maxAmplitude || 10;
    this.isHovering = false;
    this.colors = options.colors || ["#fff", "#fff", "#fff"];
    this.animeOff = options.animeOff || false;
    this.animateWaves = options.animateWaves !== undefined ? options.animateWaves : true;
    this.isVisible = false;
    this.progress = 0;
    this.animationDuration = options.animationDuration || 1700;
    this.startTime = null;
    this.forceStaticWave = options.forceStaticWave || false;

    this.canvas.addEventListener("mouseenter", () => (this.isHovering = true));
    this.canvas.addEventListener("mouseleave", () => (this.isHovering = false));

    this.setupIntersectionObserver();
    this.animate();
  }

  // 以下のメソッドは前回と同じ
  setupIntersectionObserver() {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !this.isVisible) {
            entry.target.classList.add("is-visible");
            this.isVisible = true;
            this.startTime = performance.now();
          }
        });
      },
      {
        threshold: 0.1
      }
    );

    observer.observe(this.canvas);
  }

  drawWave(yOffset, color, amplitude, xoffset) {
    this.ctx.beginPath();
    this.ctx.moveTo(-10, yOffset);

    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';

    let previousX = -10;
    let previousY = yOffset;

    for (let x = -10; x <= this.canvas.width + 10; x += 1) {
      const y = this.animateWaves || this.forceStaticWave
        ? Math.sin((x + xoffset) * this.waveLength + this.time) * amplitude * 3 + yOffset
        : yOffset;

      if (Math.abs(y - previousY) > 0.5 || x - previousX > 1) {
        this.ctx.lineTo(x, y);
        previousX = x;
        previousY = y;
      }
    }

    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 0.5;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.stroke();
  }

  drawRevealMask() {
    if (this.isVisible && this.startTime) {
      const elapsed = performance.now() - this.startTime;
      let currentProgress = Math.min(elapsed / this.animationDuration, 1);
      if (this.animeOff) {
        currentProgress = 1;
      }
      this.ctx.save();
      this.ctx.globalCompositeOperation = 'destination-in';
      this.ctx.fillStyle = '#000';
      this.ctx.fillRect(0, 0, this.canvas.width * currentProgress, this.canvas.height);
      this.ctx.restore();
    }
  }

  drawWaves() {
    this.ctx.clearRect(-10, 0, this.canvas.width + 20, this.canvas.height);

    this.drawWave(this.canvas.height / 4, this.colors[0], this.amplitude, 0);
    this.drawWave(this.canvas.height / 2, this.colors[1], this.amplitude, 180);
    this.drawWave((3 * this.canvas.height) / 4, this.colors[2], this.amplitude, 0);

    if (!this.isVisible) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    } else {
      this.drawRevealMask();
    }
  }

  animate() {
    if (this.animateWaves) {
      this.time += 0.05;

      if (this.isHovering && this.amplitude < this.maxAmplitude) {
        this.amplitude += 0.5;
      } else if (!this.isHovering && this.amplitude > 3) {
        this.amplitude -= 0.5;
      }
    }

    this.drawWaves();
    requestAnimationFrame(() => this.animate());
  }

  setColors(colors) {
    if (Array.isArray(colors) && colors.length === 3) {
      this.colors = colors;
    }
  }

  reset() {
    this.isVisible = false;
    this.startTime = null;
    this.drawWaves();
  }

  toggleWaveAnimation(animate = true) {
    this.animateWaves = animate;
    if (!animate) {
      this.amplitude = 3;
      this.time = 0;
      this.drawWaves();
    }
  }

  setForceStaticWave(force = false) {
    this.forceStaticWave = force;
    this.drawWaves();
  }
}
