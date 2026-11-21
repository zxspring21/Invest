import axios from 'axios';
import { LoginRequest, RegisterRequest, AuthResponse, User } from '@/types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refreshToken,
          });

          const { accessToken, refreshToken: newRefreshToken } = response.data.data.tokens;
          
          localStorage.setItem('token', accessToken);
          localStorage.setItem('refreshToken', newRefreshToken);

          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, redirect to login
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export const authService = {
  // Login user
  async login(credentials: LoginRequest): Promise<{ data: AuthResponse }> {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },

  // Register user
  async register(userData: RegisterRequest): Promise<{ data: AuthResponse }> {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },

  // Logout user
  async logout(): Promise<void> {
    await api.post('/auth/logout');
  },

  // Refresh token
  async refreshToken(refreshToken: string): Promise<{ data: { tokens: { accessToken: string; refreshToken: string } } }> {
    const response = await api.post('/auth/refresh', { refreshToken });
    return response.data;
  },

  // Get user profile
  async getProfile(): Promise<{ data: { user: User } }> {
    const response = await api.get('/auth/me');
    return response.data;
  },

  // Update user profile
  async updateProfile(userData: Partial<User>): Promise<{ data: { user: User } }> {
    const response = await api.put('/auth/me', userData);
    return response.data;
  },

  // Change password
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await api.post('/auth/change-password', {
      currentPassword,
      newPassword,
    });
  },

  // Forgot password
  async forgotPassword(email: string): Promise<void> {
    await api.post('/auth/forgot-password', { email });
  },

  // Reset password
  async resetPassword(token: string, password: string): Promise<void> {
    await api.post('/auth/reset-password', { token, password });
  },

  // Verify email
  async verifyEmail(token: string): Promise<void> {
    await api.post('/auth/verify-email', { token });
  },

  // Resend verification email
  async resendVerification(email: string): Promise<void> {
    await api.post('/auth/resend-verification', { email });
  },
};
