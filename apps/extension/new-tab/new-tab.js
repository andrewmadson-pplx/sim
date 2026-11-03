const frame = document.querySelector('iframe')
const offline = document.getElementById('offline')
function updateConnection() {
  offline.hidden = navigator.onLine
  frame.hidden = !navigator.onLine
  if (navigator.onLine && !frame.hasAttribute('src')) frame.src = frame.dataset.src
}
window.addEventListener('online', updateConnection)
window.addEventListener('offline', updateConnection)
updateConnection()

document.getElementById('restore').addEventListener('click', () => {
  // Chrome owns the confirmation and reinstates the next enabled new-tab provider.
  chrome.management.uninstallSelf({ showConfirmDialog: true }, () => void chrome.runtime.lastError)
})
