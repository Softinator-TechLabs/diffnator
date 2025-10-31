# Chrome Tab Capture Testing Guide

## Setup Steps

### 1. Load the Extension
1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `/Users/suyogdixit/Development/diff/extension` folder
5. Note the extension ID (you'll see it under the extension name)

### 2. Start DiffNator
```bash
cd /Users/suyogdixit/Development/diff
npm start
```

### 3. Capture a Tab
1. Open the tab you want to capture (e.g., https://www.revolut.com/)
2. Click the DiffNator extension icon in Chrome toolbar
3. Click "Capture URL A" (or "Capture URL B")
4. You should see an alert confirming the capture
5. The popup will close automatically

### 4. View in DiffNator
1. Go to http://localhost:8080/
2. Set "Render A" (or "Render B") to "Chrome Tab (ext)"
3. The live video stream should appear within 2-3 seconds

## Troubleshooting

### Check Console Logs

**DiffNator Console** (http://localhost:8080/):
- Open DevTools (F12)
- Look for messages starting with `[DiffNator]`
- You should see:
  - "Starting Chrome Tab receiver for side a"
  - "Created offer for side a, posting to server"
  - "Received answer for side a"
  - "Connection state for side a: connecting" → "connected"
  - "Received track for side a"

**Extension Console**:
- Go to `chrome://extensions/`
- Find "DiffNator Chrome Tab Capture"
- Click "service worker" (or "background page")
- Look for messages starting with `[Extension]`
- You should see:
  - "Received offer for side a, tabId: XXX"
  - "Focusing tab XXX for capture"
  - "Tab capture successful"
  - "Added 1 tracks to peer connection"
  - "Sending answer for side a"

### Common Issues

**No video appears**:
- Make sure you clicked "Capture URL A/B" on the target tab first
- Check that the extension is loaded and enabled
- Verify DiffNator server is running on localhost:8080
- Look for error messages in both consoles

**Tab keeps switching**:
- This was fixed - the extension now briefly focuses the target tab only when starting capture, then restores your previous tab
- If it still happens, check the extension console for errors

**"No response from extension" warning**:
- The extension is not running or not polling
- Reload the extension: go to `chrome://extensions/` and click the reload icon
- Make sure you captured the tab first (step 3 above)

**Video is black or frozen**:
- The captured tab may have been closed
- Try capturing again
- Check if the tab is still open and accessible

## How It Works

1. **Capture**: When you click "Capture URL A/B", the extension:
   - Saves the current tab ID to storage
   - Takes an initial screenshot and uploads it to DiffNator
   - Starts polling for WebRTC offers from DiffNator

2. **Connect**: When you set Render mode to "Chrome Tab (ext)", DiffNator:
   - Creates a WebRTC offer and posts it to the server
   - The extension polls for the offer
   - The extension starts `chrome.tabCapture` on the saved tab
   - The extension creates a WebRTC answer and sends it back
   - ICE candidates are exchanged
   - The video stream is established

3. **Stream**: The extension continuously streams the captured tab to DiffNator:
   - Live video appears in the DiffNator viewport
   - Scrolling in DiffNator sends commands to the extension
   - The extension scrolls the real tab in the background
   - The video stream updates automatically

## Next Steps

Once you confirm it's working:
- Test with both URL A and URL B
- Try scrolling (should scroll the captured tab in background)
- Try with secure/logged-in pages
- Test overlay mode with one Chrome Tab and one proxy/screenshot

