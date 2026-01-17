export default function introCanvas(fontSize) {
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");
  const texts = ["package", "箱", "紙", "branding", "logo", "graphic tools"];
  // fontSize = ["40", "80", "100", "40", "30", "40"];
  const particles = [];
  const lines = [];
  const lineColors = ["rgba(97, 101, 211, 1)", "rgba(203, 203, 203, 1)"];

  let animationFrameId;
  let lightningIntervalId;

  function createLightningLine() {
    const side = Math.floor(Math.random() * 4);
    let x, y, dx, dy;
    switch (side) {
      case 2:
        x = 0;
        y = Math.random() * canvas.height;
        dx = Math.random() * 10 + 2;
        dy = 0;
        break;
      case 3:
        x = canvas.width;
        y = Math.random() * canvas.height;
        dx = -(Math.random() * 10 + 2);
        dy = 0;
        break;
    }
    const color = lineColors[Math.floor(Math.random() * lineColors.length)];
    lines.push({
      x,
      y,
      dx,
      dy,
      segments: [{ x, y }],
      growing: true,
      age: 0,
      maxAge: 150,
      color,
    });
  }

  function createNextLightningSegment(line) {
    if (!line.growing) return;

    const lastSegment = line.segments[line.segments.length - 1];
    const angle = Math.atan2(line.dy, line.dx) + ((Math.random() - 0.5) * Math.PI) / 3;
    const segmentLength = 220 ;
    // const segmentLength = Math.random() * 320 + 10;
    const nextX = lastSegment.x + Math.cos(angle) * segmentLength;
    const nextY = lastSegment.y + Math.sin(angle) * segmentLength;

    line.segments.push({ x: nextX, y: nextY });

    if (line.segments.length > 10) {
      line.growing = false;
    }
  }

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    particles.forEach((particle) => {
      particle.x = Math.random() * canvas.width;
      particle.y = Math.random() * canvas.height;
    });
  }

  // デバウンス関数
  function debounce(func, wait) {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  const debouncedResizeCanvas = debounce(resizeCanvas, 200);

  resizeCanvas();
  for (let i = 0; i < texts.length; i++) {
    particles.push({
      text: texts[i],
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      dx: Math.random() * 5 - 2,
      dy: Math.random() * 6 - 5,
      angle: Math.random() * 2 * Math.PI,
      rotationSpeed: Math.random() * 0.1 - 0.1,
      fontSize: fontSize[i],
    });
  }

  function drawText(particle) {
    ctx.save();
    ctx.translate(particle.x, particle.y);
    ctx.rotate(particle.angle);
    if (particle.text === "箱") {
     ctx.font = `${particle.fontSize}px 'Zen Old Mincho', sans-serif`;
    } else {
    ctx.font = `${particle.fontSize}px 'Jost', 'Zen Kaku Gothic New', sans-serif`;
    }
    // ctx.font = `${particle.fontSize}px 'Jost' ,'Zen Kaku Gothic New', sans-serif`; // フォント変更
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(particle.text, 0, 0);
    ctx.restore();
  }

  function drawLines() {
    lines.forEach((line) => {
      ctx.strokeStyle = line.color;
      ctx.lineWidth = 6;
      ctx.beginPath();
      if (line.segments.length > 0) {
        ctx.moveTo(line.segments[0].x, line.segments[0].y);
        for (let i = 1; i < line.segments.length; i++) {
          ctx.lineTo(line.segments[i].x, line.segments[i].y);
        }
      }
      ctx.stroke();
    });
  }

  function detectCollision(particle, line) {
    const px = particle.x;
    const py = particle.y;

    for (let i = 0; i < line.segments.length - 1; i++) {
      const lx1 = line.segments[i].x;
      const ly1 = line.segments[i].y;
      const lx2 = line.segments[i + 1].x;
      const ly2 = line.segments[i + 1].y;

      const lineLengthSquared = (lx2 - lx1) ** 2 + (ly2 - ly1) ** 2;
      if (lineLengthSquared === 0) continue;

      let t = ((px - lx1) * (lx2 - lx1) + (py - ly1) * (ly2 - ly1)) / lineLengthSquared;
      t = Math.max(0, Math.min(1, t));
      const closestX = lx1 + t * (lx2 - lx1);
      const closestY = ly1 + t * (ly2 - ly1);

      const distance = Math.hypot(px - closestX, py - closestY);

      if (distance < particle.fontSize / 2) {
        return true;
      }
    }

    return false;
  }

  function reflectParticle(particle, line) {
    particle.dx = -particle.dx;
    particle.dy = -particle.dy;
  }

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let particle of particles) {
      particle.x += particle.dx;
      particle.y += particle.dy;
      particle.angle += particle.rotationSpeed;

      if (particle.x <= 0 || particle.x >= canvas.width) {
        particle.dx = -particle.dx;
      }
      if (particle.y <= 0 || particle.y >= canvas.height) {
        particle.dy = -particle.dy;
      }

      for (let line of lines) {
        if (detectCollision(particle, line)) {
          reflectParticle(particle, line);
        }
      }

      drawText(particle);
    }

    lines.forEach((line, index) => {
      if (line.growing) {
        createNextLightningSegment(line);
      } else {
        line.age++;
        if (line.age > line.maxAge) {
          lines.splice(index, 1);
        }
      }
    });

    drawLines();
    animationFrameId = requestAnimationFrame(animate);
  }

  canvas.addEventListener("click", function (event) {
    const rect = canvas.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;
    const padding = 50;

    for (let particle of particles) {
      ctx.save();
      ctx.translate(particle.x, particle.y);
      ctx.rotate(particle.angle);
      const textWidth = ctx.measureText(particle.text).width;
      const textHeight = 30;
      ctx.restore();

      if (
        clickX >= particle.x - textWidth / 2 - padding &&
        clickX <= particle.x + textWidth / 2 + padding &&
        clickY >= particle.y - textHeight / 2 - padding &&
        clickY <= particle.y + textHeight / 2 + padding
      ) {
        particle.dx = Math.random() * 6 - 3;
        particle.dy = Math.random() * 6 - 3;
        particle.rotationSpeed = Math.random() * 0.2 - 0.1;
      }
    }
  });

  function startAnimation() {
    stopAnimation();
    lightningIntervalId = setInterval(createLightningLine, 1000);
    animate();
  }

  function stopAnimation() {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }
    if (lightningIntervalId) {
      clearInterval(lightningIntervalId);
    }
  }

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      stopAnimation();
    } else {
      startAnimation();
    }
  });

  window.addEventListener("resize", debouncedResizeCanvas);
  startAnimation();
}
// export default function introCanvas() {
//   const canvas = document.getElementById("canvas");
//   const ctx = canvas.getContext("2d");

