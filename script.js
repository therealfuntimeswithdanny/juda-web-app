// Global variables for notes and the active note ID.
let notes = [];
let activeNoteId = null;

/* ------------------------------
   STORAGE & STATUS FUNCTIONS 
------------------------------ */
function updateStorageUsage() {
  const storageElem = document.getElementById("storageUsage");
  const notesString = JSON.stringify(notes);
  const sizeBytes = new Blob([notesString]).size;
  const LIMIT_BYTES = 3145728; // 3 MB in bytes
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

  let color;
  const ratio = sizeBytes / LIMIT_BYTES;
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
  const lastSavedElem = document.getElementById("lastSaved");
  const now = new Date();
  lastSavedElem.textContent = "Last Saved: " + now.toLocaleTimeString();
}

/* ------------------------------
   NOTES PERSISTENCE & RENDERING 
------------------------------ */
function loadNotes() {
  const saved = localStorage.getItem("judaNotes");
  notes = saved ? JSON.parse(saved) : [];
  renderNotesList();
}

function persistNotes() {
  localStorage.setItem("judaNotes", JSON.stringify(notes));
  updateStorageUsage();
}

function renderNotesList() {
  const notesList = document.getElementById("notesList");
  notesList.innerHTML = "";

  if (notes.length === 0) {
    const emptyMessage = document.createElement("li");
    emptyMessage.textContent = "No saved notes.";
    emptyMessage.style.fontStyle = "italic";
    emptyMessage.style.color = "#555";
    notesList.appendChild(emptyMessage);
  } else {
    notes.forEach(note => {
      const li = document.createElement("li");
      li.textContent = note.title || "Untitled";
      li.dataset.id = note.id;
      li.addEventListener("click", () => loadNote(note.id));
      li.addEventListener("dblclick", () => {
        if (note.compressedContent) {
          alert(LZString.decompressFromUTF16(note.compressedContent));
        }
      });
      notesList.appendChild(li);
    });
  }
}

/* ------------------------------
   NOTES CRUD OPERATIONS 
------------------------------ */
function createNewNote() {
  const newNote = {
    id: Date.now().toString(),
    title: "Untitled",
    // Initialize with default content.
    compressedContent: LZString.compressToUTF16("Click \"New Note\" on the sidebar then start typing or select a note to edit."),
    updatedAt: new Date()
  };
  notes.push(newNote);
  persistNotes();
  renderNotesList();
  loadNote(newNote.id);
}

function loadNote(id) {
  const note = notes.find(n => n.id === id);
  if (note) {
    activeNoteId = note.id;
    document.getElementById("noteTitle").value = note.title;
    // Decompress the content before displaying it.
    document.getElementById("noteContent").innerHTML = note.compressedContent
      ? LZString.decompressFromUTF16(note.compressedContent)
      : "";
  }
}

function saveActiveNote(auto = false) {
  if (activeNoteId) {
    const note = notes.find(n => n.id === activeNoteId);
    if (note) {
      note.title = document.getElementById("noteTitle").value;
      const content = document.getElementById("noteContent").innerHTML;
      // Compress content before saving.
      note.compressedContent = LZString.compressToUTF16(content);
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

function deleteActiveNote() {
  if (activeNoteId) {
    notes = notes.filter(n => n.id !== activeNoteId);
    persistNotes();
    renderNotesList();
    document.getElementById("noteTitle").value = "";
    document.getElementById("noteContent").innerHTML = "";
    activeNoteId = null;
  }
}

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
    ${LZString.decompressFromUTF16(note.compressedContent)}
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

function exportAllNotes() {
  const jsonNotes = JSON.stringify(notes, null, 2);
  const blob = new Blob([jsonNotes], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "juda_notes_backup.json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

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

/* ------------------------------
   URL NOTE ADDITION & COMPRESSOR 
------------------------------ */
// When the page loads, check if a query parameter "add" is present.
// Example: app.html?add=This%20is%20my%20note
window.addEventListener("DOMContentLoaded", function() {
  const params = new URLSearchParams(window.location.search);
  const addText = params.get("add");
  if (addText) {
    // Create a new note with the provided text (compressed before saving)
    const newNote = {
      id: Date.now().toString(),
      title: "Note from URL",
      compressedContent: LZString.compressToUTF16(addText),
      updatedAt: new Date()
    };
    notes.push(newNote);
    persistNotes();
    renderNotesList();
    // Optionally, clear the URL query string after processing.
  }
});

/* ------------------------------
   TOOLBAR FOR RICH TEXT COMMANDS 
------------------------------ */
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
}

/* ------------------------------
   EVENT ATTACHMENT 
------------------------------ */
document.getElementById("newNoteBtn").addEventListener("click", createNewNote);
document.getElementById("saveNoteBtn").addEventListener("click", () => saveActiveNote());
document.getElementById("deleteNoteBtn").addEventListener("click", deleteActiveNote);
document.getElementById("exportNotesBtn").addEventListener("click", exportAllNotes);
document.getElementById("exportNoteBtn").addEventListener("click", exportActiveNote);
document.getElementById("importNotesBtn").addEventListener("click", () => {
  document.getElementById("importFileInput").click();
});
document.getElementById("importFileInput").addEventListener("change", handleImportNotes);

/* ------------------------------
   INITIALIZATION & AUTO-SAVE 
------------------------------ */
setupToolbar();
loadNotes();
updateStorageUsage();

// Hide loader once fully loaded.
window.addEventListener("load", function() {
  const loader = document.getElementById("loader");
  loader.style.opacity = 0;
  setTimeout(() => {
    loader.style.display = "none";
  }, 500);
});

// Auto-save the current note every 3 seconds (silent auto-save).
setInterval(() => {
  if (activeNoteId) {
    saveActiveNote(true);
  }
}, 3000);
