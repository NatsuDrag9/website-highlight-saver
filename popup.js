// popup.js - Handles rendering saved highlights, copy, delete, and AI summarization.

// Developer Preview Mocking (allows opening popup.html directly in a browser tab)
if (typeof chrome === "undefined" || !chrome.storage || !chrome.storage.local) {
  console.info("Running in preview mode. Mocking chrome.storage API.");
  
  if (!localStorage.getItem("highlights")) {
    const mockHighlights = [
      {
        id: "hl_mock1",
        text: "The web development framework of choice for building modern, responsive user interfaces is Next.js, built on top of React.",
        url: "https://nextjs.org",
        title: "Next.js by Vercel - The React Framework",
        favicon: "https://www.google.com/s2/favicons?sz=64&domain=nextjs.org",
        createdAt: new Date(Date.now() - 3600000).toISOString()
      },
      {
        id: "hl_mock2",
        text: "Design aesthetics are extremely important. Use glassmorphism, linear gradients, and responsive layouts to stand out.",
        url: "https://refactoringui.com",
        title: "Refactoring UI - Design tips for developers",
        favicon: "https://www.google.com/s2/favicons?sz=64&domain=refactoringui.com",
        createdAt: new Date(Date.now() - 86400000).toISOString()
      }
    ];
    localStorage.setItem("highlights", JSON.stringify(mockHighlights));
  }

  window.chrome = {
    storage: {
      local: {
        get: function(defaults, callback) {
          const keys = typeof defaults === "string" ? [defaults] : Object.keys(defaults);
          const result = {};
          keys.forEach(key => {
            const val = localStorage.getItem(key);
            if (val !== null) {
              result[key] = JSON.parse(val);
            } else {
              result[key] = typeof defaults === "object" ? defaults[key] : undefined;
            }
          });
          setTimeout(() => callback(result), 10);
        },
        set: function(data, callback) {
          Object.keys(data).forEach(key => {
            localStorage.setItem(key, JSON.stringify(data[key]));
          });
          if (callback) setTimeout(callback, 10);
        }
      }
    },
    runtime: {
      sendMessage: function(message, callback) {
        setTimeout(() => {
          if (message.action === "summarize") {
            callback({
              success: true,
              summary: "This is a simulated AI summary. Next.js and React are standard modern choices for building web applications."
            });
          } else {
            callback({ success: false, error: "Unsupported mock action" });
          }
        }, 1200);
      },
      lastError: null
    }
  };
}

let allHighlights = [];

const highlightsContainer = document.getElementById("highlights-container");
const settingsToggleBtn = document.getElementById("settings-toggle-btn");
const settingsPanel = document.getElementById("settings-panel");
const apiKeyInput = document.getElementById("api-key-input");
const toggleKeyVisibilityBtn = document.getElementById("toggle-key-visibility");
const saveSettingsBtn = document.getElementById("save-settings-btn");
const clearAllBtn = document.getElementById("clear-all-btn");

document.addEventListener("DOMContentLoaded", () => {
  loadSettings();
  loadHighlights();
  setupEventListeners();
});

// Setup DOM event listeners
function setupEventListeners() {
  settingsToggleBtn.addEventListener("click", () => {
    settingsPanel.classList.toggle("hidden");
  });

  saveSettingsBtn.addEventListener("click", saveSettings);
  toggleKeyVisibilityBtn.addEventListener("click", toggleKeyVisibility);
  clearAllBtn.addEventListener("click", clearAllHighlights);
}

// Load settings from storage
function loadSettings() {
  chrome.storage.local.get("openaiApiKey", (result) => {
    if (result.openaiApiKey) {
      apiKeyInput.value = result.openaiApiKey;
    }
  });
}

// Save settings to storage
function saveSettings() {
  const apiKey = apiKeyInput.value.trim();
  
  chrome.storage.local.set({ openaiApiKey: apiKey }, () => {
    const originalText = saveSettingsBtn.textContent;
    saveSettingsBtn.textContent = "Saved!";
    saveSettingsBtn.style.backgroundColor = "#10b981"; // success green
    saveSettingsBtn.style.color = "#ffffff";
    
    setTimeout(() => {
      saveSettingsBtn.textContent = originalText;
      saveSettingsBtn.style.backgroundColor = "";
      saveSettingsBtn.style.color = "";
      settingsPanel.classList.add("hidden");
    }, 1200);
  });
}

// Toggle key field visibility
function toggleKeyVisibility() {
  if (apiKeyInput.type === "password") {
    apiKeyInput.type = "text";
    toggleKeyVisibilityBtn.textContent = "Hide";
  } else {
    apiKeyInput.type = "password";
    toggleKeyVisibilityBtn.textContent = "Show";
  }
}

// Fetch all highlights from storage
function loadHighlights() {
  chrome.storage.local.get({ highlights: [] }, (result) => {
    allHighlights = result.highlights.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    renderHighlights(allHighlights);
  });
}

