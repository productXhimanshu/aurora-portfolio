export function initShip(root = document) {
  const ship = root.querySelector('[data-ship]');
  if (!ship) return;

  const scene = ship.querySelector('[data-ship-scene]');
  if (!scene) return;

  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      ship.classList.add('is-in');
      observer.disconnect();
    }
  }, { threshold: 0.4 });

  observer.observe(scene);
}
