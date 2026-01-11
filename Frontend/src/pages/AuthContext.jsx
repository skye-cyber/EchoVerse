import React, { createContext, useContext, useState, useEffect } from "react";
import { authService } from "../services/auth";
import api from "../services/api";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem("accessToken");
      const username = localStorage.getItem("username"); // store this on login
      if (token) {
        try {
          if (username) {
            setUser({ username: username, roles: ["user"] }); // or fetch roles from API
          }
          /*const res = await authService.getProfile();
          let userData = res.status === 200 ? res.data : null;
          setUser(userData);*/
        } catch (error) {
          console.error("Failed to get user profile:", error);
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (eu, password) => {
    const response = await authService.login(eu, password);
    if (response.access) {
      const { username, roles, access, refresh } = response;
      localStorage.setItem("accessToken", access);
      localStorage.setItem("refreshToken", refresh);
      localStorage.setItem("username", username);

      setUser({
        username: username,
        roles: roles || ["user"], // adjust based on your backend
      });

      return response;
    } else {
      throw response;
    }
  };

  const register = async (userData) => {
    const response = await authService.register(userData);
    const { access, refresh, user: newUser } = response;

    localStorage.setItem("accessToken", access);
    localStorage.setItem("refreshToken", refresh);
    setUser(newUser);

    return newUser;
  };

  const logout = async () => {
    await authService.logout();
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("username");
    setUser(null);
  };

  const updateProfile = async (profileData) => {
    const updatedUser = await authService.updateProfile(profileData);
    setUser(updatedUser);
    return updatedUser;
  };

  const getProfile = async () => {
    const response = await api.get("/user/profile/");
    return response.data;
  };

  const value = {
    user,
    login,
    register,
    logout,
    getProfile,
    updateProfile,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

//export const useAuth = () => useContext(AuthContext);
