import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./GrayScale.css";

export default function GrayScale() {
  const navigate = useNavigate();

  const originalCanvasRef = useRef(null);
  const processedCanvasRef = useRef(null);

  const [imageSrc, setImageSrc] = useState(null);
  const [hasProcessed, setHasProcessed] = useState(false);
  const [colorScale, setColor] = useState(50); // 1–100


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

const clampColor = (n) => {
    if (Number.isNaN(n) || n < 1) return 1;
    if (n > 100) return 100;
    return n;
  };

  const handlecolorScale = (e) => {
    const v = clampColor(parseInt(e.target.value, 10));
    setColor(v);
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

    const scaledGray = gray.map(v => v * (1 - colorScale / 100));
    
    const outData = grayscaleToImageData(scaledGray, srcCanvas.width, srcCanvas.height);
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
        a.download = "gray-scaled-image.png";
        a.click();
        URL.revokeObjectURL(url);
      });
    } else {
      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = "gray-scaled-image.png";
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
    <div className="gray-scale-container">
      <header className="tool-header">
        <button className="back-button" onClick={() => navigate("/")}>
          ← Back to Home
        </button>
        <h1>Gray Scale Conversion Tool</h1>
        <p>Converts any image into gray scale.</p>
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

      
        <div className="scale-controls">
            <label htmlFor="Scale-input">Scale Intensity: {colorScale}%</label>
            <input
              id="scale-input"
              type="Range"
              min="1"
              max="100"
              value={colorScale}
              onChange={handlecolorScale}
            />
            </div>

          <div className="gray-scale-controls">
            <button className="go-button" onClick={handleGo} disabled={!imageSrc}>
              Convert To GrayScale
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
