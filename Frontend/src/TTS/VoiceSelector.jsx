import React, { useState, useEffect } from "react";
import { ttsService } from "../../services/tts";

const VoiceSelector = ({
  selectedVoice,
  onVoiceChange,
  selectedSpeed,
  onSpeedChange,
}) => {
  const [voices, setVoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVoices = async () => {
      try {
        const voiceData = await ttsService.getVoices();
        setVoices(voiceData);
      } catch (error) {
        console.error("Failed to fetch voices:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchVoices();
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-10 bg-gray-200 rounded mb-4"></div>
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-lg font-medium text-gray-900 mb-4">Voice Settings</h2>

      <div className="space-y-4">
        <div>
          <label
            htmlFor="voice"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Voice Style
          </label>
          <select
            id="voice"
            value={selectedVoice}
            onChange={(e) => onVoiceChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            {voices.map((voice) => (
              <option key={voice.id} value={voice.id}>
                {voice.name} {voice.is_premium ? "⚡" : ""}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="speed"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Speaking Speed
          </label>
          <select
            id="speed"
            value={selectedSpeed}
            onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="0.8">Slow</option>
            <option value="1.0">Normal</option>
            <option value="1.2">Fast</option>
          </select>
        </div>

        <div className="pt-4 border-t border-gray-200">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Preview</h3>
          <p className="text-sm text-gray-500">
            Select voice and speed settings to hear how they affect the speech
            output.
          </p>
          <button
            type="button"
            className="mt-2 inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Play Preview
          </button>
        </div>
      </div>
    </div>
  );
};

export default VoiceSelector;
