"use client";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { enrollFace, verifyFace } from "@/lib/enterpriseApi";
import { getDescriptorFromDataUrl, loadFaceModels } from "@/lib/faceApi";
import { Camera, CheckCircle2, XCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export default function FaceCheckinPage() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [captured, setCaptured] = useState("");
  const [name, setName] = useState("");
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [modelsReady, setModelsReady] = useState(false);
  const [detecting, setDetecting] = useState(false);

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  useEffect(() => {
    loadFaceModels()
      .then(() => setModelsReady(true))
      .catch(() => setError("Face models failed to load."));
  }, []);

  const startCamera = async () => {
    setError("");
    try {
      const media = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = media;
      }
      setStream(media);
    } catch (err) {
      setError(err.message || "Camera access denied.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    setStream(null);
  };

  const captureFrame = () => {
    if (!videoRef.current || !canvasRef.current) {
      return;
    }
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    setCaptured(dataUrl);
    setResult(null);
    setError("");
  };

  const handleEnroll = async () => {
    if (!captured) {
      setError("Capture an image first.");
      return;
    }
    if (!name.trim()) {
      setError("Enter a name for enrollment.");
      return;
    }
    if (!consent) {
      setError("Consent is required for enrollment.");
      return;
    }
    setLoading(true);
    setDetecting(true);
    setError("");
    try {
      const descriptor = await getDescriptorFromDataUrl(captured);
      if (!descriptor) {
        throw new Error("No face detected.");
      }
      const data = await enrollFace({ name, image: captured, consent, descriptor });
      setResult({ type: "enroll", payload: data });
    } catch (err) {
      setError(err.message || "Enrollment failed.");
    } finally {
      setLoading(false);
      setDetecting(false);
    }
  };

  const handleVerify = async () => {
    if (!captured) {
      setError("Capture an image first.");
      return;
    }
    setLoading(true);
    setDetecting(true);
    setError("");
    try {
      const descriptor = await getDescriptorFromDataUrl(captured);
      if (!descriptor) {
        throw new Error("No face detected.");
      }
      const data = await verifyFace({ descriptor });
      setResult({ type: "verify", payload: data });
    } catch (err) {
      setError(err.message || "Verification failed.");
    } finally {
      setLoading(false);
      setDetecting(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="border-b border-border pb-6">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Access control</p>
        <h1 className="font-display text-4xl text-foreground mt-2">Face Check-in</h1>
        <p className="text-muted-foreground mt-2 max-w-2xl">
          Enroll profiles with consent and verify attendees at the entrance.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card className="p-4 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="gold-button" onClick={startCamera}>
              Start Camera
            </button>
            <button type="button" className="ghost-button" onClick={stopCamera}>
              Stop Camera
            </button>
            <button type="button" className="ghost-button" onClick={captureFrame}>
              Capture
            </button>
            {!modelsReady && <span className="text-xs text-muted-foreground">Loading models...</span>}
          </div>

          <div className="face-capture">
            <video ref={videoRef} autoPlay playsInline className="face-video" />
            <canvas ref={canvasRef} className="hidden" />
          </div>

          {captured && (
            <div className="face-preview">
              <img src={captured} alt="Captured" />
            </div>
          )}
        </Card>

        <Card className="p-4 space-y-4">
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Enrollment</label>
            <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Full name" />
            <label className="face-consent">
              <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
              I confirm consent for face recognition
            </label>
            <button type="button" className="gold-button" onClick={handleEnroll} disabled={loading || !modelsReady}>
              Enroll profile
            </button>
          </div>

          <div className="space-y-2">
            <label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Verification</label>
            <button type="button" className="ghost-button" onClick={handleVerify} disabled={loading || !modelsReady}>
              Verify face
            </button>
          </div>

          {detecting && <p className="text-xs text-muted-foreground">Detecting face...</p>}

          {error && <p className="text-sm text-danger">{error}</p>}

          {result?.type === "verify" && (
            <div className="face-result">
              {result.payload?.matched ? (
                <div className="face-result-success">
                  <CheckCircle2 size={20} />
                  <div>
                    <p className="font-semibold">Matched: {result.payload.name}</p>
                    <p className="text-xs text-muted-foreground">Distance: {result.payload.distance ?? result.payload.confidence}</p>
                  </div>
                </div>
              ) : (
                <div className="face-result-error">
                  <XCircle size={20} />
                  <div>
                    <p className="font-semibold">Unknown face</p>
                    <p className="text-xs text-muted-foreground">Distance: {result.payload?.distance ?? result.payload?.confidence}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {result?.type === "enroll" && (
            <div className="face-result">
              <div className="face-result-success">
                <Camera size={20} />
                <div>
                  <p className="font-semibold">Enrolled: {result.payload?.name}</p>
                  <p className="text-xs text-muted-foreground">Profile ID: {result.payload?.profile_id}</p>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
