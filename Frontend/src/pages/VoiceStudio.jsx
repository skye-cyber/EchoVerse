import React, { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../pages/AuthContext";
import { ttsService } from "../services/tts";

const VoiceStudio = () => {
    const { user } = useAuth();
    const [sessions, setSessions] = useState([]);
    const [filteredSessions, setFilteredSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [dateFilter, setDateFilter] = useState("all");
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const [playingAudio, setPlayingAudio] = useState(null);
    const [audioProgress, setAudioProgress] = useState({});
    const [audioDurations, setAudioDurations] = useState({});
    const [currentTime, setCurrentTime] = useState({});
    const [selectedSessions, setSelectedSessions] = useState(new Set());
    const [volume, setVolume] = useState(80); // Volume percentage
    const [playbackRate, setPlaybackRate] = useState(1.0);

    // Audio refs for each session
    const audioRefs = useRef({});
    const progressIntervalRef = useRef({});

    // Fetch sessions from API
    const fetchSessions = useCallback(async () => {
        if (!user) return;

        try {
            setLoading(true);
            const data = await ttsService.FetchSessions();
            if (data) {
                setSessions(data.sessions);
            }
        } catch (error) {
            console.error("Error fetching sessions:", error);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchSessions();
    }, [fetchSessions]);

    // Filter and search sessions
    useEffect(() => {
        let filtered = sessions;

        if (searchTerm.trim() !== '') {
            filtered = filtered.filter((session) =>
                session.input_text.toLowerCase().includes(searchTerm.toLowerCase()),
            );
        }

        if (statusFilter !== "all") {
            filtered = filtered.filter((session) => session.status === statusFilter);
        }

        if (dateFilter !== "all") {
            const now = new Date();
            const filterDate = new Date();

            switch (dateFilter) {
                case "today":
                    filterDate.setHours(0, 0, 0, 0);
                    filtered = filtered.filter(
                        (session) => new Date(session.created_at) >= filterDate,
                    );
                    break;
                case "week":
                    filterDate.setDate(now.getDate() - 7);
                    filtered = filtered.filter(
                        (session) => new Date(session.created_at) >= filterDate,
                    );
                    break;
                case "month":
                    filterDate.setMonth(now.getMonth() - 1);
                    filtered = filtered.filter(
                        (session) => new Date(session.created_at) >= filterDate,
                    );
                    break;
                default:
                    break;
            }
        }

        setFilteredSessions(filtered);
        setCurrentPage(1);
    }, [sessions, searchTerm, statusFilter, dateFilter]);

    // Pagination
    const indexOfLastItem =
        filteredSessions.length >= currentPage * itemsPerPage
            ? currentPage * itemsPerPage
            : filteredSessions.length;

    const indexOfFirstItem =
        0 >= indexOfLastItem - itemsPerPage <= filteredSessions.length
            ? indexOfLastItem - itemsPerPage
            : 0;

    const currentSessions = filteredSessions.slice(
        indexOfFirstItem,
        indexOfLastItem,
    );
    const totalPages = Math.ceil(filteredSessions.length / itemsPerPage);

    // Audio playback functions
    const handlePlayAudio = async (sessionId) => {
        const audioElement = audioRefs.current[sessionId];

        if (!audioElement) {
            // First time playing - load the audio
            try {
                const audioBlob = await ttsService.FetchFileBlob(sessionId);
                if (audioBlob && audioBlob.data instanceof Blob) {
                    const url = URL.createObjectURL(audioBlob.data);
                    const newAudio = new Audio(url);
                    newAudio.volume = volume / 100;
                    newAudio.playbackRate = playbackRate;

                    audioRefs.current[sessionId] = newAudio;

                    // Set up event listeners
                    newAudio.addEventListener('loadedmetadata', () => {
                        setAudioDurations(prev => ({
                            ...prev,
                            [sessionId]: newAudio.duration
                        }));
                    });

                    newAudio.addEventListener('timeupdate', () => {
                        const progress = (newAudio.currentTime / newAudio.duration) * 100;
                        setAudioProgress(prev => ({
                            ...prev,
                            [sessionId]: progress
                        }));
                        setCurrentTime(prev => ({
                            ...prev,
                            [sessionId]: newAudio.currentTime
                        }));
                    });

                    newAudio.addEventListener('ended', () => {
                        setPlayingAudio(null);
                        setAudioProgress(prev => ({
                            ...prev,
                            [sessionId]: 0
                        }));
                        setCurrentTime(prev => ({
                            ...prev,
                            [sessionId]: 0
                        }));
                    });

                    await newAudio.play();
                    setPlayingAudio(sessionId);
                }
            } catch (error) {
                console.error("Error loading audio:", error);
            }
        } else {
            // Audio already loaded
            if (playingAudio === sessionId) {
                // Pause audio
                audioElement.pause();
                setPlayingAudio(null);
            } else {
                // Play audio
                if (playingAudio) {
                    // Stop currently playing audio
                    audioRefs.current[playingAudio].pause();
                    audioRefs.current[playingAudio].currentTime = 0;
                }
                await audioElement.play();
                setPlayingAudio(sessionId);
            }
        }
    };

    const handleSeek = (sessionId, progress) => {
        const audioElement = audioRefs.current[sessionId];
        if (audioElement) {
            const newTime = (progress / 100) * audioElement.duration;
            audioElement.currentTime = newTime;
            setAudioProgress(prev => ({
                ...prev,
                [sessionId]: progress
            }));
        }
    };

    const handleVolumeChange = (newVolume) => {
        setVolume(newVolume);
        // Update volume for all audio elements
        Object.values(audioRefs.current).forEach(audio => {
            audio.volume = newVolume / 100;
        });
    };

    const handlePlaybackRateChange = (newRate) => {
        setPlaybackRate(newRate);
        // Update playback rate for all audio elements
        Object.values(audioRefs.current).forEach(audio => {
            audio.playbackRate = newRate;
        });
    };

    const formatTime = (seconds) => {
        if (!seconds) return "0:00";
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Clean up audio URLs when component unmounts
    useEffect(() => {
        return () => {
            Object.values(audioRefs.current).forEach(audio => {
                audio.pause();
                if (audio.src.startsWith('blob:')) {
                    URL.revokeObjectURL(audio.src);
                }
            });
        };
    }, []);

    // Session actions
    const handleDeleteSession = async (sessionId) => {
        if (!window.confirm("Are you sure you want to delete this session?")) return;

        try {
            await ttsService.DeleteSession(sessionId);
            setSessions((prev) => prev.filter((session) => session.id !== sessionId));

            // Clean up audio if it was loaded
            if (audioRefs.current[sessionId]) {
                const audio = audioRefs.current[sessionId];
                audio.pause();
                if (audio.src.startsWith('blob:')) {
                    URL.revokeObjectURL(audio.src);
                }
                delete audioRefs.current[sessionId];
            }
        } catch (error) {
            console.error("Error deleting session:", error);
        }
    };

    const handleRerunSession = async (session) => {
        try {
            const response = await ttsService.RunSession(session.id);
            if (response.ok) {
                const newSession = await response.json();
                setSessions((prev) => [newSession, ...prev]);
                alert("Session re-run successfully!");
            }
        } catch (error) {
            console.error("Error re-running session:", error);
        }
    };

    // Bulk actions
    const toggleSessionSelection = (sessionId) => {
        setSelectedSessions((prev) => {
            const newSelection = new Set(prev);
            if (newSelection.has(sessionId)) {
                newSelection.delete(sessionId);
            } else {
                newSelection.add(sessionId);
            }
            return newSelection;
        });
    };

    const handleBulkDelete = async () => {
        if (selectedSessions.size === 0) return;
        if (!window.confirm(`Delete ${selectedSessions.size} sessions?`)) return;

        try {
            await Promise.all(
                Array.from(selectedSessions).map((sessionId) =>
                    ttsService.DeleteSession(sessionId)
                ),
            );

            setSessions((prev) =>
                prev.filter((session) => !selectedSessions.has(session.id)),
            );
            setSelectedSessions(new Set());
        } catch (error) {
            console.error("Error bulk deleting sessions:", error);
        }
    };

    const handleDownload = async (session) => {
        const audioBlob = await ttsService.FetchFileBlob(session?.id);
        if (audioBlob && audioBlob.data instanceof Blob) {
            const url = URL.createObjectURL(audioBlob.data);
            const a = document.createElement("a");
            a.href = url;
            a.download = session.audio_file?.filename || `echoverse-${session.id}.mp3`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    };

    // Enhanced features (for future implementation)
    const handleShareSession = (session) => {
        // Future: Generate shareable link
        navigator.clipboard.writeText(`${window.location.origin}/share/${session.id}`);
        alert("Share link copied to clipboard!");
    };

    const handleExportMetadata = (session) => {
        // Future: Export session metadata as JSON
        const metadata = {
            id: session.id,
            text: session.input_text,
            voice: session.voice?.name,
            model: session.model?.name,
            parameters: {
                speed: session.speed,
                pitch: session.pitch,
                energy: session.energy
            },
            created_at: session.created_at
        };

        const blob = new Blob([JSON.stringify(metadata, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `session-${session.id}-metadata.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // Status badge component
    const StatusBadge = ({ status }) => {
        const statusConfig = {
            pending: { color: "bg-yellow-100 text-yellow-800", label: "Pending" },
            processing: { color: "bg-blue-100 text-blue-800", label: "Processing" },
            completed: { color: "bg-green-100 text-green-800", label: "Completed" },
            error: { color: "bg-red-100 text-red-800", label: "Error" },
            failed: { color: "bg-red-100 text-red-800", label: "Failed" },
        };

        const config = statusConfig[status] || statusConfig.pending;

        return (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
                {config.label}
            </span>
        );
    };

    // Enhanced Audio Player Component
    const AudioPlayer = ({ session }) => {
        const duration = audioDurations[session.id] || 0;
        const current = currentTime[session.id] || 0;
        const progress = audioProgress[session.id] || 0;

        return (
            <div className="mb-4">
                <div className="flex items-center space-x-3 bg-gray-50 rounded-lg p-3">
                    <button
                        onClick={() => handlePlayAudio(session.id)}
                        className={`p-2 rounded-full transition-all duration-200 ${playingAudio === session.id
                            ? "bg-red-500 text-white hover:bg-red-600"
                            : "bg-blue-500 text-white hover:bg-blue-600"
                            }`}
                    >
                        {playingAudio === session.id ? (
                            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                                <rect x="6" y="4" width="4" height="16" />
                                <rect x="14" y="4" width="4" height="16" />
                            </svg>
                        ) : (
                            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z" />
                            </svg>
                        )}
                    </button>

                    <div className="flex-1">
                        <div
                            className="w-full bg-gray-200 rounded-full h-2 cursor-pointer"
                            onClick={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const clickX = e.clientX - rect.left;
                                const newProgress = (clickX / rect.width) * 100;
                                handleSeek(session.id, newProgress);
                            }}
                        >
                            <div
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                            <span>{formatTime(current)}</span>
                            <span>{formatTime(duration)}</span>
                        </div>
                    </div>

                    <div className="flex items-center space-x-2">
                        <div className="flex items-center space-x-1">
                            <button
                                onClick={() => handlePlaybackRateChange(playbackRate === 0.5 ? 1.0 : playbackRate - 0.25)}
                                className="text-xs text-gray-600 hover:text-gray-900"
                            >
                                -
                            </button>
                            <span className="text-xs text-gray-600 min-w-[30px] text-center">
                                {playbackRate}x
                            </span>
                            <button
                                onClick={() => handlePlaybackRateChange(playbackRate === 2.0 ? 2.0 : playbackRate + 0.25)}
                                className="text-xs text-gray-600 hover:text-gray-900"
                            >
                                +
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // Session card component
    const SessionCard = ({ session }) => (
        <div className={`bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all duration-200 ${selectedSessions.has(session.id) ? "ring-2 ring-blue-500" : ""
            }`}>
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                    <input
                        type="checkbox"
                        checked={selectedSessions.has(session.id)}
                        onChange={() => toggleSessionSelection(session.id)}
                        className="h-4 w-4 text-blue-600 rounded"
                    />
                    <StatusBadge status={session.status} />
                </div>
                <div className="text-sm text-gray-500">
                    {new Date(session.created_at).toLocaleDateString()}
                </div>
            </div>

            <div className="mb-4">
                <p className="text-gray-700 line-clamp-2 text-sm mb-2">
                    {session.input_text}
                </p>
                <div className="flex items-center space-x-4 text-xs text-gray-500">
                    <span>Characters: {session.text_length}</span>
                    <span>Voice: {session.voice?.name || "Default"}</span>
                    <span>Model: {session.model?.name || "Default"}</span>
                </div>
            </div>

            {session.status === "completed" && session.audio_file && (
                <AudioPlayer session={session} />
            )}

            <div className="flex items-center justify-between">
                <div className="flex space-x-2">
                    <button
                        onClick={() => handleRerunSession(session)}
                        className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                        <svg className="w-4 h-4 fill-orange-500 mr-2" viewBox="0 0 24 24">
                            <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" />
                        </svg>
                        Re-run
                    </button>

                    {session.status === "completed" && session.audio_file && (
                        <button
                            onClick={() => handleDownload(session)}
                            className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs rounded-lg text-gray-700 hover:bg-gray-50"
                        >
                            <svg className="w-4 h-4 fill-blue-500 mr-2" viewBox="0 0 24 24">
                                <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
                            </svg>
                            Download
                        </button>
                    )}

                    {/* Future features */}
                    <button
                        onClick={() => handleShareSession(session)}
                        className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs rounded-lg text-gray-700 hover:bg-gray-50 opacity-50 cursor-not-allowed"
                        title="Coming soon"
                    >
                        <svg className="w-4 h-4 fill-green-500 mr-2" viewBox="0 0 24 24">
                            <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z" />
                        </svg>
                        Share
                    </button>
                </div>

                <button
                    onClick={() => handleDeleteSession(session.id)}
                    className="inline-flex items-center px-3 py-1.5 border border-red-300 text-xs rounded-lg text-red-700 hover:bg-red-50"
                >
                    <svg className="w-4 h-4 fill-red-500 mr-2" viewBox="0 0 24 24">
                        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                    </svg>
                    Delete
                </button>
            </div>

            {session.error_message && (
                <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                    <strong>Error:</strong> {session.error_message}
                </div>
            )}
        </div>
    );

    if (!user) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="flex justify-center items-center w-24 h-24 p-1 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg
                            className="w-14 h-14 m-auto fill-blue-700 text-3xl text-gray-400"
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 640 640"
                        >
                            <path d="M73 39.1C63.6 29.7 48.4 29.7 39.1 39.1C29.8 48.5 29.7 63.7 39 73.1L567 601.1C576.4 610.5 591.6 610.5 600.9 601.1C610.2 591.7 610.3 576.5 600.9 567.2L321.8 288C378.4 287 424 240.8 424 184C424 126.6 377.4 80 320 80C263.2 80 217 125.6 216 182.2L73 39.1zM512 352C494.8 352 478.3 355.4 463.3 361.6L633.3 531.6C637.5 526.2 640 519.4 640 512L640 480C640 409.3 582.7 352 512 352zM59.9 161.7C38.4 174.2 24 197.4 24 224C24 263.8 56.2 296 96 296C122.6 296 145.8 281.6 158.3 260.1L59.9 161.7zM250.2 352C196.8 377.9 160 432.7 160 496L160 512C160 529.7 174.3 544 192 544L442.2 544L250.2 352zM128 352C57.3 352 0 409.3 0 480L0 512C0 529.7 14.3 544 32 544L118.7 544C114.4 534.2 112 523.4 112 512L112 496C112 442.8 132 394.2 164.9 357.4C153.2 353.9 140.8 352 128 352zM616 224C616 184.2 583.8 152 544 152C504.2 152 472 184.2 472 224C472 263.8 504.2 296 544 296C583.8 296 616 263.8 616 224z" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                        Sign In Required
                    </h2>
                    <p className="text-gray-600">
                        Please sign in to access your Voice Studio.
                    </p>
                </div>
            </div>
        );
    }
    // ... rest of the component (pagination, filters, etc.) remains the same
    // [The rest of your existing component code for header, filters, pagination...]

    return (
        <div className="mt-8 min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4 sm:px-6 lg:px-8">
            <div className="relative max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="hidden text-3xl font-bold text-gray-900">Voice Studio</h1>
                            <p className="hidden text-gray-600 mt-2">
                                Manage your text-to-speech sessions and audio files
                            </p>
                        </div>
                        {/* session count/refresh */}
                        <div className="flex items-center space-x-4">
                            <span className="text-sm text-gray-500">
                                {sessions.length} total sessions
                            </span>
                            <button
                                onClick={fetchSessions}
                                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                            >
                                <i className="fas fa-refresh mr-2"></i>
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640">
                                    <path d="M129.9 292.5C143.2 199.5 223.3 128 320 128C373 128 421 149.5 455.8 184.2C456 184.4 456.2 184.6 456.4 184.8L464 192L416.1 192C398.4 192 384.1 206.3 384.1 224C384.1 241.7 398.4 256 416.1 256L544.1 256C561.8 256 576.1 241.7 576.1 224L576.1 96C576.1 78.3 561.8 64 544.1 64C526.4 64 512.1 78.3 512.1 96L512.1 149.4L500.8 138.7C454.5 92.6 390.5 64 320 64C191 64 84.3 159.4 66.6 283.5C64.1 301 76.2 317.2 93.7 319.7C111.2 322.2 127.4 310 129.9 292.6zM573.4 356.5C575.9 339 563.7 322.8 546.3 320.3C528.9 317.8 512.6 330 510.1 347.4C496.8 440.4 416.7 511.9 320 511.9C267 511.9 219 490.4 184.2 455.7C184 455.5 183.8 455.3 183.6 455.1L176 447.9L223.9 447.9C241.6 447.9 255.9 433.6 255.9 415.9C255.9 398.2 241.6 383.9 223.9 383.9L96 384C87.5 384 79.3 387.4 73.3 393.5C67.3 399.6 63.9 407.7 64 416.3L65 543.3C65.1 561 79.6 575.2 97.3 575C115 574.8 129.2 560.4 129 542.7L128.6 491.2L139.3 501.3C185.6 547.4 249.5 576 320 576C449 576 555.7 480.6 573.4 356.5z" />
                                </svg>
                                Refresh
                            </button>
                        </div>
                    </div>
                </div>

                {/* Global Audio Controls */}
                <div id="v-wrapper" className="absolute left-0 top-0 h-fit z-[1] w-fit mb-2">
                    <div className="flex w-fit items-center space-x-4 bg-white rounded-xl border border-gray-200 p-4">
                        <div className="flex items-left justify-between">
                            <div className="flex items-center space-x-2 mr-2">
                                <span className="text-sm font-medium text-gray-700">Volume:</span>
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={volume}
                                    onChange={(e) => handleVolumeChange(parseInt(e.target.value))}
                                    className="w-24"
                                />
                                <span className="text-sm text-gray-600">{volume}%</span>
                            </div>
                            <div className="flex items-center space-x-4">
                                <span className="text-sm font-medium text-gray-700">Playback Speed:</span>
                                <select
                                    value={playbackRate}
                                    onChange={(e) => handlePlaybackRateChange(parseFloat(e.target.value))}
                                    className="border border-gray-300 text-gray-600 rounded px-2 py-1 text-sm"
                                >
                                    <option value="0.5">0.5x</option>
                                    <option value="0.75">0.75x</option>
                                    <option value="1.0">1.0x</option>
                                    <option value="1.25">1.25x</option>
                                    <option value="1.5">1.5x</option>
                                    <option value="2.0">2.0x</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bulk Actions */}
                {selectedSessions.size > 0 && (
                    <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center justify-between">
                            <span className="text-blue-700 font-medium">
                                {selectedSessions.size} sessions selected
                            </span>
                            <div className="flex space-x-3">
                                <button
                                    onClick={handleBulkDelete}
                                    className="inline-flex items-center px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700"
                                >
                                    <span className="flex justify-center">
                                        <svg
                                            className="w-6 h-6 fill-white mr-1"
                                            xmlns="http://www.w3.org/2000/svg"
                                            viewBox="0 0 640 640"
                                        >
                                            <path d="M232.7 69.9L224 96L128 96C110.3 96 96 110.3 96 128C96 145.7 110.3 160 128 160L512 160C529.7 160 544 145.7 544 128C544 110.3 529.7 96 512 96L416 96L407.3 69.9C402.9 56.8 390.7 48 376.9 48L263.1 48C249.3 48 237.1 56.8 232.7 69.9zM512 208L128 208L149.1 531.1C150.7 556.4 171.7 576 197 576L443 576C468.3 576 489.3 556.4 490.9 531.1L512 208z" />
                                        </svg>
                                        Delete Selected
                                    </span>
                                </button>
                                <button
                                    onClick={() => setSelectedSessions(new Set())}
                                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Filters and Search */}
                <div className="mb-6 bg-white rounded-xl border border-gray-200 p-6 mt-8">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Search
                            </label>
                            <input
                                type="text"
                                placeholder="Search sessions..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Status
                            </label>
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800"
                            >
                                <option value="all">All Status</option>
                                <option value="pending">Pending</option>
                                <option value="processing">Processing</option>
                                <option value="completed">Completed</option>
                                <option value="error">Error</option>
                                <option value="failed">Failed</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Date
                            </label>
                            <select
                                value={dateFilter}
                                onChange={(e) => setDateFilter(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800"
                            >
                                <option value="all">All Time</option>
                                <option value="today">Today</option>
                                <option value="week">Last 7 Days</option>
                                <option value="month">Last 30 Days</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Sort By
                            </label>
                            <select
                                onChange={(e) => {
                                    // Implement sorting logic
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800"
                            >
                                <option value="newest">Newest First</option>
                                <option value="oldest">Oldest First</option>
                                <option value="text_length">Text Length</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Sessions Grid */}
                {loading ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {[...Array(6)].map((_, i) => (
                            <div
                                key={i}
                                className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse"
                            >
                                <div className="flex justify-between mb-4">
                                    <div className="h-6 bg-gray-200 rounded w-24"></div>
                                    <div className="h-4 bg-gray-200 rounded w-20"></div>
                                </div>
                                <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                                <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                                <div className="h-8 bg-gray-200 rounded w-full"></div>
                            </div>
                        ))}
                    </div>
                ) : filteredSessions.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg
                                className="w-6 h-6 fill-white mr-1 text-3xl text-gray-400"
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 640 640"
                            >
                                <path d="M128 160C128 142.3 142.3 128 160 128L320 128C337.7 128 352 142.3 352 160L352 448L448 448L448 320C448 302.3 462.3 288 480 288L544 288C561.7 288 576 302.3 576 320C576 337.7 561.7 352 544 352L512 352L512 480C512 497.7 497.7 512 480 512L320 512C302.3 512 288 497.7 288 480L288 192L192 192L192 320C192 337.7 177.7 352 160 352L96 352C78.3 352 64 337.7 64 320C64 302.3 78.3 288 96 288L128 288L128 160z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                            No sessions found
                        </h3>
                        <p className="text-gray-600 mb-4">
                            {searchTerm || statusFilter !== "all" || dateFilter !== "all"
                                ? "Try adjusting your filters to see more results"
                                : "Get started by creating your first text-to-speech conversion"}
                        </p>
                        {!searchTerm && statusFilter === "all" && dateFilter === "all" && (
                            <button
                                onClick={() => (window.location.href = "/editor")}
                                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700"
                            >
                                <svg
                                    className="w-6 h-6 fill-white mr-1"
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 640 640"
                                >
                                    <path d="M352 128C352 110.3 337.7 96 320 96C302.3 96 288 110.3 288 128L288 288L128 288C110.3 288 96 302.3 96 320C96 337.7 110.3 352 128 352L288 352L288 512C288 529.7 302.3 544 320 544C337.7 544 352 529.7 352 512L352 352L512 352C529.7 352 544 337.7 544 320C544 302.3 529.7 288 512 288L352 288L352 128z" />
                                </svg>
                                Create New Session
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        {/* Sessions */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                            {currentSessions.map((session) => (
                                <SessionCard key={session.id} session={session} />
                            ))}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 px-6 py-4">
                                <div className="text-sm text-gray-700">
                                    Showing {indexOfFirstItem + 1}-
                                    {Math.min(indexOfLastItem, filteredSessions.length)} of{" "}
                                    {filteredSessions.length} sessions
                                </div>
                                <div className="flex space-x-2">
                                    <button
                                        onClick={() =>
                                            setCurrentPage((prev) => Math.max(prev - 1, 1))
                                        }
                                        disabled={currentPage === 1}
                                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Previous
                                    </button>
                                    {[...Array(totalPages)].map((_, i) => (
                                        <button
                                            key={i + 1}
                                            onClick={() => setCurrentPage(i + 1)}
                                            className={`px-3 py-2 border rounded-lg text-sm ${currentPage === i + 1
                                                ? "bg-blue-600 text-white border-blue-600"
                                                : "border-gray-300 text-gray-700"
                                                }`}
                                        >
                                            {i + 1}
                                        </button>
                                    ))}
                                    <button
                                        onClick={() =>
                                            setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                                        }
                                        disabled={currentPage === totalPages}
                                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
                {/* Your existing JSX for header, filters, session cards, etc. */}
                {/* ... */}
            </div>
        </div>
    );
};

export default VoiceStudio;
