import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Sepia.css";

export default function Sepia() {
    const navigate = useNavigate();

    const originalCanvasRef = useRef(null);
    const processedCanvasRef = useRef(null);

    const [imageSrc, setImageSrc] = useState(null);
    const [hasProcessed, setHasProcessed] = useState(false);
    const [sepiaPct, setSepiaPct] = useState(0); // 0-100

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

       const clampSepia = (n) => {
        if (Number.isNaN(n) || n < 1) return 1;
        if (n > 100) return 100;
        return n;
    };

        const handleSepiaInput = (e) => {
        const v = clampSepia(parseInt(e.target.value, 10));
        setSepiaPct(v);
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
            setImageSrc(ev.target.result); // triggers draw  useEffect
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

        const width = srcCanvas.width;
        const height = srcCanvas.height;

        const outData = new ImageData(width, height);
        for (let i = 0; i < srcData.data.length; i += 4) {
            const t = sepiaPct / 100;
            const r = srcData.data[i];
            const g = srcData.data[i + 1];
            const b = srcData.data[i + 2];

        // Reference: https://stackoverflow.com/questions/1061093/how-is-a-sepia-tone-created
            let or = 0.393 * r + 0.769 * g + 0.189 * b;
            let og = 0.349 * r + 0.686 * g + 0.168 * b;
            let ob = 0.272 * r + 0.534 * g + 0.131 * b; 

            or = Math.min(255, Math.max(0, or));
            og = Math.min(255, Math.max(0, og));
            ob = Math.min(255, Math.max(0, ob));
             
            outData.data[i]     = r * (1-t) + or * t;
            outData.data[i + 1] = g * (1-t) + og * t;
            outData.data[i + 2] = b * (1-t) + ob * t;
            outData.data[i + 3] = 255;
}

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
                a.download = "sepia-image.png";
                a.click();
                URL.revokeObjectURL(url);
            });
        } else {
            const url = canvas.toDataURL("image/png");
            const a = document.createElement("a");
            a.href = url;
            a.download = "sepia-image.png";
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
        <div className="sepia-container">
            <header className="tool-header">
                <button className="back-button" onClick={() => navigate("/")}>
                    ← Back to Home
                </button>
                <h1>Sepia Tool</h1>
                <p>Make an image have a sepia-tone.</p>
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
                                                <div className="sepia-controls">
                                <label htmlFor="sepia-input">Sepia Intensity: {sepiaPct}%  </label>
                                <input
                                    id="sepia-input"
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={sepiaPct}
                                    onChange={handleSepiaInput}
                                />
                            </div>
                    <button className="go-button" onClick={handleGo} disabled={!imageSrc}>
                        Go
                    </button>
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
