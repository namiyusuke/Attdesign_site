  interface WaveConfig {
    offset: number;
    color: string;
  }

export default class DrowCanvas {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private hamburger: HTMLButtonElement;
    private readonly purpleColor: string = "rgba(97, 101, 211, 1.0)";
    private readonly greyColor: string = "rgba(243, 243, 243, 1.0)";

    private waveOffset1: number;
    private waveOffset2: number;
    private isAnimating: boolean;
    private isGoingUp: boolean;
    private animationStartTime: number | null;
    private readonly animationDuration: number;

    constructor(delay: number) {
      const canvasElement = document.getElementById("drawerCanvas");
      if (!canvasElement) throw new Error("Canvas element not found");
      this.canvas = canvasElement as HTMLCanvasElement;

      const context = this.canvas.getContext("2d");
      if (!context) throw new Error("Could not get 2D context");
      this.ctx = context;

      const hamburgerElement = document.querySelector(".js-drawer");
      if (!hamburgerElement) throw new Error("Hamburger element not found");
      this.hamburger = hamburgerElement as HTMLButtonElement;

      this.waveOffset1 = -this.canvas.height * 1.1;
      this.waveOffset2 = -this.canvas.height * 1.1;
      this.isAnimating = false;
      this.isGoingUp = true;
      this.animationStartTime = null;
      this.animationDuration = 1400;

      this.init();
    }

    private init(): void {
      this.hamburger.addEventListener("click", this.handleHamburgerClick.bind(this));
      window.addEventListener("resize", this.resizeCanvas.bind(this));
      this.resizeCanvas();
    }

    private resizeCanvas(): void {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
      this.drawWaves();
    }

    private drawWave(config: WaveConfig): void {
      this.ctx.beginPath();
      this.ctx.moveTo(0, this.canvas.height);

      const amplitude = this.canvas.height * 0.05;
      const frequency = (Math.PI * 2) / this.canvas.width;

      for (let x = 0; x <= this.canvas.width; x++) {
        const y = Math.sin(x * frequency) * amplitude + (this.canvas.height - config.offset);
        this.ctx.lineTo(x, y);
      }

      this.ctx.lineTo(this.canvas.width, this.canvas.height);
      this.ctx.closePath();

      this.ctx.fillStyle = config.color;
      this.ctx.fill();
    }

    private drawWaves(): void {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.drawWave({ offset: this.waveOffset1, color: this.purpleColor });
      this.drawWave({ offset: this.waveOffset2, color: this.greyColor });
    }

    private easeInOutCubic(t: number): number {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    private animateWaves = (timestamp: number): void => {
      if (!this.animationStartTime) this.animationStartTime = timestamp;
      const elapsed = timestamp - this.animationStartTime;
      const progress = Math.min(elapsed / this.animationDuration, 1);
      const easedProgress = this.easeInOutCubic(progress);

      if (this.isGoingUp) {
        this.waveOffset1 = easedProgress * (this.canvas.height * 3.5) - 100;
        this.waveOffset2 = Math.max(0, easedProgress * (this.canvas.height * 3.5) - this.canvas.height * 0.5) - 100;
      } else {
        this.waveOffset1 = (1 - easedProgress) * (this.canvas.height * 3.5) - 100;
        this.waveOffset2 =
          Math.max(0, (1 - easedProgress) * (this.canvas.height * 3.5) - this.canvas.height * 0.3) - 100;
      }

      this.drawWaves();

      if (progress < 1) {
        requestAnimationFrame(this.animateWaves);
      } else {
        this.isAnimating = false;
        this.animationStartTime = null;
        this.hamburger.disabled = false;
        if (!this.isGoingUp) {
          this.isGoingUp = true;
          this.waveOffset1 = -this.canvas.height * 1.5;
          this.waveOffset2 = -this.canvas.height * 1.5;
        }
      }
    };

    private handleHamburgerClick = (): void => {
      if (!this.isAnimating) {
        this.isAnimating = true;
        this.hamburger.disabled = true;
        if (this.waveOffset1 >= this.canvas.height) {
          this.isGoingUp = false;
        }
        requestAnimationFrame(this.animateWaves);
      }
      this.hamburger.classList.toggle("active");
    };
  }
