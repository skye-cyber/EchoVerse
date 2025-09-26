import React, { useRef, useState, useEffect, useCallback } from "react";

const AudioPlayer = ({ audioBlob, audioName, onDownload, onAudioReady }) => {
  const audioRef = useRef(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [audioFormat, setAudioFormat] = useState(null);

  // Detect audio format from blob
  const detectAudioFormat = useCallback((blob) => {
    const type = blob.type;
    if (type.includes('mpeg') || type.includes('mp3')) return 'mp3';
    if (type.includes('wav')) return 'wav';
    if (type.includes('ogg')) return 'ogg';
    if (type.includes('flac')) return 'flac';
    if (type.includes('webm')) return 'webm';
    return 'unknown';
  }, []);

  // Clean up audio URL when component unmounts or blob changes
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
        console.log('Audio URL revoked');
      }
    };
  }, [audioUrl]);

  // Handle audio blob changes with format validation
  useEffect(() => {
    if (audioBlob && audioBlob instanceof Blob) {
      console.log('Audio blob received:', {
        size: audioBlob.size,
        type: audioBlob.type,
        blob: audioBlob
      });

      setIsLoading(true);
      setError(null);

      // Clean up previous URL
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
      }

      try {
        // Validate blob size and type
        if (audioBlob.size === 0) {
          throw new Error('Audio blob is empty');
        }

        const detectedFormat = detectAudioFormat(audioBlob);
        setAudioFormat(detectedFormat);

        console.log('Detected audio format:', detectedFormat);

        // Check if browser supports this format
        const audio = new Audio();
        const canPlay = audio.canPlayType(audioBlob.type);

        if (!canPlay) {
          throw new Error(`Browser does not support ${audioBlob.type} format`);
        }

        // Create new object URL for the blob
        const newAudioUrl = URL.createObjectURL(audioBlob);
        setAudioUrl(newAudioUrl);

        console.log('Audio URL created successfully');

        // Notify parent component that audio is ready
        if (onAudioReady) {
          onAudioReady();
        }

        // Reset audio state
        setCurrentTime(0);
        setDuration(0);
        setIsPlaying(false);

      } catch (err) {
        console.error("Error processing audio blob:", err);
        setError(`Audio format error: ${err.message}`);

        // Fallback: Try to handle as MP3 if type is unknown
        if (err.message.includes('does not support')) {
          console.warn('Trying fallback audio handling...');
          try {
            const newAudioUrl = URL.createObjectURL(audioBlob);
            setAudioUrl(newAudioUrl);
            setAudioFormat('mp3'); // Assume MP3 as fallback
          } catch (fallbackErr) {
            console.error('Fallback also failed:', fallbackErr);
          }
        }
      } finally {
        setIsLoading(false);
      }
    } else {
      // Clean up when no valid blob is provided
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
      }
      setAudioFormat(null);
      setCurrentTime(0);
      setDuration(0);
      setIsPlaying(false);
      setError(null);
    }
  }, [audioBlob, audioUrl, detectAudioFormat, onAudioReady]);

  // Audio event handlers
  const updateTime = useCallback(() => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  }, []);

  const updateDuration = useCallback(() => {
    if (audioRef.current && audioRef.current.duration) {
      setDuration(audioRef.current.duration);
      console.log('Audio duration:', audioRef.current.duration);
    }
  }, []);

  const handlePlay = useCallback(() => {
    setIsPlaying(true);
    setError(null);
  }, []);

  const handlePause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    setCurrentTime(0);
  }, []);

  const handleError = useCallback((e) => {
    console.error("Audio playback error:", {
      error: e,
      errorCode: e.target.error?.code,
      errorMessage: e.target.error?.message,
      src: e.target.src,
      networkState: e.target.networkState,
      readyState: e.target.readyState
    });

    setIsPlaying(false);
    setIsLoading(false);

    // Specific error handling
    const error = e.target.error;
    if (error) {
      switch (error.code) {
        case error.MEDIA_ERR_ABORTED:
          setError("Audio playback was aborted");
          break;
        case error.MEDIA_ERR_NETWORK:
          setError("Network error occurred during playback");
          break;
        case error.MEDIA_ERR_DECODE:
          setError("Audio format not supported by browser");
          break;
        case error.MEDIA_ERR_SRC_NOT_SUPPORTED:
          setError("Audio format not supported");
          break;
        default:
          setError("Failed to play audio file");
      }
    } else {
      setError("Unknown audio playback error");
    }
  }, []);

  const handleLoadStart = useCallback(() => {
    setIsLoading(true);
    setError(null);
  }, []);

  const handleLoadedData = useCallback(() => {
    setIsLoading(false);
    updateDuration();
    console.log('Audio data loaded successfully');
  }, [updateDuration]);

  const handleCanPlay = useCallback(() => {
    setIsLoading(false);
    console.log('Audio can be played');
  }, []);

  const handleStalled = useCallback(() => {
    console.warn('Audio playback stalled');
  }, []);

  const handleWaiting = useCallback(() => {
    console.log('Audio waiting for data');
  }, []);

  // Set up audio event listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const events = [
      ['timeupdate', updateTime],
      ['durationchange', updateDuration],
      ['play', handlePlay],
      ['pause', handlePause],
      ['ended', handleEnded],
      ['error', handleError],
      ['loadstart', handleLoadStart],
      ['loadeddata', handleLoadedData],
      ['canplay', handleCanPlay],
      ['stalled', handleStalled],
      ['waiting', handleWaiting]
    ];

    events.forEach(([event, handler]) => {
      audio.addEventListener(event, handler);
    });

    return () => {
      events.forEach(([event, handler]) => {
        audio.removeEventListener(event, handler);
      });
    };
  }, [updateTime, updateDuration, handlePlay, handlePause, handleEnded, handleError, handleLoadStart, handleLoadedData, handleCanPlay, handleStalled, handleWaiting]);

  const togglePlayPause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;

    if (isPlaying) {
      audio.pause();
    } else {
      // Reset audio to start if it's ended
      if (audio.ended) {
        audio.currentTime = 0;
      }

      audio.play().catch((err) => {
        console.error("Play failed:", err);
        setError("Failed to play audio: " + err.message);
        setIsPlaying(false);
      });
    }
  }, [isPlaying, audioUrl]);

  const handleSeek = useCallback((e) => {
    const audio = audioRef.current;
    if (!audio || duration === 0) return;

    const seekTime = (parseFloat(e.target.value) / 100) * duration;
    audio.currentTime = seekTime;
    setCurrentTime(seekTime);
  }, [duration]);

  const handleSeekClick = useCallback((e) => {
    const audio = audioRef.current;
    if (!audio || duration === 0) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const seekPercent = (clickX / width) * 100;
    const seekTime = (seekPercent / 100) * duration;

    audio.currentTime = seekTime;
    setCurrentTime(seekTime);
  }, [duration]);

  const formatTime = useCallback((time) => {
    if (!time || isNaN(time)) return "0:00";

    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }, []);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Debug information (remove in production)
  const debugInfo = {
    hasBlob: !!audioBlob,
    blobSize: audioBlob?.size,
    blobType: audioBlob?.type,
    audioUrl: audioUrl ? 'Set' : 'Not set',
    audioFormat,
    duration,
    currentTime,
    isPlaying,
    isLoading,
    error
  };

  console.log('AudioPlayer debug:', debugInfo);

  // Reset component when no audio blob
  if (!audioBlob) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-lg font-medium text-gray-900 mb-4">Audio Output</h2>
      <div className="text-center py-12">
      <div className="mx-auto h-12 w-12 text-gray-400">
      <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
      </svg>
      </div>
      <h3 className="mt-2 text-sm font-medium text-gray-900">No audio generated</h3>
      <p className="mt-1 text-sm text-gray-500">
      Convert some text to speech to hear the output here.
      </p>
      </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-lg font-medium text-gray-900 mb-4">Audio Output</h2>
      <div className="text-center py-8">
      <div className="mx-auto h-12 w-12 text-red-400">
      <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      </div>
      <h3 className="mt-2 text-sm font-medium text-gray-900">Audio Error</h3>
      <p className="mt-1 text-sm text-gray-500">{error}</p>
      <p className="mt-1 text-xs text-gray-400">Format: {audioBlob.type}</p>
      <button
      onClick={() => setError(null)}
      className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
      >
      Try Again
      </button>
      </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
    <h2 className="text-lg font-medium text-gray-900 mb-4">Audio Output</h2>

    <div className="space-y-4">
    <audio
    ref={audioRef}
    src={audioUrl}
    preload="metadata"
    crossOrigin="anonymous"
    />

    <div className="flex items-center justify-between">
    <span className="text-sm font-medium text-gray-700 truncate max-w-[50%]">
    {audioName || "Generated Audio"}
    </span>
    <span className="text-sm text-gray-500 flex-shrink-0">
    {formatTime(currentTime)} / {formatTime(duration)}
    {audioFormat && (
      <span className="ml-2 text-xs bg-gray-100 px-2 py-1 rounded">
      {audioFormat.toUpperCase()}
      </span>
    )}
    </span>
    </div>

    <div className="flex items-center space-x-4">
    <button
    onClick={togglePlayPause}
    disabled={isLoading || !audioUrl || !!error}
    className="p-2 bg-blue-600 rounded-full text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200"
    >
    {isLoading ? (
      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
    ) : isPlaying ? (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
    ) : (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
      </svg>
    )}
    </button>

    <div className="flex-1 relative" onClick={handleSeekClick}>
    <div className="w-full h-2 bg-gray-200 rounded-lg cursor-pointer">
    <div
    className="h-2 bg-blue-600 rounded-lg transition-all duration-100"
    style={{ width: `${progress}%` }}
    />
    </div>
    <input
    type="range"
    min="0"
    max="100"
    value={progress}
    onChange={handleSeek}
    className="absolute inset-0 w-full h-2 opacity-0 cursor-pointer"
    />
    </div>
    </div>

    {isLoading && (
      <div className="flex items-center space-x-2 text-sm text-gray-500">
      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <span>Loading audio...</span>
      </div>
    )}

    <div className="flex space-x-3 pt-2">
    <button
    onClick={onDownload}
    disabled={!audioBlob || isLoading}
    className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
    >
    <svg className="-ml-1 mr-2 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
    Download
    </button>

    <button
    className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 opacity-50 cursor-not-allowed"
    title="Share feature coming soon"
    disabled
    >
    <svg className="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
    </svg>
    Share
    </button>
    </div>
    </div>
    </div>
  );
};

export default React.memo(AudioPlayer);
