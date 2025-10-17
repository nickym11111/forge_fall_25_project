const api_url = "http://127.0.0.1:8000"; // Same as before
export async function LoginRequest(email: string, password: string) {
    const response = await fetch(`${api_url}/log-in/`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    return data;
} */

import { supabase } from '../utils/client'

export async function LoginRequest(email: string, password: string) {
    const response = await fetch(`${api_url}/log-in/`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    return data;
} */

import { supabase } from '../utils/client'

export async function LoginRequest(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  console.log("Login data:", data); // Debug log
  console.log("Login error:", error);

  if (error) {
    return { 
      status: 'error', 
      message: error.message 
    };
  }

  return { 
    status: 'success',
    message: 'Login successful',
    session: data.session,
    user: data.user 
  };
}
