import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Contrast.css";

export default function Contrast() {
  const navigate = useNavigate();

  const originalCanvasRef = useRef(null);
  const processedCanvasRef = useRef(null);

  const [imageSrc, setImageSrc] = useState(null);
  const [hasProcessed, setHasProcessed] = useState(false);
  const [contrast, setContrast] = useState(100); // 0–200 (100 is neutral)

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

  const adjustContrast = (imageData, contrastValue) => {
    const { data, width, height } = imageData;
    const output = new Uint8ClampedArray(data);
    
    // Maps to -255 to +255 range
    const adjustedContrast = contrastValue * 2.55; 

    // Remarks
    // While we could do const factor = 1 + (contrastValue / 100);
    // The given factor formula + adjustedContrast scale allows us to 
    // have a more fluid range of intensity applied to the image
    const factor = (259 * (adjustedContrast + 255)) / (255 * (259 - adjustedContrast));

    // Helper function to apply contrast to a single channel
    const applyFactor = (value) => {
      return Math.max(0, Math.min(255, factor * (value - 128) + 128));
    };

    for (let i = 0; i < data.length; i += 4) {
      output[i] = applyFactor(data[i]);       // Red
      output[i + 1] = applyFactor(data[i + 1]); // Green
      output[i + 2] = applyFactor(data[i + 2]); // Blue
      output[i + 3] = data[i + 3];            // Alpha (unchanged)
    }

    return new ImageData(output, width, height);
  };

  const clampContrast = (n) => {
    if (Number.isNaN(n) || n < -100) return -100;
    if (n > 100) return 100;
    return n;
  };

  const handleContrast = (e) => {
    const v = clampContrast(parseInt(e.target.value, 10));
    setContrast(v);
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
      setImageSrc(ev.target.result);
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
    const adjusted = adjustContrast(srcData, contrast);

    dctx.putImageData(adjusted, 0, 0);
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
        a.download = "contrast-adjusted-image.png";
        a.click();
        URL.revokeObjectURL(url);
      });
    } else {
      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = "contrast-adjusted-image.png";
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
    <div className="contrast-adjustment-container">
      <header className="tool-header">
        <button className="back-button" onClick={() => navigate("/")}>
          ← Back to Home
        </button>
        <h1>Contrast Adjustment Tool</h1>
        <p>Adjust the contrast of your images.</p>
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

          <div className="contrast-controls">
            <label htmlFor="contrast-input">Contrast: {contrast}%</label>
            <input
              id="contrast-input"
              type="range"
              min="-100"
              max="100"
              value={contrast}
              onChange={handleContrast}
            />
          </div>

          <div className="adjustment-controls">
            <button className="go-button" onClick={handleGo} disabled={!imageSrc}>
              Apply Contrast
            </button>
          </div>
        </div>

        {/* Canvases always mounted so refs aren't null */}
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
