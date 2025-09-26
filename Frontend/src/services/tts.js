import api from "./api";

export const ttsService = {
    convertText: async (text, voice = "default", speed = 1.0) => {
        try {
            const formData = new FormData();
            formData.append("text", text);
            formData.append("voice", voice);
            formData.append("speed", speed.toString());

            const response = await api.post("/studio/ttsfy/text/", formData, {
                responseType: "json",
            });
            return response.data;
        } catch (err) { }
    },

    uploadFile: async (file, voice = "default", speed = 1.0) => {
        try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("voice", voice);
            formData.append("speed", speed.toString());

            const response = await api.post("/studio/ttsfy/file/", formData, {
                responseType: "json",
            });

            return response.data;
        } catch (err) { }
    },

    TaskStatus: async (id) => {
        try {
            const response = await api.get(`/studio/ttsfy/status/${id}/`);
            return response;
        } catch (err) { }
    },

    RunSession: async (id) => {
        try {
            const response = await api.patch(`/studio/session/run/${id}/`);
            return response;
        } catch (err) { }
    },

    DeleteSession: async (id) => {
        try {
            const response = await api.delete(`/studio/session/delete/${id}/`);
            console.log(response.data);
            return response;
        } catch (err) { }
    },

    DownloadSessionFile: async (id) => {
      try {
        const response = await api.get(`/studio/session/${id}/file/download/`);
        return response;
      } catch (err) { }
    },

    FetchSessions: async (page = 1, pageSize = 10) => {
        try {
            const response = await api.get("/studio/sessions/fetch/", {
                params: { page, page_size: pageSize },
            });
            return response.data;
        } catch (err) { }
    },

    FetchFileBlob: async (id) => {
        try {
            const response = await api.get(`/studio/session/${id}/file/blob/`, {
                responseType: "blob"
            });
            return response;
        } catch (err) { console.log(err) }
    },

    getHistory: async (page = 1, pageSize = 10) => {
        try {
            const response = await api.get("/studio/tts/history/", {
                params: { page, page_size: pageSize },
            });
            return response.data;
        } catch (err) { }
    },

    getVoices: async () => {
        try {
            const response = await api.get("/studio/tts/voices/");
            return response.data.voices;
        } catch (err) { }
    },

    /*deleteHistoryItem: async (id) => {
     * try{
          const response = await api.delete(`/studio/tts/history/${id}/`);
          return response.data;
      } catch (err) { }
    },

    saveToHistory: async (ttsData) => {
      const response = await api.post("/studio/tts/history/", ttsData);
      return response.data;
    },*/
};
