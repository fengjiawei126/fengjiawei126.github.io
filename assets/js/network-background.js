(async () => {
  const network = document.querySelector('.homepage-network-layer');
  if (!network) return;
  const canvas = network.querySelector('canvas');
  const context = canvas.getContext('2d');
  if (!context) return;
  const response = await fetch(network.dataset.motionSrc);
  if (!response.ok) return;
  const data = await response.json();
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const random = (min, max) => min + Math.random() * (max - min);
  // These source paths are polylines. Cache distances once instead of querying SVG geometry every frame.
  const routes = data.routes.map(({ d }) => {
    const points = d.slice(1).trim().split(/[ ,]+/).map(Number);
    const lengths = [0];
    for (let i = 2; i < points.length; i += 2) {
      lengths.push(lengths[lengths.length - 1] + Math.hypot(points[i] - points[i - 2], points[i + 1] - points[i - 1]));
    }
    return { points, lengths, length: lengths[lengths.length - 1] };
  });
  const trains = data.metro.map(d => ({ path: new Path2D(d), duration: random(45, 90), phase: random(0, 90), direction: Math.random() < .5 ? -1 : 1 }));
  const trainStrokes = [
    { width: 7.6, dash: [18, 156], opacity: .12, phase: 2 },
    { width: 4.5, dash: [16, 158], opacity: .3, phase: 1 },
    { width: 2.4, dash: [30, 144], opacity: .23, phase: 16 },
    { width: 2.4, dash: [14, 160], opacity: .9, phase: 0 },
  ];
  const flashes = Array.from({ length: 24 }, () => ({ age: 4, x: 0, y: 0 }));
  const encounters = new Set();
  let motionTime = 0, nextFlashTime = 0, previousTime = 0, frame = 0;
  let scale = 1, offsetX = 0, offsetY = 0, pixelRatio = 1, opacity = .075;

  function resetParticle(particle, initial = false, initialRoute) {
    const candidates = routes.filter(route => route !== particle.route);
    particle.route = initialRoute || candidates[Math.floor(Math.random() * candidates.length)];
    particle.direction = Math.random() < .5 ? -1 : 1;
    particle.duration = random(40, 100);
    particle.progress = initial ? Math.random() : 0;
    particle.phase = random(0, Math.PI * 2);
    particle.period = random(8, 22);
    particle.elapsed = 0;
  }

  function placeParticle(particle) {
    const route = particle.route;
    const distance = (particle.direction > 0 ? particle.progress : 1 - particle.progress) * route.length;
    let low = 1, high = route.lengths.length - 1;
    while (low < high) {
      const middle = (low + high) >>> 1;
      if (route.lengths[middle] < distance) low = middle + 1;
      else high = middle;
    }
    const fraction = (distance - route.lengths[low - 1]) / (route.lengths[low] - route.lengths[low - 1] || 1);
    const index = (low - 1) * 2;
    particle.x = route.points[index] + (route.points[index + 2] - route.points[index]) * fraction;
    particle.y = route.points[index + 1] + (route.points[index + 3] - route.points[index + 1]) * fraction;
    particle.opacity = Math.min(1, particle.progress / .035, (1 - particle.progress) / .035);
  }

  const particles = Array.from({ length: 32 }, (_, index) => {
    const particle = {};
    resetParticle(particle, true, routes[index % routes.length]);
    placeParticle(particle);
    return particle;
  });

  // Reuse one glow bitmap instead of constructing gradients during animation.
  const glow = document.createElement('canvas');
  glow.width = glow.height = 64;
  const glowContext = glow.getContext('2d');
  const gradient = glowContext.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(255,255,255,.8)');
  gradient.addColorStop(.3, 'rgba(255,255,255,.25)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  glowContext.fillStyle = gradient;
  glowContext.fillRect(0, 0, 64, 64);

  function circle(x, y, radius) {
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
  }

  function draw() {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.setTransform(pixelRatio * scale, 0, 0, pixelRatio * scale, pixelRatio * offsetX, pixelRatio * offsetY);
    context.strokeStyle = '#b9d7e6';
    context.lineCap = context.lineJoin = 'round';
    for (const stroke of trainStrokes) {
      context.lineWidth = stroke.width;
      context.setLineDash(stroke.dash);
      context.globalAlpha = opacity * stroke.opacity;
      for (const train of trains) {
        const phase = stroke.phase === 16 && train.direction < 0 ? 0 : stroke.phase;
        context.lineDashOffset = phase - train.direction * 348 * (motionTime + train.phase) / train.duration;
        context.stroke(train.path);
      }
    }
    context.setLineDash([]);
    context.lineWidth = 6;
    context.fillStyle = '#ffffff';
    for (const particle of particles) {
      circle(particle.x, particle.y, 2.8);
      context.globalAlpha = opacity * particle.opacity * .22;
      context.stroke();
      context.globalAlpha = opacity * particle.opacity;
      context.fill();
    }
    for (const flash of flashes) {
      if (flash.age >= 4) continue;
      const progress = flash.age / 4;
      const alpha = .68 * (1 - progress) ** 2;
      const radius = 4 + progress * 18;
      context.globalAlpha = alpha;
      context.drawImage(glow, flash.x - radius, flash.y - radius, radius * 2, radius * 2);
      context.strokeStyle = '#ffffff';
      context.lineWidth = .7;
      context.globalAlpha = alpha * .4;
      circle(flash.x, flash.y, 3 + progress * 14);
      context.stroke();
      context.globalAlpha = alpha;
      circle(flash.x, flash.y, 2 - progress * 1.5);
      context.fill();
    }
    context.globalAlpha = 1;
  }

  function resize() {
    const width = network.clientWidth, height = network.clientHeight;
    pixelRatio = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    const clip = data.clip;
    scale = Math.max(width / clip.width, height / clip.height);
    offsetX = (width - clip.width * scale) / 2 - clip.x * scale;
    offsetY = (height - clip.height * scale) / 2 - clip.y * scale;
    opacity = Number(getComputedStyle(network).getPropertyValue('--network-opacity'));
    draw();
  }

  function updateEncounters(delta) {
    flashes.forEach(flash => { flash.age += delta; });
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const a = particles[i], b = particles[j];
        const key = i * particles.length + j;
        const distance = (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
        if (a.opacity < .4 || b.opacity < .4 || distance > 121) encounters.delete(key);
        else if (distance <= 49 && !encounters.has(key)) {
          encounters.add(key);
          if (motionTime < nextFlashTime) continue;
          const flash = flashes.find(item => item.age >= 4);
          if (!flash) continue;
          Object.assign(flash, { age: 0, x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
          nextFlashTime = motionTime + .35;
        }
      }
    }
  }

  function animate(time) {
    const step = previousTime ? Math.min((time - previousTime) / 1000, .1) : 0;
    previousTime = time;
    motionTime += step;
    particles.forEach(particle => {
      particle.elapsed += step;
      const speed = 1 + .18 * Math.sin(particle.phase + particle.elapsed * Math.PI * 2 / particle.period);
      particle.progress += step * speed / particle.duration;
      if (particle.progress >= 1) resetParticle(particle);
      placeParticle(particle);
    });
    updateEncounters(step);
    draw();
    frame = requestAnimationFrame(animate);
  }

  function syncMotion() {
    if (reducedMotion.matches || document.hidden) {
      cancelAnimationFrame(frame);
      frame = previousTime = 0;
    } else if (!frame) frame = requestAnimationFrame(animate);
  }
  new ResizeObserver(resize).observe(network);
  reducedMotion.addEventListener('change', syncMotion);
  document.addEventListener('visibilitychange', syncMotion);
  resize();
  syncMotion();
})().catch(error => console.warn('Network animation unavailable:', error));
