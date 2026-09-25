export function initTestimonials(root = document) {
  const section = root.querySelector('[data-testimonials]');
  if (!section) return;

  const track = section.querySelector('[data-testimonials-track]');
  if (!track) return;

  let offset = 0;
  let speed = 78;
  let targetSpeed = 78;
  let last = 0;

  track.addEventListener('mouseenter', () => { targetSpeed = 26; });
  track.addEventListener('mouseleave', () => { targetSpeed = 78; });

  const tick = (ts) => {
    const dt = last ? Math.min(0.05, (ts - last) / 1000) : 0;
    last = ts;
    speed += (targetSpeed - speed) * 0.06;
    offset += speed * dt;

    const half = track.scrollWidth / 2;
    if (half > 0 && offset >= half) offset -= half;

    track.style.transform = `translate3d(${-offset}px,0,0)`;
    requestAnimationFrame(tick);
  };

  requestAnimationFrame(tick);
}
