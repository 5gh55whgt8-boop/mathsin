import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, flushPendingLocalScans } from '../api/client';
const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);
export function AuthProvider({ children }) {
  const [user,setUser]=useState(null), [loading,setLoading]=useState(true);
  useEffect(() => {
    if (!user) return undefined;
    const timer = setInterval(() => flushPendingLocalScans().catch(() => {}), 30000);
    return () => clearInterval(timer);
  }, [user]);
  useEffect(()=>{(async()=>{
    try {
      const t=await AsyncStorage.getItem('token');
      if(t){
        try {
          const {data}=await api.get('/auth/me');
          await AsyncStorage.setItem('user', JSON.stringify(data.user)).catch(() => {});
          setUser(data.user);
          flushPendingLocalScans().catch(() => {});
        } catch (error) {
          const status = error?.response?.status;
          if (status === 401 || status === 403) {
            await AsyncStorage.multiRemove(['token', 'user']).catch(() => {});
          } else {
            // Server asleep or offline: keep the session instead of showing the login screen.
            const cached = await AsyncStorage.getItem('user').catch(() => null);
            if (cached) { try { setUser(JSON.parse(cached)); } catch { /* ignore */ } }
          }
        }
      }
    } catch {} finally {setLoading(false);}
  })()},[]);
  async function login(email,password){ const {data}=await api.post('/auth/login',{email,password}); await AsyncStorage.setItem('token',data.token); await AsyncStorage.setItem('user', JSON.stringify(data.user)); setUser(data.user); flushPendingLocalScans().catch(() => {}); }
  async function register(name,email,password){ const {data}=await api.post('/auth/register',{name,email,password}); return data; }
  async function verifyOtp(email,code){ const {data}=await api.post('/auth/otp/verify',{email,code}); await AsyncStorage.setItem('token',data.token); await AsyncStorage.setItem('user', JSON.stringify(data.user)); setUser(data.user); flushPendingLocalScans().catch(() => {}); }
  async function resendOtp(email){ const {data}=await api.post('/auth/otp/resend',{email}); return data; }
  async function logout(){ await AsyncStorage.multiRemove(['token','user']); setUser(null); }
  return <Ctx.Provider value={{user,loading,login,register,verifyOtp,resendOtp,logout}}>{children}</Ctx.Provider>;
}
