import { apiRequest } from "./api";
import type { User } from "./types";

interface AuthResponse {
  user: User;
  token: string;
}

export const authService = {
  login(email: string, password: string): Promise<AuthResponse> {
    return apiRequest<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });
  },

  register(name: string, email: string, password: string): Promise<AuthResponse> {
    return apiRequest<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password })
    });
  },

  me(): Promise<{ user: User }> {
    return apiRequest<{ user: User }>("/auth/me");
  },

  logout(): Promise<void> {
    return apiRequest<void>("/auth/logout", { method: "POST" });
  }
};
