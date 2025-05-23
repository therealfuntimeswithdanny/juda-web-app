// Hide the loader overlay when the content is fully loaded.
window.addEventListener('load', function() {
  const loader = document.getElementById('loader');
  loader.style.opacity = 0;
  setTimeout(() => {
    loader.style.display = 'none';
  }, 500);
});

// Global variables for notes and the active note ID.
let notes = [];
let activeNoteId = null;

// Update storage usage based on the size of the notes (3 MB limit).
function updateStorageUsage() {
  const storageElem = document.getElementById('storageUsage');
  const notesString = JSON.stringify(notes);
  const sizeBytes = new Blob([notesString]).size;
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

  // Color-coding based on usage percentage.
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

// Update the "Last Saved" display.
function updateLastSaved() {
  const lastSavedElem = document.getElementById('lastSaved');
  const now = new Date();
  lastSavedElem.textContent = "Last Saved: " + now.toLocaleTimeString();
}

// Load notes from localStorage.
function loadNotes() {
  const saved = localStorage.getItem('notes');
  notes = saved ? JSON.parse(saved) : [];
  renderNotesList();
}

// Save notes to localStorage and update the storage usage.
function persistNotes() {
  localStorage.setItem('notes', JSON.stringify(notes));
  updateStorageUsage();
}

// Render the list of saved notes in the sidebar.
function renderNotesList() {
  const notesList = document.getElementById('notesList');
  notesList.innerHTML = "";

  if (notes.length === 0) {
    const emptyMessage = document.createElement('li');
    emptyMessage.textContent = "No saved notes.";
    emptyMessage.style.fontStyle = "italic";
    emptyMessage.style.color = "#555";
    notesList.appendChild(emptyMessage);
  } else {
    notes.forEach(note => {
      const li = document.createElement('li');
      li.textContent = note.title || "Untitled note";
      li.dataset.id = note.id;
      li.addEventListener("click", () => loadNote(note.id));
      notesList.appendChild(li);
    });
  }
}

// Create a new note.
function createNewNote() {
  const newNote = {
    id: Date.now().toString(),
    title: "Untitled note",
    content: "", // New note starts empty.
    updatedAt: new Date()
  };
  notes.push(newNote);
  persistNotes();
  renderNotesList();
  loadNote(newNote.id);
}

// Load a specific note into the editor.
function loadNote(id) {
  const note = notes.find(n => n.id === id);
  if (note) {
    activeNoteId = note.id;
    document.getElementById("noteTitle").value = note.title;
    document.getElementById("noteContent").innerHTML = note.content;
  }
}

// Save the active note. If 'auto' is true, no alert is shown.
function saveActiveNote(auto = false) {
  if (activeNoteId) {
    const note = notes.find(n => n.id === activeNoteId);
    if (note) {
      note.title = document.getElementById("noteTitle").value;
      note.content = document.getElementById("noteContent").innerHTML;
      note.updatedAt = new Date();
      persistNotes();
      renderNotesList();
      updateLastSaved();
      if (!auto) {
        alert("Note saved!");
      }
    }
  }
}

// Delete the active note.
function deleteActiveNote() {
  if (activeNoteId) {
    notes = notes.filter(n => n.id !== activeNoteId);
    persistNotes();
    renderNotesList();
    document.getElementById("noteTitle").value = "";
    document.getElementById("noteContent").innerHTML =
      'Click "New Note" on the Sidebar then start Typing or Select a Note to Edit';
    activeNoteId = null;
  }
}

// Export the active note as an HTML file.
function exportActiveNote() {
  if (activeNoteId) {
    const note = notes.find(n => n.id === activeNoteId);
    if (note) {
      const fileContent = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <title>${note.title}</title>
  </head>
  <body>
    ${note.content}
  </body>
</html>`;
      const blob = new Blob([fileContent], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = note.title ? note.title + ".html" : "note.html";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }
}

// Export all notes as a JSON file.
function exportAllNotes() {
  const jsonNotes = JSON.stringify(notes, null, 2);
  const blob = new Blob([jsonNotes], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "notes_backup.json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Import notes from a JSON file.
function handleImportNotes(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const importedNotes = JSON.parse(e.target.result);
      if (!Array.isArray(importedNotes)) {
        alert("Invalid file format. Expected a JSON array of notes.");
        return;
      }
      if (confirm("Press OK to merge imported notes with your current notes, or Cancel to replace them.")) {
        notes = notes.concat(importedNotes);
      } else {
        notes = importedNotes;
      }
      persistNotes();
      renderNotesList();
      alert("Notes imported successfully.");
    } catch (err) {
      alert("Error parsing JSON: " + err.message);
    }
  };
  reader.readAsText(file);
  event.target.value = "";
}

// Set up the toolbar for rich text commands.
function setupToolbar() {
  document.querySelectorAll("#toolbar button[data-command]").forEach(button => {
    button.addEventListener("click", () => {
      const command = button.getAttribute("data-command");
      document.execCommand(command, false, null);
    });
  });
  document.getElementById("formatBlockSelect").addEventListener("change", function() {
    document.execCommand("formatBlock", false, "<" + this.value + ">");
  });
  
  // Set up the Upload Image button.
  document.getElementById("uploadImageBtn").addEventListener("click", function() {
    document.getElementById("imageFileInput").click();
  });
  document.getElementById("imageFileInput").addEventListener("change", function(e) {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function(event) {
        // Insert the image as a Data URL at the caret position.
        document.execCommand("insertImage", false, event.target.result);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = "";
  });
}

// Attach event listeners for control buttons.
document.getElementById("newNoteBtn").addEventListener("click", createNewNote);
document.getElementById("saveNoteBtn").addEventListener("click", () => saveActiveNote());
document.getElementById("deleteNoteBtn").addEventListener("click", deleteActiveNote);
document.getElementById("exportNoteBtn").addEventListener("click", exportActiveNote);
document.getElementById("exportNotesBtn").addEventListener("click", exportAllNotes);
document.getElementById("importNotesBtn").addEventListener("click", () => {
  document.getElementById("importFileInput").click();
});
document.getElementById("importFileInput").addEventListener("change", handleImportNotes);

// Initialize the app.
setupToolbar();
loadNotes();
updateStorageUsage();

// Auto-save the active note every 3 seconds (silent auto-save).
setInterval(() => {
  if (activeNoteId) {
    saveActiveNote(true);
  }
}, 3000);
