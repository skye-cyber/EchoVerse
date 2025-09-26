import api from "./api";

export const authService = {
  login: async (eu, password) => {
    const response = await api.post("/user/login/", { eu, password });
    if (response?.status === 200) {
      const { access, refresh } = response?.data?.auth_data;
      localStorage.setItem("accessToken", access);
      localStorage.setItem("refreshToken", refresh);

      return response.data.auth_data;
    } else {
      return response;
    }
  },

  register: async (userData) => {
    const response = await api.post("/user/register/", userData);
    return response.data;
  },

  logout: async () => {
    const refreshToken = localStorage.getItem("refreshToken");
    if (refreshToken) {
      try {
        await api.post("/user/logout/", { refresh: refreshToken });
      } catch (error) {
        console.error("Logout error:", error);
      }
    }
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
  },

  getProfile: async () => {
    const response = await api.get("/user/profile/");
    console.log(response);
    return response.data;
  },

  updateProfile: async (profileData) => {
    const response = await api.put("/user/profile/update", profileData);
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

  refreshToken: async () => {
    const refreshToken = localStorage.getItem("refreshToken");
    const response = await api.post("/api/token/refresh/", {
      refresh: refreshToken,
    });

    localStorage.setItem("accessToken", response.data.access);
    return response.data.access;
  },
};
