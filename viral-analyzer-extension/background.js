chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_STREAM_ID') {
    chrome.tabCapture.getMediaStreamId(
      { targetTabId: message.tabId },
      (streamId) => {
        if (chrome.runtime.lastError) {
          sendResponse({ error: chrome.runtime.lastError.message });
        } else {
          sendResponse({ streamId });
        }
      }
    );
    return true;
  }
});