// Render the list of highlight cards in HTML
function renderHighlights(highlights) {
  highlightsContainer.innerHTML = "";

  if (highlights.length === 0) {
    highlightsContainer.innerHTML = `
      <div class="empty-state">
        <svg class="empty-icon" viewBox="0 0 24 24">
          <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
        </svg>
        <p class="empty-text-title">No highlights saved yet</p>
        <p class="empty-text-sub">Select text on any webpage and click "Save Highlight" to save your first highlight.</p>
      </div>
    `;
    return;
  }

  highlights.forEach(hl => {
    const card = document.createElement("div");
    card.className = "highlight-card";
    card.dataset.id = hl.id;

    const dateFormatted = new Date(hl.createdAt).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    card.innerHTML = `
      <div class="card-header">
        <img class="site-favicon" src="${hl.favicon || 'icons/icon16.png'}" onerror="this.src='icons/icon16.png'" alt="Site icon">
        <a class="page-link" href="${hl.url}" target="_blank" title="${hl.title}">${hl.title}</a>
      </div>
      <blockquote class="highlight-quote">${escapeHtml(hl.text)}</blockquote>
      <div class="card-footer">
        <span class="date-stamp">${dateFormatted}</span>
        <div class="card-actions">
          <button class="action-btn ai-btn" title="AI Summarize">
            <svg viewBox="0 0 24 24">
              <path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7zm2.85 11.1l-.85.6V16h-4v-2.3l-.85-.6C7.8 12.16 7 10.63 7 9c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.63-.8 3.16-2.15 4.1z"/>
            </svg>
          </button>
          <button class="action-btn copy-btn" title="Copy to Clipboard">
            <svg viewBox="0 0 24 24">
              <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
            </svg>
          </button>
          <button class="action-btn delete-btn" title="Delete Highlight">
            <svg viewBox="0 0 24 24">
              <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
            </svg>
          </button>
        </div>
      </div>
      <div class="ai-summary-area"></div>
    `;

    card.querySelector(".copy-btn").addEventListener("click", () => copyHighlight(hl.text, card.querySelector(".copy-btn")));
    card.querySelector(".delete-btn").addEventListener("click", () => deleteHighlight(hl.id));
    card.querySelector(".ai-btn").addEventListener("click", () => requestAISummary(hl.text, card.querySelector(".ai-summary-area")));

    highlightsContainer.appendChild(card);
  });
}

// XSS Sanitizer
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

// Copy highlight text to clipboard
function copyHighlight(text, buttonElement) {
  navigator.clipboard.writeText(text).then(() => {
    const originalSvg = buttonElement.innerHTML;
    buttonElement.style.color = "#10b981"; // success green
    buttonElement.innerHTML = `
      <svg viewBox="0 0 24 24">
        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
      </svg>
    `;
    
    setTimeout(() => {
      buttonElement.style.color = "";
      buttonElement.innerHTML = originalSvg;
    }, 1200);
  }).catch(err => {
    console.error("Clipboard copy failed:", err);
  });
}

// Delete a highlight item
function deleteHighlight(id) {
  chrome.storage.local.get({ highlights: [] }, (result) => {
    const updatedHighlights = result.highlights.filter(hl => hl.id !== id);
    chrome.storage.local.set({ highlights: updatedHighlights }, () => {
      loadHighlights();
    });
  });
}

// Clear all highlights
function clearAllHighlights() {
  if (confirm("Delete all saved highlights? This action cannot be undone.")) {
    chrome.storage.local.set({ highlights: [] }, () => {
      loadHighlights();
      settingsPanel.classList.add("hidden");
    });
  }
}

// Call OpenAI summary API using background proxy message
function requestAISummary(text, summaryAreaElement) {
  if (summaryAreaElement.innerHTML !== "") {
    summaryAreaElement.innerHTML = "";
    return;
  }

  summaryAreaElement.innerHTML = `
    <div class="summary-loading">
      <div class="spinner"></div>
      <span>Generating AI Summary...</span>
    </div>
  `;

  chrome.runtime.sendMessage({ action: "summarize", text: text }, (response) => {
    if (chrome.runtime.lastError) {
      displaySummaryError(summaryAreaElement, `Communication Error: ${chrome.runtime.lastError.message}`);
      return;
    }

    if (response && response.success) {
      summaryAreaElement.innerHTML = `
        <div class="summary-box">
          <div class="summary-title">AI Summary</div>
          <p>${escapeHtml(response.summary)}</p>
        </div>
      `;
    } else {
      const errMsg = response ? response.error : "Unknown error.";
      displaySummaryError(summaryAreaElement, errMsg);
    }
  });
}

// Display errors inside card summary area
function displaySummaryError(container, errorText) {
  container.innerHTML = `
    <div class="summary-box" style="border-color: #ef4444; color: #ef4444;">
      <div class="summary-title" style="color: #ef4444;">Error</div>
      <p>${escapeHtml(errorText)}</p>
    </div>
  `;
}
