const year = document.getElementById("year");
if (year) {
  year.textContent = new Date().getFullYear();
}

const glow = document.getElementById("cursorGlow");
if (glow) {
  window.addEventListener("pointermove", (event) => {
    glow.style.left = `${event.clientX}px`;
    glow.style.top = `${event.clientY}px`;
  });
}
