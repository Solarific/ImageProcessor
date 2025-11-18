import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./ImageBlur.css";

export default function ImageBlur() {
  const navigate = useNavigate();

  const originalCanvasRef = useRef(null);
  const processedCanvasRef = useRef(null);

  const [imageSrc, setImageSrc] = useState(null);
  const [hasProcessed, setHasProcessed] = useState(false);
  const [blurPct, setBlurPct] = useState(50); // 1–100

  const MAX_W = 800;
  const MAX_H = 600;

  const drawImageToCanvas = (img, canvas) => {
    if (!canvas) return; // extra guard
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

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Please choose an image file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImageSrc(ev.target.result); // triggers useEffect below
      setHasProcessed(false);
    };
    reader.readAsDataURL(file);
  };

  const clampBlur = (n) => {
    if (Number.isNaN(n) || n < 1) return 1;
    if (n > 100) return 100;
    return n;
  };

  const handleBlurInput = (e) => {
    const v = clampBlur(parseInt(e.target.value, 10));
    setBlurPct(v);
  };

  const applyBlur = () => {
    if (!imageSrc) {
      alert("Upload an image first.");
      return;
    }
    const src = originalCanvasRef.current;
    const dst = processedCanvasRef.current;
    if (!src || !dst) return; // guards

    dst.width = src.width;
    dst.height = src.height;

    const dctx = dst.getContext("2d");
    dctx.clearRect(0, 0, dst.width, dst.height);

    // map 1–100% -> 0.5–20px
    const px = Math.max(0.5, Math.round((blurPct / 100) * 20));
    dctx.filter = `blur(${px}px)`;
    dctx.drawImage(src, 0, 0);
    dctx.filter = "none";

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
        a.download = "blurred-image.png";
        a.click();
        URL.revokeObjectURL(url);
      });
    } else {
      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = "blurred-image.png";
      a.click();
    }
  };

  // When imageSrc changes AND canvases are mounted, draw original
  useEffect(() => {
    if (!imageSrc) return;
    const originalCanvas = originalCanvasRef.current;
    const processedCanvas = processedCanvasRef.current;
    if (!originalCanvas || !processedCanvas) return;

    const img = new Image();
    img.onload = () => {
      drawImageToCanvas(img, originalCanvas);
      // reset processed canvas size & clear
      processedCanvas.width = originalCanvas.width;
      processedCanvas.height = originalCanvas.height;
      const pctx = processedCanvas.getContext("2d");
      pctx.clearRect(0, 0, processedCanvas.width, processedCanvas.height);
      setHasProcessed(false);
    };
    img.src = imageSrc;
  }, [imageSrc]);

  return (
    <div className="image-blur-container">
      <header className="tool-header">
        <button className="back-button" onClick={() => navigate("/")}>
          ← Back to Home
        </button>
        <h1>Image Blur Tool</h1>
        <p>Upload an image, set blur intensity (1–100), and process.</p>
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

          <div className="blur-controls">
            <label htmlFor="blur-input">Blur Intensity: {blurPct}%</label>
            <input
              id="blur-input"
              type="number"
              min="1"
              max="100"
              value={blurPct}
              onChange={handleBlurInput}
            />
            <button className="go-button" onClick={applyBlur} disabled={!imageSrc}>
              Go
            </button>
          </div>
        </div>

        {/* Canvases are always mounted so refs aren’t null */}
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
              Download Blurred Image
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
