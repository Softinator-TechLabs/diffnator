# Chrome Extension Debugging Guide

## Current Issue
You're seeing: `⚠️ Chrome Tab A: No response from extension`

This means the frontend created a WebRTC offer, but the extension didn't respond with an answer within 10 seconds.

## Step-by-Step Debugging

### Step 1: Verify Extension is Loaded
1. Open Chrome
2. Go to `chrome://extensions/`
3. Look for "DiffNator Tab Capture"
4. Make sure it's **enabled** (toggle should be blue/on)
5. If you don't see it, click "Load unpacked" and select: `/Users/suyogdixit/Development/diff/extension`

### Step 2: Check Extension Background Script
1. On `chrome://extensions/`, find "DiffNator Tab Capture"
2. Click the **"service worker"** link (it should say "Inspect views service worker")
   - If you see "Inactive", click it to wake it up
3. This opens the extension's console
4. You should see logs like:
   ```
   [Extension] No tabId stored for side a
   [Extension] No tabId stored for side b
   ```
   This is normal if you haven't captured a tab yet.

### Step 3: Capture a Tab
1. Open a new tab with the URL you want to capture (e.g., https://www.revolut.com/)
2. Click the DiffNator extension icon in Chrome toolbar (puzzle piece icon → DiffNator Tab Capture)
3. Click **"Capture URL A"**
4. Check the extension console - you should see:
   ```
   [Extension Popup] Capturing tab for side a: {id: XXX, ...}
   [Extension Popup] Saved tabId XXX for side a
   [Extension Popup] Uploaded initial screenshot for side a
   ```
5. You should see an alert: "Tab captured for URL A! Now switch to DiffNator..."
6. Click OK

### Step 4: Verify Tab ID is Stored
In the extension console, type:
```javascript
chrome.storage.local.get(['aTabId', 'bTabId'], (result) => console.log(result));
```
You should see: `{aTabId: XXX}` where XXX is a number.

### Step 5: Check Extension is Polling
In the extension console, you should see periodic logs (every 1 second):
```
[Extension] Received offer for side a, tabId: XXX
```
OR
```
[Extension] No tabId stored for side a
```

If you see neither, the background script may not be running. Try:
1. Go to `chrome://extensions/`
2. Click the **reload** icon for DiffNator Tab Capture
3. Go back to the extension console (click "service worker" again)

### Step 6: Test in DiffNator
1. Go to http://localhost:8080/
2. Set **"Render A"** to **"Chrome Tab (ext)"**
3. Open browser console (F12)
4. You should see:
   ```
   [DiffNator] Starting Chrome Tab receiver for side a
   [DiffNator] Created offer for side a, posting to server
   ```

### Step 7: Check Server Logs
In your terminal where `npm start` is running, you should see:
```
[Server] Received WebRTC offer from frontend for side a
[Server] Extension polling for offer on side a - offer available
```

If you see the first line but NOT the second, the extension is not polling the server.

### Step 8: Check Extension Receives Offer
In the extension console, you should now see:
```
[Extension] Received offer for side a, tabId: XXX
[Extension] Focusing tab XXX for capture
[Extension] Tab capture successful MediaStream {...}
[Extension] Added 1 tracks to peer connection
[Extension] Sending answer for side a
```

### Step 9: Check Frontend Receives Answer
In the DiffNator console (browser F12), you should see:
```
[DiffNator] Received answer for side a
[DiffNator] Connection state for side a: connecting
[DiffNator] Sending ICE candidate for side a
[DiffNator] Connection state for side a: connected
[DiffNator] Received track for side a MediaStream {...}
```

### Step 10: Video Should Appear
The video element should now show the captured tab.

## Common Problems & Solutions

### Problem: Extension console shows "No tabId stored"
**Solution**: You need to capture the tab first (Step 3)

### Problem: Extension console shows nothing (no logs at all)
**Solution**: 
- The background script is not running
- Go to `chrome://extensions/` and reload the extension
- Click "service worker" to open the console
- You should immediately see polling logs

### Problem: "Tab capture error: Extension has not been invoked..."
**Solution**:
- This happens if you try to capture before clicking the extension icon
- Make sure you're clicking the extension popup button, not just loading the page

### Problem: Tab keeps switching focus
**Solution**:
- This is expected briefly when starting capture (Chrome requirement)
- The extension should restore your previous tab within 1 second
- If it keeps switching, check extension console for errors

### Problem: Video is black
**Solution**:
- The captured tab may have been closed
- Try capturing again
- Make sure the tab is still open

### Problem: "Failed to fetch" in extension console
**Solution**:
- DiffNator server is not running
- Run `npm start` in `/Users/suyogdixit/Development/diff`
- Verify it's running: `curl http://localhost:8080/health`

### Problem: CORS errors
**Solution**:
- The manifest should have `"host_permissions": ["http://localhost:8080/*"]`
- Reload the extension after changing manifest.json

## Manual Test Commands

### Test if server is running:
```bash
curl http://localhost:8080/health
```

### Test if extension can reach server:
In extension console:
```javascript
fetch('http://localhost:8080/health').then(r => r.text()).then(console.log);
```

### Check stored tab IDs:
In extension console:
```javascript
chrome.storage.local.get(null, console.log);
```

### Clear stored tab IDs (to start fresh):
In extension console:
```javascript
chrome.storage.local.clear(() => console.log('Cleared'));
```

### Force a capture attempt:
In extension console (replace XXX with actual tab ID):
```javascript
chrome.tabs.query({active: true, currentWindow: true}, ([tab]) => {
  chrome.storage.local.set({aTabId: tab.id}, () => console.log('Set', tab.id));
});
```

## Expected Flow Summary

1. **User clicks "Capture URL A"** → Extension saves tabId, uploads screenshot
2. **User sets Render A = "Chrome Tab (ext)"** → Frontend creates WebRTC offer
3. **Frontend posts offer to server** → Server stores offer
4. **Extension polls server** → Extension receives offer
5. **Extension captures tab** → Extension gets MediaStream
6. **Extension creates answer** → Extension posts answer to server
7. **Frontend polls for answer** → Frontend receives answer
8. **ICE candidates exchanged** → Connection established
9. **Video stream starts** → User sees live tab

If any step fails, check the corresponding console for error messages.

