import api from "./api";

export const ttsService = {
  convertText: async (text, voice = "default", speed = 1.0) => {
    const formData = new FormData();
    formData.append("text", text);
    formData.append("voice", voice);
    formData.append("speed", speed.toString());

    const response = await api.post("/tts/convert/", formData, {
      responseType: "blob",
    });

    return response.data;
  },

  uploadFile: async (file, voice = "default", speed = 1.0) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("voice", voice);
    formData.append("speed", speed.toString());

    const response = await api.post("/tts/upload-convert/", formData, {
      responseType: "blob",
    });

    return response.data;
  },

  getVoices: async () => {
    const response = await api.get("/tts/voices/");
    return response.data;
  },

  getHistory: async (page = 1, pageSize = 10) => {
    const response = await api.get("/tts/history/", {
      params: { page, page_size: pageSize },
    });
    return response.data;
  },

  deleteHistoryItem: async (id) => {
    const response = await api.delete(`/tts/history/${id}/`);
    return response.data;
  },

  saveToHistory: async (ttsData) => {
    const response = await api.post("/tts/history/", ttsData);
    return response.data;
  },
};
