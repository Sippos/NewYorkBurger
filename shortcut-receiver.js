(() => {
  const params = new URLSearchParams(window.location.search)
  if (params.get('share-target') !== 'videos') return

  const findUrl = (...values) => {
    const text = values.filter(Boolean).join(' ')
    const match = text.match(/https?:\/\/[^\s]+/i)
    return match ? match[0].replace(/[),.]+$/, '') : ''
  }

  const sharedUrl = params.get('url') || findUrl(params.get('text'), params.get('title'))
  const sharedTitle = params.get('title') || ''
  if (!sharedUrl) return

  window.__NYB_SHARED_VIDEO__ = { url: sharedUrl, title: sharedTitle }
  if (window.location.hash !== '#/videos') window.location.hash = '/videos'

  const setValue = (input, value) => {
    if (!input || !value || input.value === value) return
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
    if (setter) setter.call(input, value)
    else input.value = value
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.dispatchEvent(new Event('change', { bubbles: true }))
  }

  const fill = () => {
    const inputs = Array.from(document.querySelectorAll('input'))
    const urlInput = inputs.find((input) => /youtube|tiktok|instagram|link/i.test(input.placeholder || ''))
    const titleInput = inputs.find((input) => /title/i.test(input.placeholder || ''))
    setValue(urlInput, sharedUrl)
    setValue(titleInput, sharedTitle)
  }

  let tries = 0
  const timer = window.setInterval(() => {
    fill()
    tries += 1
    if (tries > 60) window.clearInterval(timer)
  }, 250)

  window.addEventListener('load', fill)
})()
