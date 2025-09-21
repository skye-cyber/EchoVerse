import api from "./api";

export const authService = {
  login: async (email, password) => {
    const response = await api.post("/auth/login/", { email, password });
    return response.data;
  },

  register: async (userData) => {
    const response = await api.post("/auth/register/", userData);
    return response.data;
  },

  logout: async () => {
    const refreshToken = localStorage.getItem("refreshToken");
    if (refreshToken) {
      try {
        await api.post("/auth/logout/", { refresh: refreshToken });
      } catch (error) {
        console.error("Logout error:", error);
      }
    }
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
  },

  getProfile: async () => {
    const response = await api.get("/auth/profile/");
    return response.data;
  },

  updateProfile: async (profileData) => {
    const response = await api.put("/auth/profile/", profileData);
    return response.data;
  },

  changePassword: async (passwordData) => {
    const response = await api.post("/auth/change-password/", passwordData);
    return response.data;
  },

  requestPasswordReset: async (email) => {
    const response = await api.post("/auth/password-reset/", { email });
    return response.data;
  },

  resetPassword: async (uid, token, newPassword) => {
    const response = await api.post("/auth/password-reset-confirm/", {
      uid,
      token,
      new_password: newPassword,
    });
    return response.data;
  },
};
