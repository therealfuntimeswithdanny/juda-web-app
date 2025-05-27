// Global variables for links and the active link ID.
let links = [];
let activeLinkId = null;

// --- Storage Usage & Last Saved Updating ---

function updateStorageUsage() {
  const storageElem = document.getElementById('storageUsage');
  const linksString = JSON.stringify(links);
  const sizeBytes = new Blob([linksString]).size;
  const LIMIT_BYTES = 3145728; // 3 MB in bytes.
  const sizeKB = sizeBytes / 1024;
  let sizeDisplay;
  
  if (sizeKB < 1024) {
    sizeDisplay = sizeKB.toFixed(2) + " KB";
  } else {
    const sizeMB = sizeKB / 1024;
    sizeDisplay = sizeMB.toFixed(2) + " MB";
  }
  
  const usagePercent = (sizeBytes / LIMIT_BYTES) * 100;
  const usageText = "Storage used: " + sizeDisplay + " (" + usagePercent.toFixed(0) + "%) / 3 MB";
  
  // Set color based on thresholds.
  const ratio = sizeBytes / LIMIT_BYTES;
  let color;
  if (ratio < 0.5) {
    color = "green";
  } else if (ratio < 0.75) {
    color = "yellow";
  } else if (ratio < 0.9) {
    color = "orange";
  } else {
    color = "red";
  }
  
  storageElem.textContent = usageText;
  storageElem.style.color = color;
}

function updateLastSaved() {
  const lastSavedElem = document.getElementById('lastSaved');
  const now = new Date();
  lastSavedElem.textContent = "Last Saved: " + now.toLocaleTimeString();
}

// --- Link Persistence & Rendering ---

function loadLinks() {
  const saved = localStorage.getItem('judaLinks');
  links = saved ? JSON.parse(saved) : [];
  renderLinksList();
  renderPinnedLinks();
}

function persistLinks() {
  localStorage.setItem('judaLinks', JSON.stringify(links));
  updateStorageUsage();
}

function renderLinksList() {
  const linksList = document.getElementById('linksList');
  linksList.innerHTML = "";
  
  if (links.length === 0) {
    const emptyMessage = document.createElement('li');
    emptyMessage.textContent = "No saved links.";
    emptyMessage.style.fontStyle = "italic";
    emptyMessage.style.color = "#555";
    linksList.appendChild(emptyMessage);
  } else {
    links.forEach(link => {
      const li = document.createElement('li');
      li.textContent = link.title || "Untitled";
      li.dataset.id = link.id;
      li.addEventListener("click", () => loadLink(link.id));
      linksList.appendChild(li);
    });
  }
}

// Render pinned links (up to 6)
function renderPinnedLinks() {
  const pinnedContainer = document.getElementById('pinnedLinksList');
  pinnedContainer.innerHTML = "";
  
  const pinnedLinks = links.filter(link => link.pinned);
  pinnedLinks.slice(0,6).forEach(link => {
    const div = document.createElement('div');
    div.classList.add('pinnedLinkItem');
    
    // Display OG Image if available.
    if (link.ogImage) {
      const img = document.createElement('img');
      img.src = link.ogImage;
      div.appendChild(img);
    }
    
    // Display OG title if available, fall back to link title.
    const h4 = document.createElement('h4');
    h4.textContent = link.ogTitle || link.title || "Untitled";
    div.appendChild(h4);
    
    // Display OG description if available.
    if (link.ogDescription) {
      const p = document.createElement('p');
      p.textContent = link.ogDescription;
      div.appendChild(p);
    }
    
    // Unpin button.
    const unpinBtn = document.createElement('button');
    unpinBtn.innerHTML = '<i class="fa-solid fa-times"></i>';
    unpinBtn.classList.add('unpinBtn');
    unpinBtn.title = "Unpin Link";
    unpinBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      unpinLink(link.id);
    });
    div.appendChild(unpinBtn);
    
    pinnedContainer.appendChild(div);
  });
}

// --- Link CRUD Operations ---

function createNewLink() {
  const newLink = {
    id: Date.now().toString(),
    title: "Untitled",
    url: "",
    updatedAt: new Date(),
    pinned: false,
    // OG metadata placeholders:
    ogTitle: "",
    ogDescription: "",
    ogImage: ""
  };
  links.push(newLink);
  persistLinks();
  renderLinksList();
  renderPinnedLinks();
  loadLink(newLink.id);
}

function loadLink(id) {
  const link = links.find(l => l.id === id);
  if (link) {
    activeLinkId = link.id;
    document.getElementById('linkTitle').value = link.title;
    document.getElementById('linkURL').value = link.url;
  }
}

function saveActiveLink(auto = false) {
  if (activeLinkId) {
    const link = links.find(l => l.id === activeLinkId);
    if (link) {
      link.title = document.getElementById('linkTitle').value;
      link.url = document.getElementById('linkURL').value;
      link.updatedAt = new Date();
      persistLinks();
      renderLinksList();
      updateLastSaved();
      if (!auto) alert("Link saved!");
    }
  }
}

