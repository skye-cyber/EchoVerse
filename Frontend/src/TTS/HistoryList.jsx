import React, { useState, useEffect } from "react";
import { ttsService } from "../../services/tts";
import { useAuth } from "../../contexts/AuthContext";

const HistoryList = ({ onSelectHistoryItem }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchHistory();
    }
  }, [user, page]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const response = await ttsService.getHistory(page, 10);
      setHistory((prev) =>
        page === 1 ? response.results : [...prev, ...response.results],
      );
      setHasMore(!!response.next);
    } catch (error) {
      console.error("Failed to fetch history:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    try {
      await ttsService.deleteHistoryItem(id);
      setHistory((prev) => prev.filter((item) => item.id !== id));
    } catch (error) {
      console.error("Failed to delete history item:", error);
    }
  };

  const loadMore = () => {
    if (hasMore && !loading) {
      setPage((prev) => prev + 1);
    }
  };

  if (!user) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          Conversion History
        </h2>
        <div className="text-center py-8">
          <div className="mx-auto h-12 w-12 text-gray-400">
            <svg
              className="w-full h-full"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            Sign in to view history
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Your conversion history will be saved when you're logged in.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium text-gray-900">
          Conversion History
        </h2>
        {history.length > 0 && (
          <button
            onClick={fetchHistory}
            className="text-sm text-blue-600 hover:text-blue-500"
          >
            Refresh
          </button>
        )}
      </div>
    </div>
  );
};
