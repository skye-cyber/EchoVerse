import React, { useState, useEffect } from "react";
import { useAuth } from "../pages/AuthContext";

const Profile = () => {
  const { user, updateProfile, changePassword, getProfile } = useAuth();
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [profileData, setProfileData] = useState({
    name: "",
    email: "",
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [notifications, setNotifications] = useState({
    profile: { message: "", error: "" },
    password: { message: "", error: "" },
  });
  const [isLoading, setIsLoading] = useState({
    profile: false,
    password: false,
    initial: true,
  });
  const [userProfile, setUserProfile] = useState(null);

  // Load profile data on component mount
  useEffect(() => {
    const loadProfile = async () => {
      if (user) {
        try {
          const profile = await getProfile();
          setUserProfile(profile);
          setProfileData({
            name: profile.username || "",
            email: profile.email || "",
          });
        } catch (err) {
          setNotification(
            "profile",
            "error",
            `Failed to load profile data: ${err?.response?.status ? err?.response?.status : ""}`,
          );
          console.error(
            "Error loading profile:",
            err?.response?.data?.message ||
              err?.response?.status ||
              err?.data?.message ||
              err?.data, //||
            //err,
          );
        } finally {
          setIsLoading((prev) => ({ ...prev, initial: false }));
        }
      }
    };

    loadProfile();
  }, [user, getProfile]);

  const handleInputChange = (setter) => (e) => {
    setter((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const setNotification = (type, field, value) => {
    setNotifications((prev) => ({
      ...prev,
      [type]: { ...prev[type], [field]: value },
    }));
  };

  const resetForms = () => {
    setProfileData({
      name: userProfile?.username || "",
      email: userProfile?.email || "",
    });
    setPasswordData({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
    setNotifications({
      profile: { message: "", error: "" },
      password: { message: "", error: "" },
    });
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setNotification("profile", "error", "");
    setNotification("profile", "message", "");
    setIsLoading((prev) => ({ ...prev, profile: true }));

    try {
      await updateProfile(profileData);
      setNotification("profile", "message", "Profile updated successfully");

      // Refresh profile data after update
      const updatedProfile = await getProfile();
      setUserProfile(updatedProfile);

      setTimeout(() => {
        setIsEditingProfile(false);
      }, 1500);
    } catch (err) {
      setNotification(
        "profile",
        "error",
        err.response?.data?.message || "Failed to update profile",
      );
    } finally {
      setIsLoading((prev) => ({ ...prev, profile: false }));
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setNotification("password", "error", "");
    setNotification("password", "message", "");

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      return setNotification("password", "error", "New passwords do not match");
    }

    if (passwordData.newPassword.length < 6) {
      return setNotification(
        "password",
        "error",
        "Password must be at least 6 characters long",
      );
    }

    setIsLoading((prev) => ({ ...prev, password: true }));

    try {
      await changePassword({
        current_password: passwordData.currentPassword,
        new_password: passwordData.newPassword,
      });
      setNotification("password", "message", "Password changed successfully");
      setTimeout(() => {
        setIsChangingPassword(false);
        setPasswordData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
      }, 1500);
    } catch (err) {
      setNotification(
        "password",
        "error",
        err.response?.data?.message || "Failed to change password",
      );
    } finally {
      setIsLoading((prev) => ({ ...prev, password: false }));
    }
  };

  const handleCancelEdit = () => {
    setIsEditingProfile(false);
    resetForms();
  };

  const handleCancelPasswordChange = () => {
    setIsChangingPassword(false);
    resetForms();
  };

  const Notification = ({ message, isError = false }) => {
    if (!message) return null;

    const styles = isError
      ? "bg-red-50 border border-red-200 text-red-800"
      : "bg-green-50 border border-green-200 text-green-800";

    return (
      <div
        className={`rounded-lg p-4 mb-4 transition-all duration-300 ${styles}`}
      >
        <p className="text-sm font-medium flex items-center">
          {isError ? "⚠️" : "✅"} {message}
        </p>
      </div>
    );
  };

  const LoadingButton = ({ loading, children, ...props }) => (
    <button
      {...props}
      disabled={loading}
      className="flex justify-center items-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
    >
      {loading ? (
        <>
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          Processing...
        </>
      ) : (
        children
      )}
    </button>
  );

  const InputField = ({ label, type = "text", value, onChange, ...props }) => (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 outline-none"
        {...props}
      />
    </div>
  );

  const InfoField = ({ label, value }) => (
    <div className="flex justify-between items-center py-3 border-b border-gray-100 last:border-b-0">
      <span className="text-sm font-medium text-gray-600">{label}</span>
      <span className="text-sm text-gray-900">{value || "Not set"}</span>
    </div>
  );

  const LoadingSpinner = () => (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-sm p-8 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="animate-spin h-8 w-8 text-blue-600"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">
          Loading Profile
        </h1>
        <p className="text-gray-600">
          Please wait while we load your profile data...
        </p>
      </div>
    </div>
  );

  if (!user) {
    return (
      <div className="mt-12 min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-sm p-8 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">👤</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Profile Access
          </h1>
          <p className="text-gray-600">
            Please sign in to view your profile settings.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading.initial && !userProfile) {
    return <LoadingSpinner />;
  }

  return (
    <div className="mt-12 min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Account Settings</h1>
          <p className="text-gray-600 mt-2">
            Manage your profile information and security settings
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Profile Information Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                  <span className="text-blue-600">👤</span>
                </div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Profile Information
                </h2>
              </div>
              {!isEditingProfile && (
                <button
                  onClick={() => setIsEditingProfile(true)}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center"
                >
                  <svg
                    className="w-4 h-4 mr-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                  Edit
                </button>
              )}
            </div>

            {isEditingProfile ? (
              <form onSubmit={handleProfileSubmit} className="space-y-4">
                <InputField
                  label="Username"
                  name="name"
                  value={profileData.name}
                  onChange={handleInputChange(setProfileData)}
                  placeholder="Enter your username"
                />

                <InputField
                  label="Email Address"
                  type="email"
                  name="email"
                  value={profileData.email}
                  onChange={handleInputChange(setProfileData)}
                  placeholder="Enter your email address"
                />

                <Notification message={notifications.profile.message} />
                <Notification message={notifications.profile.error} isError />

                <div className="flex space-x-3 pt-2">
                  <LoadingButton
                    type="submit"
                    loading={isLoading.profile}
                    className="flex-1"
                  >
                    Save Changes
                  </LoadingButton>
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors duration-200"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-1">
                <InfoField label="Username" value={userProfile?.username} />
                <InfoField label="Email Address" value={userProfile?.email} />
                <InfoField
                  label="Email Verified"
                  value={
                    userProfile?.email_verified
                      ? "Verified ✅"
                      : "Not Verified ❌"
                  }
                />
              </div>
            )}
          </div>

          {/* Password Change Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                  <span className="text-green-600">🔒</span>
                </div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Password Security
                </h2>
              </div>
              {!isChangingPassword && (
                <button
                  onClick={() => setIsChangingPassword(true)}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center"
                >
                  <svg
                    className="w-4 h-4 mr-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                  Change
                </button>
              )}
            </div>

            {isChangingPassword ? (
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <InputField
                  label="Current Password"
                  type="password"
                  name="currentPassword"
                  value={passwordData.currentPassword}
                  onChange={handleInputChange(setPasswordData)}
                  placeholder="Enter current password"
                />

                <InputField
                  label="New Password"
                  type="password"
                  name="newPassword"
                  value={passwordData.newPassword}
                  onChange={handleInputChange(setPasswordData)}
                  placeholder="Enter new password"
                />

                <InputField
                  label="Confirm New Password"
                  type="password"
                  name="confirmPassword"
                  value={passwordData.confirmPassword}
                  onChange={handleInputChange(setPasswordData)}
                  placeholder="Confirm new password"
                />

                <Notification message={notifications.password.message} />
                <Notification message={notifications.password.error} isError />

                <div className="flex space-x-3 pt-2">
                  <LoadingButton
                    type="submit"
                    loading={isLoading.password}
                    className="flex-1"
                  >
                    Update Password
                  </LoadingButton>
                  <button
                    type="button"
                    onClick={handleCancelPasswordChange}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors duration-200"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="text-center py-4">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl">🔒</span>
                </div>
                <p className="text-gray-600 text-sm">
                  Secure your account with a strong password
                </p>
                <button
                  onClick={() => setIsChangingPassword(true)}
                  className="mt-3 text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  Change Password
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Account Information Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mt-8">
          <div className="flex items-center mb-6">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
              <span className="text-purple-600">📊</span>
            </div>
            <h2 className="text-xl font-semibold text-gray-900">
              Account Overview
            </h2>
          </div>

          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <dt className="text-sm font-medium text-gray-500 mb-1">
                User Roles
              </dt>
              <dd className="text-lg font-semibold text-gray-900">
                {userProfile?.roles?.map((role) => (
                  <span
                    key={role}
                    className="capitalize bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs mr-1"
                  >
                    {role}
                  </span>
                )) || "User"}
              </dd>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <dt className="text-sm font-medium text-gray-500 mb-1">
                TTS Sessions
              </dt>
              <dd className="text-lg font-semibold text-gray-900">
                {userProfile?.session_count?.toLocaleString() || "0"}
              </dd>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <dt className="text-sm font-medium text-gray-500 mb-1">
                Email Status
              </dt>
              <dd className="text-lg font-semibold text-gray-900">
                <span
                  className={`px-3 py-1 rounded-full text-xs ${
                    userProfile?.email_verified
                      ? "bg-green-100 text-green-800"
                      : "bg-yellow-100 text-yellow-800"
                  }`}
                >
                  {userProfile?.email_verified
                    ? "Verified"
                    : "Pending Verification"}
                </span>
              </dd>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <dt className="text-sm font-medium text-gray-500 mb-1">
                Account Status
              </dt>
              <dd className="text-lg font-semibold text-gray-900">
                <span className="px-3 py-1 rounded-full text-xs bg-green-100 text-green-800">
                  {userProfile?.account_status}
                </span>
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
};

export default Profile;