function deleteActiveLink() {
  if (activeLinkId) {
    links = links.filter(l => l.id !== activeLinkId);
    persistLinks();
    renderLinksList();
    renderPinnedLinks();
    document.getElementById('linkTitle').value = "";
    document.getElementById('linkURL').value = "";
    activeLinkId = null;
  }
}

function openActiveLink() {
  if (activeLinkId) {
    const link = links.find(l => l.id === activeLinkId);
    if (link && link.url) {
      window.open(link.url, '_blank');
    } else {
      alert("No valid URL to open.");
    }
  }
}

function exportAllLinks() {
  const jsonLinks = JSON.stringify(links, null, 2);
  const blob = new Blob([jsonLinks], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "juda_links_backup.json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function handleImportLinks(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const importedLinks = JSON.parse(e.target.result);
      if (!Array.isArray(importedLinks)) {
        alert("Invalid file format. Expected a JSON array of links.");
        return;
      }
      if (confirm("Press OK to merge imported links with your current links, or Cancel to replace them.")) {
        links = links.concat(importedLinks);
      } else {
        links = importedLinks;
      }
      persistLinks();
      renderLinksList();
      renderPinnedLinks();
      alert("Links imported successfully.");
    } catch (err) {
      alert("Error parsing JSON: " + err.message);
    }
  };
  reader.readAsText(file);
  event.target.value = "";
}

// --- Pin/Unpin ---
// When the user clicks "Pin Link", get OG metadata then mark the active link as pinned.
function pinActiveLink() {
  if (!activeLinkId) {
    alert("Please select or save a link first.");
    return;
  }
  
  // Check max pinned count (6)
  const currentPinned = links.filter(l => l.pinned);
  if (currentPinned.length >= 6) {
    alert("Maximum of 6 pinned links reached.");
    return;
  }
  
  const link = links.find(l => l.id === activeLinkId);
  if (link) {
    // Fetch OG metadata and then mark as pinned.
    fetchOgMetadata(link.url)
      .then(ogData => {
        // Update link with OG data.
        link.ogTitle = ogData.title || link.title;
        link.ogDescription = ogData.description || "";
        link.ogImage = ogData.image || "";
        link.pinned = true;
        persistLinks();
        renderLinksList();
        renderPinnedLinks();
        alert("Link pinned!");
      })
      .catch(error => {
        console.error("Error fetching OG metadata:", error);
        alert("Error fetching metadata. Link pinned without metadata.");
        link.pinned = true;
        persistLinks();
        renderLinksList();
        renderPinnedLinks();
      });
  }
}

// Unpin a link by its id.
function unpinLink(id) {
  const link = links.find(l => l.id === id);
  if (link) {
    link.pinned = false;
    persistLinks();
    renderPinnedLinks();
    renderLinksList();
  }
}

// --- Open Graph Metadata Fetching ---
// Use an open CORS proxy (e.g., All Origins) to fetch meta data.
function fetchOgMetadata(url) {
  // Using All Origins; note: this URL might change based on the proxy service.
  const proxyUrl = "https://api.allorigins.hexocode.repl.co/get?disableCache=true&url=";
  return fetch(proxyUrl + encodeURIComponent(url))
    .then(response => {
      if (response.ok) return response.json();
      else throw new Error("Network response was not ok.");
    })
    .then(data => {
      const html = data.contents;
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");
      const ogTitleTag = doc.querySelector('meta[property="og:title"]');
      const ogDescriptionTag = doc.querySelector('meta[property="og:description"]');
      const ogImageTag = doc.querySelector('meta[property="og:image"]');
      return {
        title: ogTitleTag ? ogTitleTag.getAttribute("content") : "",
        description: ogDescriptionTag ? ogDescriptionTag.getAttribute("content") : "",
        image: ogImageTag ? ogImageTag.getAttribute("content") : ""
      };
    });
}

// --- Toolbar Setup ---
// For Juda Links, we attach a click listener to the "Pin Link" button along with our basic UI.
function setupToolbar() {
  document.getElementById('pinLinkBtn').addEventListener('click', pinActiveLink);
}

// --- Event Listeners for Control Buttons ---
document.getElementById('newLinkBtn').addEventListener('click', createNewLink);
document.getElementById('saveLinkBtn').addEventListener('click', () => saveActiveLink());
document.getElementById('deleteLinkBtn').addEventListener('click', deleteActiveLink);
document.getElementById('openLinkBtn').addEventListener('click', openActiveLink);
document.getElementById('exportLinksBtn').addEventListener('click', exportAllLinks);
document.getElementById('importLinksBtn').addEventListener('click', () => {
  document.getElementById('importFileInput').click();
});
document.getElementById('importFileInput').addEventListener('change', handleImportLinks);

// --- Initialize the App ---
setupToolbar();
loadLinks();
updateStorageUsage();

// Auto-save the active link every 3 seconds (silent auto-save).
setInterval(() => {
  if (activeLinkId) {
    saveActiveLink(true);
  }
}, 3000);
