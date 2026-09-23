(() => {
  'use strict';
  const host = document.querySelector('.homepage-main');
  if (!host) return;
  const canvas = document.createElement('canvas');
  canvas.className = 'aa-space';
  canvas.setAttribute('aria-hidden', 'true');
  host.prepend(canvas);
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let width, height, stars = [], frame = 0, last = 0, time = 0;
  const pointer = { x: -1000, y: -1000 };
  function resize() {
    width = innerWidth;
    height = innerHeight;
    const ratio = Math.min(devicePixelRatio || 1, 1.5);
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    stars = Array.from({ length: Math.min(125, Math.round(width * height / 11000)) }, () => ({
      x: Math.random() * width, y: Math.random() * height,
      z: .3 + Math.random() * .7, phase: Math.random() * Math.PI * 2
    }));
    draw(0);
  }
  function draw(dt) {
    time += dt;
    ctx.clearRect(0, 0, width, height);
    // Broad, curved light trails give the dark canvas depth.
    for (let i = 0; i < 7; i++) {
      const offset = Math.sin(time * .13 + i * .45) * 45;
      const gradient = ctx.createLinearGradient(0, height, width, 0);
      gradient.addColorStop(0, 'rgba(235,40,62,0)');
      gradient.addColorStop(.3, `rgba(235,40,62,${.13 - i * .012})`);
      gradient.addColorStop(.7, 'rgba(120,145,190,.08)');
      gradient.addColorStop(1, 'rgba(120,145,190,0)');
      ctx.strokeStyle = gradient;
      ctx.lineWidth = i === 0 ? 1.5 : .7;
      ctx.beginPath();
      ctx.moveTo(-100, height * .85 + i * 26 + offset);
      ctx.bezierCurveTo(width * .3, height * .1 + offset, width * .65, height * 1.15, width + 100, height * .15 + i * 24);
      ctx.stroke();
    }
    for (let i = 0; i < stars.length; i++) {
      const s = stars[i];
      s.y -= dt * (3 + s.z * 8);
      s.x += dt * Math.sin(s.phase) * 3;
      if (s.y < -5) s.y = height + 5;
      if (s.x < -5) s.x = width + 5;
      if (s.x > width + 5) s.x = -5;
      for (let j = i + 1; j < stars.length; j++) {
        const b = stars[j];
        const distance = Math.hypot(s.x - b.x, s.y - b.y);
        if (distance > 140) continue;
        ctx.strokeStyle = `rgba(135,151,179,${(1 - distance / 140) * .2})`;
        ctx.lineWidth = .6;
        ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
      const near = Math.hypot(s.x - pointer.x, s.y - pointer.y);
      if (!motion.matches && near < 190) {
        ctx.strokeStyle = `rgba(255,65,80,${(1 - near / 190) * .5})`;
        ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(pointer.x, pointer.y); ctx.stroke();
      }
      const glow = .4 + .3 * Math.sin(time * .7 + s.phase);
      ctx.fillStyle = i % 5 === 0 ? `rgba(255,75,95,${glow + .2})` : `rgba(199,213,237,${glow})`;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.z * 1.8, 0, Math.PI * 2); ctx.fill();
    }
  }
  function tick(now) {
    frame = 0;
    if (document.hidden || motion.matches) return;
    if (now - last >= 32) {
      draw(last ? Math.min((now - last) / 1000, .05) : 0);
      last = now;
    }
    frame = requestAnimationFrame(tick);
  }
  function restart() {
    cancelAnimationFrame(frame);
    last = 0;
    draw(0);
    if (!motion.matches && !document.hidden) frame = requestAnimationFrame(tick);
  }
  addEventListener('resize', resize);
  addEventListener('pointermove', e => { pointer.x = e.clientX; pointer.y = e.clientY; }, { passive: true });
  document.addEventListener('pointerleave', () => { pointer.x = pointer.y = -1000; });
  document.addEventListener('visibilitychange', restart);
  motion.addEventListener('change', restart);
  resize();
  restart();

  // Highlight the sidebar shortcut for the section visible in the content panel.
  const panel = document.querySelector('.home-tab-page');
  const shortcuts = [...document.querySelectorAll('.home-tab-link[href*="#"]')];
  if (panel && shortcuts.length) {
    const targets = shortcuts.map(link => {
      const id = link.hash.slice(1);
      return { link, section: document.getElementById(id) };
    }).filter(item => item.section);
    const sectionTop = item => item.section.getBoundingClientRect().top - panel.getBoundingClientRect().top + panel.scrollTop;
    const titleOffset = 55;
    targets.forEach(item => {
      if (!item.link.getAttribute('href').startsWith('#')) return;
      item.link.addEventListener('click', event => {
        event.preventDefault();
        panel.scrollTo({ top: Math.max(0, sectionTop(item) - titleOffset), behavior: 'smooth' });
        history.replaceState(null, '', `#${item.section.id}`);
      });
    });
    const updateShortcut = () => {
      const top = panel.scrollTop + titleOffset + 20;
      const ordered = [...targets].sort((a, b) => sectionTop(a) - sectionTop(b));
      let active = ordered[0];
      for (const item of ordered) if (sectionTop(item) <= top) active = item;
      if (panel.scrollTop + panel.clientHeight >= panel.scrollHeight - 5) active = ordered[ordered.length - 1];
      shortcuts.forEach(link => {
        link.classList.remove('w--current');
        link.removeAttribute('aria-current');
        link.classList.toggle('is-section-active', active && link === active.link);
      });
    };
    panel.addEventListener('scroll', updateShortcut, { passive: true });
    const initial = targets.find(item => item.section.id === location.hash.slice(1));
    if (initial) requestAnimationFrame(() => panel.scrollTo({ top: Math.max(0, sectionTop(initial) - titleOffset) }));
    updateShortcut();
  }

  // Compact navigation drawer for phone-sized screens.
  const nav = document.querySelector('.home-tab-nav');
  if (nav) {
    nav.id = 'portfolio-navigation';
    const navParent = nav.parentNode;
    const navNextSibling = nav.nextSibling;
    const syncNavPlacement = () => {
      if (matchMedia('(max-width: 767px)').matches) {
        if (nav.parentNode !== document.body) document.body.append(nav);
      } else if (nav.parentNode !== navParent) {
        navParent.insertBefore(nav, navNextSibling);
      }
    };
    const navFooter = document.createElement('p');
    navFooter.className = 'aa-nav-footer';
    // navFooter.textContent = 'Explore portfolio';
    nav.append(navFooter);
    const toggle = document.createElement('button');
    toggle.className = 'aa-nav-toggle';
    toggle.type = 'button';
    toggle.setAttribute('aria-label', 'Open navigation');
    toggle.setAttribute('aria-controls', nav.id);
    toggle.setAttribute('aria-expanded', 'false');
    toggle.innerHTML = '<span></span><span></span><span></span>';
    const backdrop = document.createElement('button');
    backdrop.className = 'aa-nav-backdrop';
    backdrop.type = 'button';
    backdrop.setAttribute('aria-label', 'Close navigation');
    document.body.append(toggle, backdrop);
    const setOpen = open => {
      const mobile = matchMedia('(max-width: 767px)').matches;
      document.body.classList.toggle('aa-nav-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
      nav.setAttribute('aria-hidden', String(mobile && !open));
      if (mobile) nav.style.setProperty('transform', open ? 'translateX(0)' : 'translateX(-105%)', 'important');
      else nav.style.removeProperty('transform');
    };
    toggle.addEventListener('click', () => setOpen(!document.body.classList.contains('aa-nav-open')));
    backdrop.addEventListener('click', () => setOpen(false));
    nav.addEventListener('click', event => {
      const link = event.target.closest('.home-tab-link');
      if (link && matchMedia('(max-width: 767px)').matches) {
        const target = document.querySelector(link.hash);
        setOpen(false);
        if (target && panel) {
          setTimeout(() => {
            const top = target.getBoundingClientRect().top - panel.getBoundingClientRect().top + panel.scrollTop;
            panel.scrollTo({ top: Math.max(0, top - 55), behavior: 'smooth' });
          }, 60);
        }
      }
    });
    addEventListener('keydown', event => {
      if (event.key === 'Escape' && document.body.classList.contains('aa-nav-open')) {
        setOpen(false);
        toggle.focus();
      }
    });
    addEventListener('resize', () => {
      syncNavPlacement();
      if (!matchMedia('(max-width: 767px)').matches) setOpen(false);
    });
    syncNavPlacement();
    setOpen(false);
  }
})();
