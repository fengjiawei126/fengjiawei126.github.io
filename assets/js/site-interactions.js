(() => {
  const network = document.querySelector('.research-network');
  if (network) {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const random = (min, max) => min + Math.random() * (max - min);
    const routes = Array.from(network.querySelectorAll('defs > path[data-route-name]'), (path) => ({ path, length: path.getTotalLength() }));
    const flashLayer = document.querySelector('.network-flash-layer');
    const flashDuration = 4;
    const flashes = Array.from(flashLayer.querySelectorAll('.network-encounter'), (element) => ({
      element,
      halo: element.querySelector('.network-flash-halo'),
      ring: element.querySelector('.network-flash-ring'),
      core: element.querySelector('.network-flash-core'),
      age: flashDuration,
    }));
    const encounters = new Set();
    let motionTime = 0;
    let nextFlashTime = 0;
    let frame = 0;
    let previousTime = 0;

    function resetParticle(particle, initial = false, initialRoute) {
      const candidates = routes.filter((route) => route !== particle.route);
      particle.route = initialRoute || candidates[Math.floor(Math.random() * candidates.length)];
      particle.element.setAttribute('data-road-route', particle.route.path.id);
      particle.direction = Math.random() < 0.5 ? -1 : 1;
      particle.duration = random(40, 100);
      particle.progress = initial ? Math.random() : 0;
      particle.phase = random(0, Math.PI * 2);
      particle.period = random(8, 22);
      particle.elapsed = 0;
    }

    function placeParticle(particle) {
      const progress = particle.direction > 0 ? particle.progress : 1 - particle.progress;
      const point = particle.route.path.getPointAtLength(progress * particle.route.length);
      const opacity = Math.min(1, particle.progress / 0.035, (1 - particle.progress) / 0.035);
      particle.x = point.x;
      particle.y = point.y;
      particle.opacity = opacity;
      particle.element.setAttribute('transform', `translate(${point.x.toFixed(2)} ${point.y.toFixed(2)})`);
      particle.element.setAttribute('opacity', opacity.toFixed(3));
    }

    const particles = Array.from(network.querySelectorAll('.road-vehicle'), (element, index) => {
      const particle = { element };
      // Cover each crossing immediately; positions, directions, and later trips stay random.
      resetParticle(particle, true, routes[index % routes.length]);
      placeParticle(particle);
      return particle;
    });
    network.querySelectorAll('.metro-train, .network-node').forEach((element) => {
      const isTrain = element.classList.contains('metro-train');
      const duration = isTrain ? random(45, 90) : random(8, 18);
      element.style.animationDuration = `${duration}s`;
      element.style.animationDelay = `${-Math.random() * duration}s`;
      if (isTrain) {
        const reversed = Math.random() < 0.5;
        element.style.animationDirection = reversed ? 'reverse' : 'normal';
        element.classList.toggle('is-reversed', reversed);
      }
    });

    function paintFlash(flash) {
      const progress = Math.min(1, flash.age / flashDuration);
      flash.element.setAttribute('opacity', (0.68 * (1 - progress) ** 2).toFixed(3));
      flash.halo.setAttribute('r', (4 + progress * 18).toFixed(2));
      flash.ring.setAttribute('r', (3 + progress * 14).toFixed(2));
      flash.core.setAttribute('r', (2 - progress * 1.5).toFixed(2));
    }

    function updateEncounters(delta) {
      motionTime += delta;
      flashes.forEach((flash) => {
        if (flash.age >= flashDuration) return;
        flash.age += delta;
        paintFlash(flash);
      });
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i];
          const b = particles[j];
          const key = i * particles.length + j;
          const distance = (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
          if (a.opacity < 0.4 || b.opacity < 0.4 || distance > 121) {
            encounters.delete(key);
          } else if (distance <= 49 && !encounters.has(key)) {
            encounters.add(key);
            if (motionTime < nextFlashTime) continue;
            const flash = flashes.find((item) => item.age >= flashDuration);
            if (!flash) continue;
            flash.age = 0;
            flash.element.setAttribute('transform', `translate(${(a.x + b.x) / 2} ${(a.y + b.y) / 2})`);
            paintFlash(flash);
            // Pool and throttle flashes so crowded roads cannot strobe continuously.
            nextFlashTime = motionTime + 0.35;
          }
        }
      }
    }

    function animate(time) {
      frame = requestAnimationFrame(animate);
      if (!previousTime) previousTime = time;
      const delta = (time - previousTime) / 1000;
      if (delta < 1 / 30) return;
      previousTime = time;
      const step = Math.min(delta, 0.1);
      particles.forEach((particle) => {
        particle.elapsed += step;
        const speed = 1 + 0.18 * Math.sin(particle.phase + particle.elapsed * Math.PI * 2 / particle.period);
        particle.progress += step * speed / particle.duration;
        // A hidden endpoint lets each particle choose a new road without a visible jump.
        if (particle.progress >= 1) resetParticle(particle);
        placeParticle(particle);
      });
      updateEncounters(step);
    }

    const syncMotion = () => {
      const paused = reducedMotion.matches || document.hidden;
      network.classList.toggle('network-paused', paused);
      if (paused) {
        cancelAnimationFrame(frame);
        frame = 0;
        previousTime = 0;
      } else if (!frame) {
        frame = requestAnimationFrame(animate);
      }
    };
    reducedMotion.addEventListener('change', syncMotion);
    document.addEventListener('visibilitychange', syncMotion);
    syncMotion();
  }
  const status = document.getElementById('copy-status');
  if (!status) return;
  const statusLabel = status.querySelector('.copy-status-label');
  let hideTimer;

  async function copyText(text) {
    if (window.isSecureContext && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return;
      } catch (_) {
        // Embedded previews may deny clipboard permission; retain a user-gesture fallback.
      }
    }
    const focused = document.activeElement;
    const field = document.createElement('textarea');
    field.value = text;
    field.className = 'copy-fallback';
    field.readOnly = true;
    document.body.append(field);
    let copied = false;
    try {
      field.select();
      copied = document.execCommand('copy');
    } finally {
      field.remove();
      focused?.focus({ preventScroll: true });
    }
    if (!copied) throw new Error('Clipboard unavailable');
  }

  function hideStatus() {
    clearTimeout(hideTimer);
    status.classList.remove('is-visible');
  }

  function showStatus(message, failed = false) {
    clearTimeout(hideTimer);
    status.classList.remove('is-visible');
    statusLabel.textContent = message;
    status.classList.toggle('is-error', failed);
    // Restart the one-shot animation when copying again before dismissal.
    void status.offsetWidth;
    status.classList.add('is-visible');
    hideTimer = setTimeout(hideStatus, failed ? 2800 : 1800);
  }

  document.addEventListener('click', async (event) => {
    const trigger = event.target.closest('[data-copy-text]');
    if (!trigger) return;
    const text = trigger.dataset.copyText;
    if (!text) return;
    event.preventDefault();
    try {
      await copyText(text);
      const messages = { name: status.dataset.nameSuccess, email: status.dataset.emailSuccess, citation: status.dataset.citationSuccess };
      showStatus(messages[trigger.dataset.copyKind] || status.dataset.emailSuccess);
    } catch (_) {
      showStatus(status.dataset.failure, true);
    }
  });
})();
