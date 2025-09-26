# Frontend-Backend Communication & Session Management

This is an excellent question! Session management is one of the most common challenges when connecting React frontends to Django backends. Let me explain the best approaches.

## Communication Methods

### 1. RESTful API with JWT (Recommended)
This is the modern approach and works best with React:

```javascript
// Frontend (React) - API calls
const response = await fetch('/api/endpoint/', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify(data)
});
```

```python
# Backend (Django) - API view
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

class ProtectedView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        # Process request
        return Response({"data": "success"})
```

### 2. Django Session Authentication (Traditional)
Uses Django's built-in session system:

```python
# settings.py
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",  # React dev server
    "http://yourdomain.com",
]

SESSION_COOKIE_SAMESITE = 'Lax'
SESSION_COOKIE_HTTPONLY = True
CSRF_COOKIE_SAMESITE = 'Lax'
```

```javascript
// Frontend - Include credentials
const response = await fetch('/api/endpoint/', {
  method: 'POST',
  credentials: 'include',  // Important for sessions
  headers: {
    'Content-Type': 'application/json',
    'X-CSRFToken': getCSRFToken(),  // For CSRF protection
  },
  body: JSON.stringify(data)
});
```

## Session Management Solutions

### Option 1: JWT Tokens (Best for SPAs)

**Backend (Django):**
```python
# settings.py
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    )
}

# urls.py
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

urlpatterns = [
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]
```

**Frontend (React):**
```javascript
// services/auth.js
export const authService = {
  login: async (email, password) => {
    const response = await api.post('/api/token/', { email, password });
    const { access, refresh } = response.data;
    
    localStorage.setItem('accessToken', access);
    localStorage.setItem('refreshToken', refresh);
    
    return response.data;
  },
  
  refreshToken: async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    const response = await api.post('/api/token/refresh/', { refresh: refreshToken });
    
    localStorage.setItem('accessToken', response.data.access);
    return response.data.access;
  }
};

// services/api.js - Axios interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const newToken = await authService.refreshToken();
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Redirect to login
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);
```

### Option 2: Django Session Authentication

**Backend (Django):**
```python
# settings.py
INSTALLED_APPS = [
    # ...
    'corsheaders',
    'rest_framework',
    'rest_framework.authtoken',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    # ...
]

CORS_ALLOW_CREDENTIALS = True
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ]
}
```

**Frontend (React):**
```javascript
// services/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000',
  withCredentials: true,  // This sends cookies with requests
});

// Utility to get CSRF token
export const getCSRFToken = () => {
  const cookieValue = document.cookie
    .split('; ')
    .find(row => row.startsWith('csrftoken='))
    ?.split('=')[1];
  
  return cookieValue || '';
};

// Add CSRF token to requests
api.interceptors.request.use((config) => {
  if (['post', 'put', 'patch', 'delete'].includes(config.method)) {
    config.headers['X-CSRFToken'] = getCSRFToken();
  }
  return config;
});
```

## Complete Authentication Flow Example

### Backend (Django Views)
```python
# views.py
from rest_framework import status
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.response import Response
from django.contrib.auth import authenticate, login, logout
from django.middleware.csrf import get_token
from django.contrib.auth.models import User
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated

@api_view(['GET'])
def get_csrf_token(request):
    return Response({'csrfToken': get_token(request)})

@api_view(['POST'])
@authentication_classes([])
@permission_classes([])
def login_view(request):
    username = request.data.get('username')
    password = request.data.get('password')
    
    user = authenticate(username=username, password=password)
    if user is not None:
        login(request, user)
        return Response({'message': 'Login successful'})
    else:
        return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)

@api_view(['POST'])
def logout_view(request):
    logout(request)
    return Response({'message': 'Logout successful'})

@api_view(['GET'])
@authentication_classes([SessionAuthentication])
@permission_classes([IsAuthenticated])
def protected_view(request):
    return Response({'data': 'This is protected data'})
```

### Frontend (React Components)
```javascript
// contexts/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/auth';

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await authService.getProfile();
      setUser(response.data);
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    try {
      await authService.login(username, password);
      const profile = await authService.getProfile();
      setUser(profile.data);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.error || 'Login failed' };
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
    }
  };

  const value = {
    user,
    login,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
```

## Common Issues & Solutions

### 1. CORS Issues
```python
# settings.py
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
]

CORS_EXPOSE_HEADERS = ['Content-Type', 'X-CSRFToken']
CORS_ALLOW_CREDENTIALS = True
```

### 2. CSRF Token Issues
```javascript
// services/auth.js
export const authService = {
  getCSRFToken: async () => {
    const response = await api.get('/api/csrf/');
    return response.data.csrfToken;
  },
  
  login: async (username, password) => {
    // Get CSRF token first if using session auth
    const csrfToken = await authService.getCSRFToken();
    
    const response = await api.post('/api/login/', {
      username,
      password
    }, {
      headers: {
        'X-CSRFToken': csrfToken
      }
    });
    
    return response.data;
  }
};
```

### 3. Session Persistence
For production, ensure your session settings are correct:

```python
# settings.py
SESSION_ENGINE = 'django.contrib.sessions.backends.cached_db'
SESSION_COOKIE_AGE = 1209600  # 2 weeks in seconds
SESSION_SAVE_EVERY_REQUEST = True

# For production
SESSION_COOKIE_SECURE = True  # Only send over HTTPS
SESSION_COOKIE_HTTPONLY = True  # Prevent JavaScript access
```

## Recommendation

For your TTS project, I recommend using **JWT authentication** because:

1. **Stateless**: No server-side session storage needed
2. **Scalable**: Works well with multiple servers/containers
3. **SPA Friendly**: Perfect for React applications
4. **Mobile Ready**: Easy to use with mobile apps
5. **API First**: Designed for API-based architectures

The JWT approach I showed earlier with refresh token rotation is the most robust solution for production applications.

Would you like me to dive deeper into any specific aspect of the frontend-backend communication or session management?
