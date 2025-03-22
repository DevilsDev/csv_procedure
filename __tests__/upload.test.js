/**
 * Version: 2.1.0
 * Description: Unit tests for upload.js using JSDOM environment.
 * Author: Ali Kahwaji
 */

/** @jest-environment jsdom */

describe('upload.js DOM interaction', () => {
    let fileInput, dropZone, responseDisplay, uploadBtn, removeBtn;
  
    beforeEach(() => {
      document.body.innerHTML = `
        <div id="dropZone"></div>
        <input type="file" id="fileInput" />
        <button id="uploadBtn"></button>
        <button id="removeBtn"></button>
        <div id="response"></div>
      `;
  
      fileInput = document.getElementById('fileInput');
      dropZone = document.getElementById('dropZone');
      uploadBtn = document.getElementById('uploadBtn');
      removeBtn = document.getElementById('removeBtn');
      responseDisplay = document.getElementById('response');
  
      require('../../public/js/upload');
    });
  
    it('should initialize DOM elements correctly', () => {
      expect(fileInput).not.toBeNull();
      expect(dropZone).not.toBeNull();
      expect(uploadBtn).not.toBeNull();
      expect(removeBtn).not.toBeNull();
      expect(responseDisplay).not.toBeNull();
    });
  
    it('should set file info on valid file drop', () => {
      const file = new File([''], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  
      const event = new Event('drop', { bubbles: true });
      Object.defineProperty(event, 'dataTransfer', {
        value: { files: [file] }
      });
  
      dropZone.dispatchEvent(event);
  
      expect(dropZone.innerHTML).toContain('Selected: test.xlsx');
    });
  });
  