"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Upload, Download, Loader2, Grid3x3, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ImageFile {
  file: File;
  preview: string;
  status: "pending" | "processing" | "completed" | "error";
}

interface GeminiModel {
  name: string;
  displayName: string;
  description: string;
  inputTokenLimit: number;
  outputTokenLimit: number;
}

export default function Home() {
  const [imageFiles, setImageFiles] = useState<ImageFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [logs, setLogs] = useState("Waiting for images...");
  const [canDownload, setCanDownload] = useState(false);
  const [availableModels, setAvailableModels] = useState<GeminiModel[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(true);

  // Form state
  const [geminiModel, setGeminiModel] = useState("");
  const [trainingGoal, setTrainingGoal] = useState("Identity");
  const [prefix, setPrefix] = useState("Audrey");
  const [keyword, setKeyword] = useState("audr3yHepburn1");
  const [checkpoint, setCheckpoint] = useState("WAN-2.2");
  const [captionGuidance, setCaptionGuidance] = useState("");
  const [guidanceStrength, setGuidanceStrength] = useState([0.8]);
  const [negativeHints, setNegativeHints] = useState("");
  const [captionLength, setCaptionLength] = useState("Medium");
  const [negativePreset, setNegativePreset] = useState("Auto");
  const [strictFocus, setStrictFocus] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files).filter((file) =>
      file.type.startsWith("image/")
    );

    if (droppedFiles.length > 0) {
      handleFiles(droppedFiles);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      handleFiles(selectedFiles);
    }
  };

  const handleFiles = async (files: File[]) => {
    // Create preview URLs for images
    const newImageFiles: ImageFile[] = files.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      status: "pending",
    }));

    setImageFiles(newImageFiles);

    // Upload to server
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (data.success) {
        setLogs(`Uploaded ${data.count} images successfully. Click 'Process Images' to start.`);
      }
    } catch (error) {
      setLogs(`Error uploading: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  const testApi = async () => {
    setIsTesting(true);
    setLogs("Testing Gemini API connection...");

    try {
      const response = await fetch(`/api/test?model=${geminiModel}`);
      const data = await response.json();

      if (data.success) {
        setLogs(`✅ API Test Successful!\n${data.message}`);
      } else {
        setLogs(`❌ API Test Failed:\n${data.error}`);
      }
    } catch (error) {
      setLogs(`❌ API Test Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsTesting(false);
    }
  };

  const handleProcess = async () => {
    if (imageFiles.length === 0) {
      setLogs("No images to process. Please upload images first.");
      return;
    }

    setIsProcessing(true);
    setLogs("Processing images... This may take a while.");
    setCanDownload(false);

    // Mark all as processing
    setImageFiles((prev) =>
      prev.map((img) => ({ ...img, status: "processing" as const }))
    );

    const formData = new FormData();
    formData.append("geminiModel", geminiModel);
    formData.append("trainingGoal", trainingGoal);
    formData.append("prefix", prefix);
    formData.append("keyword", keyword);
    formData.append("checkpoint", checkpoint);
    formData.append("captionGuidance", captionGuidance);
    formData.append("guidanceStrength", guidanceStrength[0].toString());
    formData.append("negativeHints", negativeHints);
    formData.append("captionLength", captionLength);
    formData.append("negativePreset", negativePreset);
    formData.append("strictFocus", strictFocus.toString());

    try {
      const response = await fetch("/api/process", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (data.error) {
        setLogs(`Error: ${data.error}`);
        setImageFiles((prev) =>
          prev.map((img) => ({ ...img, status: "error" as const }))
        );
        // Still enable download if there are partial results
        setCanDownload(true);
      } else if (data.status === "done") {
        // Always enable download on completion
        setCanDownload(true);
        setImageFiles((prev) =>
          prev.map((img) => ({ ...img, status: "completed" as const }))
        );
      }
    } catch (error) {
      setLogs(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
      setImageFiles((prev) =>
        prev.map((img) => ({ ...img, status: "error" as const }))
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    window.location.href = "/api/download";
  };

  // Fetch available models on mount
  useEffect(() => {
    const fetchModels = async () => {
      try {
        const response = await fetch("/api/models");
        const data = await response.json();

        if (data.models && data.models.length > 0) {
          setAvailableModels(data.models);

          // Try to find and set Gemini 2.5 Flash as default
          const preferred = data.models.find((m: GeminiModel) =>
            m.name.includes("gemini-2.0-flash-exp") ||
            m.name.includes("gemini-2.5-flash") ||
            m.displayName.toLowerCase().includes("2.5 flash")
          );

          setGeminiModel(preferred?.name || data.models[0].name);
        }
      } catch (error) {
        console.error("Error fetching models:", error);
      } finally {
        setIsLoadingModels(false);
      }
    };

    fetchModels();
  }, []);

  // Poll for logs
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch("/api/logs");
        const text = await response.text();
        if (text) {
          setLogs(text);
        }
      } catch (error) {
        // Ignore polling errors
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Cleanup preview URLs
  useEffect(() => {
    return () => {
      imageFiles.forEach((img) => URL.revokeObjectURL(img.preview));
    };
  }, [imageFiles]);

  return (
    <div className="flex h-screen bg-gradient-to-br from-background via-background to-background/95">
        {/* Left Sidebar */}
        <div className="w-[380px] bg-card/50 backdrop-blur-xl border-r border-border/50 overflow-y-auto shadow-2xl custom-scrollbar">
          {/* Header */}
          <div className="p-6 border-b border-border/50 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg shadow-lg shadow-primary/20">
                <Grid3x3 className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h1 className="text-xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">LORA Helper</h1>
                <Badge variant="secondary" className="mt-1 text-[10px]">v2.0</Badge>
              </div>
            </div>
          </div>

        {/* Configuration Panel */}
        <div className="p-6 space-y-8">
          {/* Captioning Backend */}
          <div className="group">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-0.5 w-8 bg-gradient-to-r from-primary to-primary/50 rounded-full"></div>
              <h2 className="text-xs font-semibold text-primary uppercase tracking-wider">
                Captioning Backend
              </h2>
            </div>
            <div className="space-y-4">
              <div>
                <Label htmlFor="service">Service</Label>
                <Select defaultValue="gemini">
                  <SelectTrigger id="service" className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gemini">Google Gemini</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="gemini-model">Model</Label>
                <Select value={geminiModel} onValueChange={setGeminiModel} disabled={isLoadingModels || availableModels.length === 0}>
                  <SelectTrigger id="gemini-model" className="mt-2">
                    <SelectValue placeholder={isLoadingModels ? "Loading models..." : "Select a model"} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableModels.map((model) => (
                      <SelectItem key={model.name} value={model.name}>
                        {model.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {geminiModel && availableModels.find(m => m.name === geminiModel) && (
                  <p className="text-xs text-muted-foreground mt-2">
                    {availableModels.find(m => m.name === geminiModel)?.description || ""}
                  </p>
                )}
                {!isLoadingModels && availableModels.length === 0 && (
                  <p className="text-xs text-red-400 mt-2">
                    Failed to load models. Check your API key.
                  </p>
                )}
              </div>

              <Button
                onClick={testApi}
                disabled={isTesting}
                variant="outline"
                size="sm"
                className="w-full transition-all hover:shadow-lg hover:shadow-primary/20 hover:border-primary/50"
              >
                {isTesting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Testing...
                  </>
                ) : (
                  "Test API Connection"
                )}
              </Button>
            </div>
          </div>

          {/* LORA Settings */}
          <div className="group">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-0.5 w-8 bg-gradient-to-r from-primary to-primary/50 rounded-full"></div>
              <h2 className="text-xs font-semibold text-primary uppercase tracking-wider">
                LORA Settings
              </h2>
            </div>
            <div className="space-y-4">
              <div>
                <Label htmlFor="training-goal">Training Goal</Label>
                <Select
                  value={trainingGoal}
                  onValueChange={setTrainingGoal}
                >
                  <SelectTrigger id="training-goal" className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Identity">Identity</SelectItem>
                    <SelectItem value="Style">Style</SelectItem>
                    <SelectItem value="Object">Object</SelectItem>
                    <SelectItem value="Concept">Concept</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="prefix">File prefix</Label>
                  <Input
                    id="prefix"
                    value={prefix}
                    onChange={(e) => setPrefix(e.target.value)}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="keyword">Keyword</Label>
                  <Input
                    id="keyword"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    className="mt-2"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="checkpoint">Target Base Model</Label>
                <Select value={checkpoint} onValueChange={setCheckpoint}>
                  <SelectTrigger id="checkpoint" className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="WAN-2.2">WAN-2.2</SelectItem>
                    <SelectItem value="SDXL">SDXL</SelectItem>
                    <SelectItem value="FLUX">FLUX</SelectItem>
                    <SelectItem value="Pony">Pony Diffusion</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Caption Control */}
          <div className="group">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-0.5 w-8 bg-gradient-to-r from-primary to-primary/50 rounded-full"></div>
              <h2 className="text-xs font-semibold text-primary uppercase tracking-wider">
                Caption Control
              </h2>
            </div>
            <div className="space-y-4">
              <div>
                <Label htmlFor="caption-guidance">Caption Guidance</Label>
                <Textarea
                  id="caption-guidance"
                  value={captionGuidance}
                  onChange={(e) => setCaptionGuidance(e.target.value)}
                  placeholder="A video frame of a person. Describe their action, expression, and the shot type (e.g., medium shot, close-up)."
                  rows={4}
                  className="mt-2 resize-none"
                />
              </div>

              <div>
                <Label htmlFor="guidance-strength">
                  Guidance Strength: <span className="text-primary font-bold">{guidanceStrength[0]}</span>
                </Label>
                <Slider
                  id="guidance-strength"
                  value={guidanceStrength}
                  onValueChange={setGuidanceStrength}
                  min={0}
                  max={1}
                  step={0.1}
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="negative-hints">Negative Hints</Label>
                <Input
                  id="negative-hints"
                  value={negativeHints}
                  onChange={(e) => setNegativeHints(e.target.value)}
                  placeholder="watermark, blurry highlights, motion blur"
                  className="mt-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="caption-length">Caption Length</Label>
                  <Select
                    value={captionLength}
                    onValueChange={setCaptionLength}
                  >
                    <SelectTrigger id="caption-length" className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Short">Short</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="Long">Long</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="negative-preset">Negative Preset</Label>
                  <Select
                    value={negativePreset}
                    onValueChange={setNegativePreset}
                  >
                    <SelectTrigger id="negative-preset" className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Auto">Auto</SelectItem>
                      <SelectItem value="None">None</SelectItem>
                      <SelectItem value="Custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-primary/5 border border-primary/10 hover:bg-primary/10 transition-all">
                <Label htmlFor="strict-focus" className="cursor-pointer font-medium">
                  Strict focus (subject-only)
                </Label>
                <Switch
                  id="strict-focus"
                  checked={strictFocus}
                  onCheckedChange={setStrictFocus}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Workspace Header */}
        <div className="bg-card/30 backdrop-blur-xl border-b border-border/50 px-6 py-5 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">Workspace</h2>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="gap-1.5">
                  <span className="inline-block w-1.5 h-1.5 bg-primary rounded-full animate-pulse"></span>
                  {imageFiles.length} Total
                </Badge>
                {imageFiles.filter(img => img.status === "completed").length > 0 && (
                  <Badge variant="default" className="gap-1.5 bg-green-600 hover:bg-green-700">
                    <CheckCircle2 className="h-3 w-3" />
                    {imageFiles.filter(img => img.status === "completed").length} Completed
                  </Badge>
                )}
                {imageFiles.filter(img => img.status === "processing").length > 0 && (
                  <Badge variant="default" className="gap-1.5 bg-blue-600 hover:bg-blue-700">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    {imageFiles.filter(img => img.status === "processing").length} Processing
                  </Badge>
                )}
                {imageFiles.filter(img => img.status === "error").length > 0 && (
                  <Badge variant="destructive" className="gap-1.5">
                    <AlertCircle className="h-3 w-3" />
                    {imageFiles.filter(img => img.status === "error").length} Error
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={handleProcess}
                disabled={isProcessing || imageFiles.length === 0}
                className="transition-all hover:shadow-lg hover:shadow-primary/30 hover:scale-105"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Process Images"
                )}
              </Button>
              <Button
                variant="secondary"
                onClick={handleDownload}
                disabled={!canDownload}
                className="transition-all hover:shadow-lg hover:scale-105"
              >
                <Download className="mr-2 h-4 w-4" />
                Download ZIP
              </Button>
            </div>
          </div>
        </div>

        {/* Upload Area & Console */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4 custom-scrollbar">
          {/* Image Previews */}
          {imageFiles.length > 0 && (
            <div className="bg-card/50 backdrop-blur-sm rounded-xl border border-border/50 p-6 shadow-xl">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-0.5 w-6 bg-gradient-to-r from-primary to-primary/50 rounded-full"></div>
                <h3 className="text-sm font-semibold">Uploaded Images</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {imageFiles.map((img, idx) => (
                  <div key={idx} className="relative group">
                    <div className="aspect-square rounded-xl overflow-hidden border border-border/50 bg-muted shadow-md transition-all group-hover:shadow-xl group-hover:shadow-primary/20 group-hover:scale-105 group-hover:border-primary/50">
                      <img
                        src={img.preview}
                        alt={`Preview ${idx + 1}`}
                        className="w-full h-full object-cover transition-transform group-hover:scale-110"
                      />
                    </div>
                    {/* Status Indicator */}
                    <div className="absolute top-2 right-2 transition-all group-hover:scale-110">
                      {img.status === "pending" && (
                        <div className="h-6 w-6 bg-background/90 backdrop-blur-sm rounded-full p-1 shadow-lg">
                          <Clock className="h-4 w-4 text-yellow-500" />
                        </div>
                      )}
                      {img.status === "processing" && (
                        <div className="h-6 w-6 bg-background/90 backdrop-blur-sm rounded-full p-1 shadow-lg">
                          <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
                        </div>
                      )}
                      {img.status === "completed" && (
                        <div className="h-6 w-6 bg-background/90 backdrop-blur-sm rounded-full p-1 shadow-lg shadow-green-500/30">
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        </div>
                      )}
                      {img.status === "error" && (
                        <div className="h-6 w-6 bg-background/90 backdrop-blur-sm rounded-full p-1 shadow-lg shadow-red-500/30">
                          <AlertCircle className="h-4 w-4 text-red-500" />
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 truncate transition-colors group-hover:text-foreground">
                      {img.file.name}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Dropzone */}
          {imageFiles.length === 0 && (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`
                relative bg-card/50 backdrop-blur-sm rounded-xl border-2 border-dashed p-16
                flex flex-col items-center justify-center text-center cursor-pointer
                transition-all duration-300 overflow-hidden
                ${
                  isDragging
                    ? "border-primary bg-primary/10 shadow-xl shadow-primary/30 scale-105"
                    : "border-border/50 hover:border-primary/50 hover:bg-card/70 hover:shadow-lg"
                }
              `}
            >
              <div className={`absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 transition-opacity ${isDragging ? 'opacity-100' : 'opacity-0'}`}></div>
              <div className="relative z-10">
                <div className={`p-4 bg-primary/10 rounded-2xl mb-6 transition-all ${isDragging ? 'scale-110 rotate-6' : 'group-hover:scale-105'}`}>
                  <Upload className={`h-16 w-16 text-primary transition-all ${isDragging ? 'animate-bounce' : ''}`} />
                </div>
                <p className="text-lg font-semibold text-foreground mb-2">
                  Drop images here, or click to select files
                </p>
                <p className="text-sm text-muted-foreground">
                  Supports JPG, PNG, WebP
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          )}

          {/* Console */}
          <div className="bg-card/50 backdrop-blur-sm rounded-xl border border-border/50 shadow-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-border/50 bg-gradient-to-r from-card to-card/50">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-red-500/80"></div>
                  <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/80"></div>
                  <div className="h-2.5 w-2.5 rounded-full bg-green-500/80"></div>
                </div>
                <h3 className="text-sm font-semibold ml-2">Console</h3>
              </div>
            </div>
            <div className="p-5 bg-black/20">
              <pre className="text-xs text-muted-foreground font-mono whitespace-pre-wrap max-h-[300px] overflow-y-auto custom-scrollbar">
                {logs}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
