import React from "react";
import {
    BrowserRouter as Router,
    Routes,
    Route,
    useLocation,
} from "react-router-dom";
import { AuthProvider } from "./pages/AuthContext";
import Header from "./components/Layout/Header";
import Footer from "./components/Layout/Footer";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Editor from "./pages/Editor";
import Pricing from "./pages/Pricing";
import Login from "./Auth/Login";
import Register from "./Auth/Register";
import Profile from "./Auth/Profile";
import VoiceStudio from "./pages/VoiceStudio";
import ProtectedRoute from "./components/Common/ProtectedRoute";
import ErrorBoundary from "./components/ErrorHandler/ErrorBoundary";

function Layout({ children }) {
    const location = useLocation();
    const noFooterRoutes = [
        "/",
        "/dashboard",
        "/login",
        "/register",
        "/pricing",
        "/editor",
        "/studio",
        "/profile",
    ];
    const noHeaderRoutes = ["/"];
    const hideHeader = noHeaderRoutes.includes(location.pathname);

    const hideFooter = noFooterRoutes.includes(location.pathname);

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {!hideHeader && <Header />}
            <main className="flex-grow">{children}</main>
            {!hideFooter && <Footer />}
        </div>
    );
}

function App() {
    return (
        <AuthProvider>
            <Router>
                <Layout>
                    <Routes>
                        <Route path="/" element={
                            <ErrorBoundary>
                                <Home />
                            </ErrorBoundary>
                        } />
                        <Route path="/login" element={
                            <ErrorBoundary>
                                <Login />
                            </ErrorBoundary>
                        } />
                        <Route path="/register" element={
                            <ErrorBoundary>
                                <Register />
                            </ErrorBoundary>
                        } />
                        <Route path="/pricing" element={
                            <ErrorBoundary>
                                <Pricing />
                            </ErrorBoundary>
                        } />
                        <Route path="/studio" element={
                            <ErrorBoundary>
                                <VoiceStudio />
                            </ErrorBoundary>
                        } />
                        <Route
                            path="/dashboard"
                            element={
                                <ProtectedRoute>
                                    <ErrorBoundary>
                                        <Dashboard />
                                    </ErrorBoundary>
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/editor"
                            element={
                                <ProtectedRoute>
                                    <ErrorBoundary>
                                        <Editor />
                                    </ErrorBoundary>
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/profile"
                            element={
                                <ProtectedRoute>
                                    <ErrorBoundary>
                                        <Profile />
                                    </ErrorBoundary>
                                </ProtectedRoute>
                            }
                        />
                    </Routes>
                </Layout>
            </Router>
        </AuthProvider >
    );
}

export default App;
