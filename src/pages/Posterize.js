import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Posterize.css";

export default function Posterize() {
    const navigate = useNavigate();

    const originalCanvasRef = useRef(null);
    const processedCanvasRef = useRef(null);

    const [imageSrc, setImageSrc] = useState(null);
    const [hasProcessed, setHasProcessed] = useState(false);
    //const [brightenPct, setBrightenPct] = useState(0); // -100 to 100

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
        for (let i = 0, j = 0; i < srcData.data.length; i += 4, j++) {
            // get brightness value
            // r + g + b / 3
            const brightness = (srcData.data[i] + srcData.data[i + 1] + srcData.data[i + 2]) / 3;

            if (brightness === 0) {
                outData.data[i] = 0;
                outData.data[i + 1] = 0;
                outData.data[i + 2] = 0;
            }
            else if (brightness <= 92) {
                outData.data[i] = 102;
                outData.data[i + 1] = 0;
                outData.data[i + 2] = 102;
            }
            else if (brightness <= 135) {
                outData.data[i] = 0;
                outData.data[i + 1] = 128;
                outData.data[i + 2] = 255;
            }
            else if (brightness <= 180) {
                outData.data[i] = 178;
                outData.data[i + 1] = 255;
                outData.data[i + 2] = 102;
            }
            else {
                outData.data[i] = 255;
                outData.data[i + 1] = 205;
                outData.data[i + 2] = 205;
            }
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
                a.download = "brightened-image.png";
                a.click();
                URL.revokeObjectURL(url);
            });
        } else {
            const url = canvas.toDataURL("image/png");
            const a = document.createElement("a");
            a.href = url;
            a.download = "posterize-image.png";
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
        <div className="posterize-container">
            <header className="tool-header">
                <button className="back-button" onClick={() => navigate("/")}>
                    ← Back to Home
                </button>
                <h1>Posterization Tool</h1>
                <p>Make an image look like a poster.</p>
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
