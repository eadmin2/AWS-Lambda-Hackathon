// src/workers/upload.worker.ts

self.onmessage = (event) => {
  const { file, presignedUrl } = event.data;

  const xhr = new XMLHttpRequest();

  xhr.upload.addEventListener('progress', (e) => {
    if (e.lengthComputable) {
      const percentComplete = (e.loaded / e.total) * 100;
      self.postMessage({ type: 'progress', percentComplete });
    }
  });

  xhr.addEventListener('load', () => {
    if (xhr.status === 200) {
      self.postMessage({ type: 'success' });
    } else {
      self.postMessage({ type: 'error', error: `Upload failed with status: ${xhr.status}` });
    }
  });

  xhr.addEventListener('error', () => {
    self.postMessage({ type: 'error', error: 'Upload failed due to a network error.' });
  });

  xhr.open('PUT', presignedUrl);
  xhr.setRequestHeader('Content-Type', file.type);
  xhr.send(file);
}; 