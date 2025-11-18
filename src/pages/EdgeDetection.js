import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./EdgeDetection.css";

export default function EdgeDetection() {
  const navigate = useNavigate();

  const originalCanvasRef = useRef(null);
  const processedCanvasRef = useRef(null);

  const [imageSrc, setImageSrc] = useState(null);
  const [hasProcessed, setHasProcessed] = useState(false);
  const [detectionType, setDetectionType] = useState("2d-sobel");

  const MAX_W = 800;
  const MAX_H = 600;

  // ---------- Helpers ----------
  const drawImageToCanvas = (img, canvas) => {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let { width, height } = img;
    const scale = Math.min(MAX_W / width, MAX_H / height, 1);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
    canvas.width = width;
    canvas.height = height;
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
  };

  const imageDataToGrayscale = (imageData) => {
    const { data, width, height } = imageData;
    const gray = new Float32Array(width * height);
    // Luminance (Rec. 601): 0.299 R + 0.587 G + 0.114 B
    for (let i = 0, j = 0; i < data.length; i += 4, j++) {
      gray[j] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    }
    return gray;
  };

  const grayscaleToImageData = (gray, width, height) => {
    const out = new ImageData(width, height);
    for (let i = 0, j = 0; j < gray.length; i += 4, j++) {
      const v = Math.max(0, Math.min(255, Math.round(gray[j])));
      out.data[i] = v;
      out.data[i + 1] = v;
      out.data[i + 2] = v;
      out.data[i + 3] = 255;
    }
    return out;
  };

  const convolve3x3 = (gray, width, height, kernel) => {
    const out = new Float32Array(width * height);
    const k = kernel;
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const i = y * width + x;
        const v =
          gray[i - width - 1] * k[0] +
          gray[i - width] * k[1] +
          gray[i - width + 1] * k[2] +
          gray[i - 1] * k[3] +
          gray[i] * k[4] +
          gray[i + 1] * k[5] +
          gray[i + width - 1] * k[6] +
          gray[i + width] * k[7] +
          gray[i + width + 1] * k[8];
        out[i] = v;
      }
    }
    // Edges left as 0 at 1-pixel border (simple handling)
    return out;
  };

  const convolve1DHorizontal = (gray, width, height) => {
    // Kernel [-1, 0, 1] across each row
    const out = new Float32Array(width * height);
    for (let y = 0; y < height; y++) {
      const row = y * width;
      for (let x = 1; x < width - 1; x++) {
        const i = row + x;
        out[i] = Math.abs(-gray[i - 1] + gray[i + 1]); // |(-1)*L + (1)*R|
      }
    }
    return out;
    // Note: borders remain 0
  };

  // ---------- Actions ----------
  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Please choose an image file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImageSrc(ev.target.result); // triggers draw via useEffect
      setHasProcessed(false);
    };
    reader.readAsDataURL(file);
  };

  const handleGo = () => {
    if (!imageSrc) {
      alert("Upload an image first.");
      return;
    }
    const srcCanvas = originalCanvasRef.current;
    const dstCanvas = processedCanvasRef.current;
    if (!srcCanvas || !dstCanvas) return;

    dstCanvas.width = srcCanvas.width;
    dstCanvas.height = srcCanvas.height;

    const sctx = srcCanvas.getContext("2d");
    const dctx = dstCanvas.getContext("2d");

    const srcData = sctx.getImageData(0, 0, srcCanvas.width, srcCanvas.height);
    const gray = imageDataToGrayscale(srcData);

    const width = srcCanvas.width;
    const height = srcCanvas.height;

    let edges;
    switch (detectionType) {
      case "1d-horizontal": {
        edges = convolve1DHorizontal(gray, width, height);
        break;
      }
      case "2d-sobel": {
        const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
        const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
        const gx = convolve3x3(gray, width, height, sobelX);
        const gy = convolve3x3(gray, width, height, sobelY);
        edges = new Float32Array(width * height);
        for (let i = 0; i < edges.length; i++) {
          // Fast approximation to magnitude: |gx| + |gy|
          edges[i] = Math.abs(gx[i]) + Math.abs(gy[i]);
        }
        break;
      }
      case "2d-laplacian": {
        const lap = [0, -1, 0, -1, 4, -1, 0, -1, 0];
        const l = convolve3x3(gray, width, height, lap);
        edges = new Float32Array(width * height);
        for (let i = 0; i < edges.length; i++) edges[i] = Math.abs(l[i]);
        break;
      }
      default:
        edges = gray.slice();
    }

    // Simple normalization to 0–255 based on current result range
    let maxVal = 0;
    for (let i = 0; i < edges.length; i++) if (edges[i] > maxVal) maxVal = edges[i];
    const scale = maxVal > 0 ? 255 / maxVal : 1;
    for (let i = 0; i < edges.length; i++) edges[i] = edges[i] * scale;

    const outData = grayscaleToImageData(edges, width, height);
    dctx.putImageData(outData, 0, 0);
    setHasProcessed(true);
  };

  const downloadProcessed = () => {
    const canvas = processedCanvasRef.current;
    if (!hasProcessed || !canvas) return;
    if (canvas.toBlob) {
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "edge-detected-image.png";
        a.click();
        URL.revokeObjectURL(url);
      });
    } else {
      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = "edge-detected-image.png";
      a.click();
    }
  };

  // Draw original once imageSrc is set and canvases exist
  useEffect(() => {
    if (!imageSrc) return;
    const originalCanvas = originalCanvasRef.current;
    const processedCanvas = processedCanvasRef.current;
    if (!originalCanvas || !processedCanvas) return;

    const img = new Image();
    img.onload = () => {
      drawImageToCanvas(img, originalCanvas);
      // Reset processed canvas
      processedCanvas.width = originalCanvas.width;
      processedCanvas.height = originalCanvas.height;
      const pctx = processedCanvas.getContext("2d");
      pctx.clearRect(0, 0, processedCanvas.width, processedCanvas.height);
      setHasProcessed(false);
    };
    img.src = imageSrc;
  }, [imageSrc]);

  return (
    <div className="edge-detection-container">
      <header className="tool-header">
        <button className="back-button" onClick={() => navigate("/")}>
          ← Back to Home
        </button>
        <h1>Edge Detection Tool</h1>
        <p>Detect edges using 1D or 2D operators.</p>
      </header>

      <div className="tool-content">
        <div className="upload-controls">
          <label htmlFor="file-upload" className="custom-file-upload">
            Choose Image
          </label>
          <input
            id="file-upload"
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
          />

          <div className="detection-controls">
            <label htmlFor="detection-type">Detection Method:</label>
            <select
              id="detection-type"
              value={detectionType}
              onChange={(e) => setDetectionType(e.target.value)}
            >
              <option value="1d-horizontal">1D Horizontal Edge</option>
              <option value="2d-sobel">2D Sobel (|Gx| + |Gy|)</option>
              <option value="2d-laplacian">2D Laplacian</option>
            </select>
            <button className="go-button" onClick={handleGo} disabled={!imageSrc}>
              Go
            </button>
          </div>
        </div>

        {/* Canvases always mounted so refs aren’t null */}
        <div className="images-container">
          <div className="image-box">
            <h3>Original</h3>
            <canvas ref={originalCanvasRef} />
          </div>
          <div className="image-box">
            <h3>Processed</h3>
            <canvas ref={processedCanvasRef} />
            <button
              className="download-button"
              disabled={!hasProcessed}
              onClick={downloadProcessed}
            >
              Download Processed Image
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
