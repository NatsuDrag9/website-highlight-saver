// background.js - Listens for summarization requests and calls OpenAI Chat Completions API.

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "summarize") {
    handleSummarizeRequest(request.text, sendResponse);
    return true; // Keep message channel open for asynchronous response
  }
});

// Call OpenAI API using the stored API key
async function handleSummarizeRequest(textToSummarize, sendResponse) {
  try {
    const result = await chrome.storage.local.get("openaiApiKey");
    const apiKey = result.openaiApiKey;

    if (!apiKey) {
      sendResponse({ 
        success: false, 
        error: "OpenAI API Key is missing. Add it in the settings panel." 
      });
      return;
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant. Summarize the following text selected from a webpage in 1 or 2 brief sentences."
          },
          {
            role: "user",
            content: textToSummarize
          }
        ],
        max_tokens: 100,
        temperature: 0.5
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || `HTTP error ${response.status}`;
      sendResponse({ 
        success: false, 
        error: `OpenAI Error: ${errorMessage}` 
      });
      return;
    }

    const data = await response.json();
    const summary = data.choices[0].message.content.trim();
    
    sendResponse({ 
      success: true, 
      summary: summary 
    });

  } catch (error) {
    console.error("background.js error:", error);
    sendResponse({ 
      success: false, 
      error: `Network/Server Error: ${error.message}` 
    });
  }
}
