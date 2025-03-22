/**
 * Version: 2.1.0
 * Description: Handles file selection, drag-and-drop, validation, and upload to the server.
 * Author: Ali Kahwaji
 */

const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const uploadButton = document.getElementById('uploadBtn');
const removeButton = document.getElementById('removeBtn');
const responseDisplay = document.getElementById('response');

let selectedFile = null;

// UI Events

dropZone.addEventListener('click', () => fileInput.click());

dropZone.addEventListener('dragover', (event) => {
  event.preventDefault();
  dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (event) => {
  event.preventDefault();
  dropZone.classList.remove('dragover');
  const file = event.dataTransfer.files[0];
  handleFileSelection(file);
});

fileInput.addEventListener('change', () => {
  const file = fileInput.files[0];
  handleFileSelection(file);
});

/**
 * Validates and stores the selected file
 */
function handleFileSelection(file) {
  if (!file || !file.name.match(/\.(xlsx|xls|ods)$/i)) {
    alert('⚠️ Please upload a valid Excel file (.xlsx, .xls, .ods).');
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    alert('❌ File is too large. Maximum allowed size is 5MB.');
    return;
  }

  selectedFile = file;
  dropZone.innerHTML = `<p>📄 Selected: ${file.name}</p>`;
  removeButton.style.display = 'inline-block';
  responseDisplay.textContent = '';
}

/**
 * Sends the file to the backend API
 */
async function uploadFile() {
  if (!selectedFile) {
    alert('⚠️ No file selected!');
    return;
  }

  const formData = new FormData();
  formData.append('excel', selectedFile);
  responseDisplay.textContent = 'Uploading...';

  try {
    const response = await fetch('/upload', {
      method: 'POST',
      body: formData
    });

    const result = await response.text();
    responseDisplay.textContent = response.ok
      ? `✅ ${result}`
      : `❌ Upload failed: ${result}`;
  } catch (error) {
    console.error('Upload Error:', error);
    responseDisplay.textContent = '❌ Error uploading file.';
  }
}

/**
 * Clears the selected file from the UI and resets state
 */
function removeSelectedFile() {
  selectedFile = null;
  fileInput.value = '';
  dropZone.innerHTML = '<p>Drag & drop an Excel file here, or click to upload</p>';
  removeButton.style.display = 'none';
  responseDisplay.textContent = '';
}

uploadButton.addEventListener('click', uploadFile);
removeButton.addEventListener('click', removeSelectedFile);
