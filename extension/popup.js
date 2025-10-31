async function captureTo(side) {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    console.log(`[Extension Popup] Capturing tab for side ${side}:`, tab);
    if (tab && tab.id) {
      const key = side === 'a' ? 'aTabId' : 'bTabId';
      await chrome.storage.local.set({ [key]: tab.id, lastWindowId: tab.windowId });
      console.log(`[Extension Popup] Saved tabId ${tab.id} for side ${side}`);
    }
    const imageDataUrl = await chrome.tabs.captureVisibleTab(undefined, { format: 'png' });
    await fetch('http://localhost:8080/api/extension/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ side, dataUrl: imageDataUrl })
    });
    console.log(`[Extension Popup] Uploaded initial screenshot for side ${side}`);
    alert(`Tab captured for URL ${side.toUpperCase()}! Now switch to DiffNator and set Render ${side.toUpperCase()} = "Chrome Tab (ext)"`);
    window.close();
  } catch (e) {
    console.error('capture error', e);
    alert('Capture failed. Make sure DiffNator is running on localhost:8080.');
  }
}

document.getElementById('capA').addEventListener('click', () => captureTo('a'));
document.getElementById('capB').addEventListener('click', () => captureTo('b'));