//   const imageSources = [
//    { src: "image1.png", width:118, height: 33 }, // サイズ指定
//     { src: "image2.png", width: 172, height: 33 },
//     { src: "image3.png", width: 57, height: 33 },
//     { src: "image4.png", width: 214, height: 51 },
//     { src: "image5.png", width: 214, height: 30 },
//     { src: "image6.png", width: 159, height: 156 },
//     { src: "image7.png", width: 193, height: 61 }
//   ];

//   const particles = [];
//   const lines = [];
//   const lineColors = ["rgba(97, 101, 211, 1)", "rgba(203, 203, 203, 1)"];
//   const images = [];

//   let animationFrameId;
//   let lightningIntervalId;

//   function loadImages(sources, callback) {
//     let loadedCount = 0;
//     sources.forEach((source, index) => {
//       const img = new Image();
//       img.src = source.src;
//       img.onload = () => {
//         images[index] = {
//           img: img,
//           width: source.width,
//           height: source.height,
//         };
//         loadedCount++;
//         if (loadedCount === sources.length) {
//           callback();
//         }
//       };
//     });
//   }

//   function resizeCanvas() {
//     canvas.width = window.innerWidth;
//     canvas.height = window.innerHeight;

//     particles.forEach((particle) => {
//       particle.x = Math.random() * canvas.width;
//       particle.y = Math.random() * canvas.height;
//     });
//   }

