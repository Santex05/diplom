(function () {
  const slides = [...document.querySelectorAll('.slide')]
  const speechLines = document.querySelectorAll('[data-speech]')
  const speechPanel = document.getElementById('speech-panel')
  const speechText = document.getElementById('speech-text')
  const numEl = document.getElementById('slide-num')
  let idx = 0

  function show(i) {
    idx = (i + slides.length) % slides.length
    slides.forEach((s, n) => s.classList.toggle('active', n === idx))
    numEl.textContent = `${idx + 1} / ${slides.length}`
    const line = speechLines[idx]
    if (line && speechText) speechText.textContent = line.textContent.trim()
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
      e.preventDefault()
      show(idx + 1)
    }
    if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
      e.preventDefault()
      show(idx - 1)
    }
    if (e.key === 'Home') show(0)
    if (e.key === 'End') show(slides.length - 1)
    if (e.key === 's' || e.key === 'S') speechPanel?.classList.toggle('hidden')
  })

  document.getElementById('speech-toggle')?.addEventListener('click', () => {
    speechPanel?.classList.toggle('hidden')
  })

  show(0)
})()
