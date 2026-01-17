export default function canvas2() {
    const canvas = document.getElementById("waveCanvas");
    const ctx = canvas.getContext("2d");

    let animationId;
    let scrollPosition = 0;
    let hasAnimated = false;
    let startTime = null;
    const revealDuration = 1000;

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    function drawWave(time, amplitude, frequency, speed, color, yAxisOffset, parallaxFactor, reverse = false) {
        const baseYAxis = canvas.height / 2;
        const yAxis = baseYAxis + yAxisOffset + scrollPosition * parallaxFactor * 5;

        ctx.beginPath();
        ctx.moveTo(-20, yAxis);

        for (let x = -20; x <= canvas.width + 20; x++) {
            let y;
            if (reverse) {
                y = yAxis - amplitude * Math.sin(frequency * x + time * speed);
            } else {
                y = yAxis + amplitude * Math.sin(frequency * x + time * speed);
            }
            ctx.lineTo(x, y);
        }

        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
    }

    function drawWaves(timestamp) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const commonFrequency = 0.01;

        ctx.save();

        let progress = 1;
        if (!hasAnimated && startTime) {
            const elapsed = timestamp - startTime;
            progress = Math.min(elapsed / revealDuration, 1);

            if (progress >= 1) {
                hasAnimated = true;
            }
        } else if (hasAnimated) {
            progress = 1;
        }

        ctx.beginPath();
        ctx.rect(0, 0, canvas.width * progress, canvas.height);
        ctx.clip();

        // それぞれの波で異なるスピードを設定
        drawWave(timestamp, canvas.height / 20, commonFrequency, 0.001, "rgba(51, 51, 51, 1)", 0, 0.02);
        drawWave(
            timestamp,
            canvas.height / 25,
            commonFrequency,
            0.002, // 2倍速
            "rgba(51, 51, 51, 1)",
            canvas.height / 4,
            0.04,
            true
        );
        drawWave(
            timestamp,
            canvas.height / 30,
            commonFrequency,
            0.003, // 3倍速
            "rgba(51, 51, 51, 1)",
            -canvas.height / 4,
            0.06
        );

        ctx.restore();
    }

    function animate(timestamp) {
        drawWaves(timestamp);
        animationId = requestAnimationFrame(animate);
    }

    function startAnimation() {
        if (!animationId) {
            animationId = requestAnimationFrame(animate);
        }
    }

    function stopAnimation() {
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
    }

    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting && !hasAnimated && !startTime) {
                    startTime = performance.now();
                }
            });
        },
        {
            threshold: 0.1
        }
    );

    observer.observe(canvas);

    window.addEventListener("resize", () => {
        resizeCanvas();
        startAnimation();
    });

    window.addEventListener("scroll", () => {
        scrollPosition = canvas.getBoundingClientRect().top;
    });

    resizeCanvas();
    startAnimation();

    return () => {
        stopAnimation();
        observer.disconnect();
        window.removeEventListener("resize", resizeCanvas);
        window.removeEventListener("scroll", () => {});
    };
}