//   function debounce(func, wait) {
//     let timeout;
//     return function (...args) {
//       clearTimeout(timeout);
//       timeout = setTimeout(() => func.apply(this, args), wait);
//     };
//   }

//   const debouncedResizeCanvas = debounce(resizeCanvas, 200);

//   function setupParticles() {
//     resizeCanvas();
//     for (let i = 0; i < images.length; i++) {
//       const { img, width, height } = images[i];

//       particles.push({
//         image: img,
//         x: Math.random() * canvas.width,
//         y: Math.random() * canvas.height,
//         dx: Math.random() * 5 - 2,
//         dy: Math.random() * 6 - 5,
//         angle: Math.random() * 2 * Math.PI,
//         rotationSpeed: Math.random() * 0.1 - 0.1,
//         width: width,
//         height: height,
//       });
//     }
//   }

//   function drawImage(particle) {
//     ctx.save();
//     ctx.translate(particle.x, particle.y);
//     ctx.rotate(particle.angle);
//     ctx.drawImage(
//       particle.image,
//       -particle.width / 2,
//       -particle.height / 2,
//       particle.width,
//       particle.height
//     );
//     ctx.restore();
//   }

//   function createLightningLine() {
//     const side = Math.floor(Math.random() * 2) === 0 ? "left" : "right";
//     let x, y, dx, dy;

//     if (side === "left") {
//       x = 0;
//       y = Math.random() * canvas.height;
//       dx = Math.random() * 10 + 2;
//       dy = 0;
//     } else {
//       x = canvas.width;
//       y = Math.random() * canvas.height;
//       dx = -(Math.random() * 10 + 2);
//       dy = 0;
//     }

//     const color = lineColors[Math.floor(Math.random() * lineColors.length)];
//     lines.push({
//       x,
//       y,
//       dx,
//       dy,
//       segments: [{ x, y }],
//       growing: true,
//       age: 0,
//       maxAge: 150,
//       color,
//     });
//   }

//   function createNextLightningSegment(line) {
//     if (!line.growing) return;

//     const lastSegment = line.segments[line.segments.length - 1];
//     const angle = Math.atan2(line.dy, line.dx) + ((Math.random() - 0.5) * Math.PI) / 3;
//     const segmentLength = Math.random() * 120 + 10;
//     const nextX = lastSegment.x + Math.cos(angle) * segmentLength;
//     const nextY = lastSegment.y + Math.sin(angle) * segmentLength;

//     line.segments.push({ x: nextX, y: nextY });

//     if (line.segments.length > 10) {
//       line.growing = false;
//     }
//   }

//   function drawLines() {
//     lines.forEach((line) => {
//       ctx.strokeStyle = line.color;
//       ctx.lineWidth = 12;
//       ctx.beginPath();
//       if (line.segments.length > 0) {
//         ctx.moveTo(line.segments[0].x, line.segments[0].y);
//         for (let i = 1; i < line.segments.length; i++) {
//           ctx.lineTo(line.segments[i].x, line.segments[i].y);
//         }
//       }
//       ctx.stroke();
//     });
//   }

//   function detectCollision(particle, line) {
//     const px = particle.x;
//     const py = particle.y;

//     for (let i = 0; i < line.segments.length - 1; i++) {
//       const lx1 = line.segments[i].x;
//       const ly1 = line.segments[i].y;
//       const lx2 = line.segments[i + 1].x;
//       const ly2 = line.segments[i + 1].y;

