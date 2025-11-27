import React, { useState, useEffect, useCallback } from "react";
import TextInput from "../TTS/TextInput";
import VoiceSelector from "../TTS/VoiceSelector";
import AudioPlayer from "../TTS/AudioPlayer";
import { ttsService } from "../services/tts";
import { useAuth } from "./AuthContext";

const Editor = () => {
  const [selectedVoice, setSelectedVoice] = useState("default");
  const [selectedModel, setSelectedModel] = useState("kitten-nano");

  const [selectedSpeed, setSelectedSpeed] = useState(1.0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const { user } = useAuth();
  const [status, setStatus] = useState("idle");
  const [taskId, setTaskId] = useState(null);
  const [audioReady, setAudioReady] = useState(false);
  const [pollingInterval, setpollingInterval] = useState(false);

  const handleTextSubmit = async (text) => {
    await convertText(text);
  };

  const handleFileUpload = async (file) => {
    setIsLoading(true);
    setError("");
    setStatus("processing");

    try {
      const res = await ttsService.uploadFile(
        file,
        selectedVoice,
        selectedSpeed,
        selectedModel,
      );
      setTaskId(res.task_id);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to convert file");
      setStatus("idle");
    } finally {
      setIsLoading(false);
    }
  };

  const convertText = async (text) => {
    setIsLoading(true);
    setError("");
    setStatus("processing");

    try {
      const res = await ttsService.convertText(
        text,
        selectedVoice,
        selectedSpeed,
        selectedModel,
      );
      setTaskId(res?.task_id);
    } catch (err) {
      console.log(err);
      setError(
        err?.data?.message ||
          err?.response?.data?.message ||
          "Failed to convert text",
      );
      setStatus("idle");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!taskId) return;

    const checkStatus = async () => {
      try {
        const response = await ttsService.TaskStatus(taskId);

        const contentType = response.headers["content-type"];

        // Handle FileResponse (audio file)
        if (contentType?.includes("audio") || response.data instanceof Blob) {
          const blob =
            response.data instanceof Blob
              ? response.data
              : new Blob([response.data]);
          setAudioBlob(blob);
          setAudioUrl(URL.createObjectURL(blob));
          setStatus("ready");
        }
        // Handle JSON status response
        else if (response.data?.status === "pending") {
          // Still processing, do nothing
        } else if (response.data?.error) {
          setError(response.data.error || "Audio generation failed");
          setStatus("idle");
        }
      } catch (err) {
        if ([404, 400, 500].includes(err.response?.status)) {
          setError("Failed to check task status");
          setStatus("idle");
        }
      }
    };

    const pollingInterval = setInterval(checkStatus, 2000);
    setpollingInterval(pollingInterval);
    return () => clearInterval(pollingInterval);
  }, [taskId, user, selectedVoice, selectedSpeed]);

  const handleAudioReady = useCallback(() => {
    setAudioReady(true);
    // Stop polling here
    if (pollingInterval) {
      clearInterval(pollingInterval);
    }
  }, []);

  const handleDownload = () => {
    if (audioBlob) {
      const url = URL.createObjectURL(audioBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "tts_output.wav";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="mt-12 max-w-6xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Text to Speech Editor
        </h1>
        <p className="text-gray-600">
          Convert your text to natural sounding speech with customizable
          options.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">{error}</h3>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <TextInput
            onTextSubmit={handleTextSubmit}
            onFileUpload={handleFileUpload}
            isLoading={isLoading || status === "processing"}
          />

          <AudioPlayer
            audioBlob={audioBlob}
            audioUrl={audioUrl}
            audioName="Generated Speech"
            onDownload={handleDownload}
            onAudioReady={handleAudioReady}
          />
        </div>

        <div className="space-y-6">
          <VoiceSelector
            selectedVoice={selectedVoice}
            onVoiceChange={setSelectedVoice}
            selectedSpeed={selectedSpeed}
            onSpeedChange={setSelectedSpeed}
            selectedModel={selectedModel}
            onModelChange={setSelectedModel}
          />

          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Tips & Tricks
            </h2>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• Use punctuation for natural pauses in speech</li>
              <li>• Longer texts may take more time to process</li>
              <li>• Experiment with different voices for your content</li>
              <li>• Adjust speed for different listening experiences</li>
              {!user && (
                <li>
                  • <span className="font-medium">Sign in</span> to save your
                  conversion history
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Editor;
