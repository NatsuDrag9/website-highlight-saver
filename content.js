// content.js - Handles page text selection, floating save tooltip, and visual highlighting.

let tooltipContainer = null;
let shadowRoot = null;
let currentSelectionText = "";

// Inject style tag to style highlight marks on the host page
const style = document.createElement("style");
style.textContent = `
  .web-highlight-saver-mark {
    background-color: #fde047 !important;
    color: #0f172a !important;
    border-radius: 4px;
    padding: 2px 0px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }
`;
document.head.appendChild(style);

init();

function init() {
  document.addEventListener("mouseup", handleMouseUp);
  document.addEventListener("mousedown", handleMouseDown);
  restorePageHighlights();
}

// Show tooltip above selection on mouseup
function handleMouseUp() {
  setTimeout(() => {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();

    if (!selectedText) {
      hideTooltip();
      return;
    }

    currentSelectionText = selectedText;
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    const tooltipX = rect.left + rect.width / 2 + window.scrollX;
    const tooltipY = rect.top + window.scrollY - 45;

    showTooltip(tooltipX, tooltipY);
  }, 10);
}

// Hide tooltip if clicking outside of it
function handleMouseDown(event) {
  if (tooltipContainer && !tooltipContainer.contains(event.target)) {
    setTimeout(() => {
      if (window.getSelection().isCollapsed) {
        hideTooltip();
      }
    }, 100);
  }
}

// Creates the tooltip button inside isolated Shadow DOM
function showTooltip(x, y) {
  if (!tooltipContainer) {
    tooltipContainer = document.createElement("div");
    tooltipContainer.id = "web-highlight-saver-tooltip-root";
    tooltipContainer.style.position = "absolute";
    tooltipContainer.style.zIndex = "2147483647";
    tooltipContainer.style.pointerEvents = "auto";
    
    shadowRoot = tooltipContainer.attachShadow({ mode: "open" });
    shadowRoot.innerHTML = `
      <style>
        .tooltip-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          background-color: #000000;
          color: #ffffff;
          border: 1px solid #000000;
          padding: 6px 10px;
          border-radius: 2px;
          font-family: system-ui, sans-serif;
          font-size: 12px;
          font-weight: bold;
          cursor: pointer;
          user-select: none;
        }
        .tooltip-btn:hover {
          background-color: #333333;
        }
        .icon {
          width: 12px;
          height: 12px;
          fill: currentColor;
        }
      </style>
      <button class="tooltip-btn" id="save-highlight-btn">
        <svg class="icon" viewBox="0 0 24 24">
          <path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2zm0 15l-5-2.18L7 18V5h10v13z"/>
        </svg>
        Save Highlight
      </button>
    `;
    
    document.body.appendChild(tooltipContainer);
    shadowRoot.getElementById("save-highlight-btn").addEventListener("click", saveHighlight);
  }
  
  tooltipContainer.style.left = `${x}px`;
  tooltipContainer.style.top = `${y}px`;
  tooltipContainer.style.transform = "translateX(-50%)";
  tooltipContainer.style.display = "block";
}

function hideTooltip() {
  if (tooltipContainer) {
    tooltipContainer.style.display = "none";
  }
}

// Save highlight details to local chrome storage
function saveHighlight() {
  if (!currentSelectionText) return;

  const pageUrl = window.location.href;
  const pageTitle = document.title || "Untitled Page";
  const faviconUrl = `https://www.google.com/s2/favicons?sz=64&domain=${window.location.hostname}`;
  const highlightId = "hl_" + Date.now();

  const highlightItem = {
    id: highlightId,
    text: currentSelectionText,
    url: pageUrl,
    title: pageTitle,
    favicon: faviconUrl,
    createdAt: new Date().toISOString()
  };

  chrome.storage.local.get({ highlights: [] }, (result) => {
    const highlights = result.highlights;
    highlights.push(highlightItem);
    
    chrome.storage.local.set({ highlights: highlights }, () => {
      applyVisualHighlight();
      hideTooltip();
      window.getSelection().removeAllRanges();
    });
  });
}

// Wraps the range in a mark tag, falls back to text-node wrapping if range is complex
function applyVisualHighlight() {
  const selection = window.getSelection();
  if (selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    const mark = document.createElement("mark");
    mark.className = "web-highlight-saver-mark";
    
    try {
      range.surroundContents(mark);
    } catch (e) {
      wrapSelectionTextNodes(range);
    }
  }
}

// Fallback wrapping helper
function wrapSelectionTextNodes(range) {
  const documentFragment = range.extractContents();
  const mark = document.createElement("mark");
  mark.className = "web-highlight-saver-mark";
  mark.appendChild(documentFragment);
  range.insertNode(mark);
}

// Restore saved highlights matching current URL on page load
function restorePageHighlights() {
  const currentUrl = window.location.href;
  chrome.storage.local.get({ highlights: [] }, (result) => {
    const pageHighlights = result.highlights.filter(hl => hl.url === currentUrl);
    pageHighlights.forEach(hl => {
      findAndHighlightText(document.body, hl.text);
    });
  });
}

// Recursively walks the DOM tree to match and wrap target text
function findAndHighlightText(rootNode, textToFind) {
  if (!textToFind || !rootNode) return;

  const walker = document.createTreeWalker(
    rootNode,
    NodeFilter.SHOW_TEXT,
    null,
    false
  );

  const textNodes = [];
  while (walker.nextNode()) {
    textNodes.push(walker.currentNode);
  }

  for (let i = textNodes.length - 1; i >= 0; i--) {
    const node = textNodes[i];
    const nodeValue = node.nodeValue;
    const index = nodeValue.indexOf(textToFind);

    if (index !== -1 && 
        node.parentNode.className !== "web-highlight-saver-mark" && 
        node.parentNode.tagName !== "SCRIPT" && 
        node.parentNode.tagName !== "STYLE") {
      
      const matchNode = node.splitText(index);
      matchNode.splitText(textToFind.length);

      const mark = document.createElement("mark");
      mark.className = "web-highlight-saver-mark";
      
      matchNode.parentNode.insertBefore(mark, matchNode);
      mark.appendChild(matchNode);
    }
  }
}
