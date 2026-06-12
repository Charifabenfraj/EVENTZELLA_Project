import * as faceapi from "face-api.js";

let modelsReady = false;

export async function loadFaceModels() {
  if (modelsReady) {
    return;
  }
  const modelUrl = "/face-models";
  await faceapi.nets.tinyFaceDetector.loadFromUri(modelUrl);
  await faceapi.nets.faceLandmark68Net.loadFromUri(modelUrl);
  await faceapi.nets.faceRecognitionNet.loadFromUri(modelUrl);
  modelsReady = true;
}

export async function getDescriptorFromImage(imageElement) {
  await loadFaceModels();
  const detection = await faceapi
    .detectSingleFace(imageElement, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks()
    .withFaceDescriptor();

  if (!detection || !detection.descriptor) {
    return null;
  }
  return Array.from(detection.descriptor);
}

export async function getDescriptorFromDataUrl(dataUrl) {
  const image = await loadImage(dataUrl);
  return getDescriptorFromImage(image);
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = src;
  });
}
