import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../api/client';
const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);
export function AuthProvider({ children }) {
  const [user,setUser]=useState(null), [loading,setLoading]=useState(true);
  useEffect(()=>{(async()=>{ try { const t=await AsyncStorage.getItem('token'); if(t){ const {data}=await api.get('/auth/me'); setUser(data.user); } } catch {} finally {setLoading(false);} })()},[]);
  async function login(email,password){ const {data}=await api.post('/auth/login',{email,password}); await AsyncStorage.setItem('token',data.token); setUser(data.user); }
  async function register(name,email,password){ const {data}=await api.post('/auth/register',{name,email,password}); return data; }
  async function verifyOtp(email,code){ const {data}=await api.post('/auth/otp/verify',{email,code}); await AsyncStorage.setItem('token',data.token); setUser(data.user); }
  async function resendOtp(email){ const {data}=await api.post('/auth/otp/resend',{email}); return data; }
  async function logout(){ await AsyncStorage.removeItem('token'); setUser(null); }
  return <Ctx.Provider value={{user,loading,login,register,verifyOtp,resendOtp,logout}}>{children}</Ctx.Provider>;
}