//       const lineLengthSquared = (lx2 - lx1) ** 2 + (ly2 - ly1) ** 2;
//       if (lineLengthSquared === 0) continue;

//       let t = ((px - lx1) * (lx2 - lx1) + (py - ly1) * (ly2 - ly1)) / lineLengthSquared;
//       t = Math.max(0, Math.min(1, t));
//       const closestX = lx1 + t * (lx2 - lx1);
//       const closestY = ly1 + t * (ly2 - ly1);

//       const distance = Math.hypot(px - closestX, py - closestY);

//       if (distance < particle.width / 2) {
//         return true;
//       }
//     }

//     return false;
//   }

//  function reflectParticle(particle, line) {
//   // 速度を完全反転するのではなく、少しノイズを加える
//   const speedNoise = 0.5; // 速度に加えるノイズの大きさ
//   particle.dx = -particle.dx + (Math.random() - 0.5) * speedNoise;
//   particle.dy = -particle.dy + (Math.random() - 0.5) * speedNoise;

//   // 動かなくなるのを防ぐため、最低速度を保証
//   const minSpeed = 1;
//   if (Math.abs(particle.dx) < minSpeed) {
//     particle.dx = particle.dx < 0 ? -minSpeed : minSpeed;
//   }
//   if (Math.abs(particle.dy) < minSpeed) {
//     particle.dy = particle.dy < 0 ? -minSpeed : minSpeed;
//   }
// }
//   canvas.addEventListener("click", function (event) {
//     const rect = canvas.getBoundingClientRect();
//     const clickX = event.clientX - rect.left;
//     const clickY = event.clientY - rect.top;

//     for (let particle of particles) {
//       const halfWidth = particle.width / 2;
//       const halfHeight = particle.height / 2;

//       if (
//         clickX >= particle.x - halfWidth &&
//         clickX <= particle.x + halfWidth &&
//         clickY >= particle.y - halfHeight &&
//         clickY <= particle.y + halfHeight
//       ) {
//         particle.dx = Math.random() * 6 - 3;
//         particle.dy = Math.random() * 6 - 3;
//         particle.rotationSpeed = Math.random() * 0.2 - 0.1;
//       }
//     }
//   });

//   function animate() {
//     ctx.clearRect(0, 0, canvas.width, canvas.height);

//     for (let particle of particles) {
//       particle.x += particle.dx;
//       particle.y += particle.dy;
//       particle.angle += particle.rotationSpeed;

//       if (particle.x <= 0 || particle.x >= canvas.width) {
//         particle.dx = -particle.dx;
//       }
//       if (particle.y <= 0 || particle.y >= canvas.height) {
//         particle.dy = -particle.dy;
//       }

//       for (let line of lines) {
//         if (detectCollision(particle, line)) {
//           reflectParticle(particle, line);
//         }
//       }

//       drawImage(particle);
//     }

//     lines.forEach((line, index) => {
//       if (line.growing) {
//         createNextLightningSegment(line);
//       } else {
//         line.age++;
//         if (line.age > line.maxAge) {
//           lines.splice(index, 1);
//         }
//       }
//     });

//     drawLines();
//     animationFrameId = requestAnimationFrame(animate);
//   }

//   function startAnimation() {
//     stopAnimation();
//     lightningIntervalId = setInterval(createLightningLine, 1000);
//     animate();
//   }

//   function stopAnimation() {
//     if (animationFrameId) {
//       cancelAnimationFrame(animationFrameId);
//     }
//     if (lightningIntervalId) {
//       clearInterval(lightningIntervalId);
//     }
//   }

//   window.addEventListener("resize", debouncedResizeCanvas);

//   loadImages(imageSources, () => {
//     setupParticles();
//     startAnimation();
//   });

//   document.addEventListener("visibilitychange", function () {
//     if (document.hidden) {
//       stopAnimation();
//     } else {
//       startAnimation();
//     }
//   });
// }
