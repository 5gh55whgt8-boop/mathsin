import React, { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { AppText, AuthScreen, Brand, Button, Card, Input, Muted } from '../components/UI';
import { useAuth } from '../context/AuthContext';
import { spacing, shadows } from '../theme';

export default function VerifyOtpScreen({ route }) {
  const email = route.params?.email || '';
  const { verifyOtp, resendOtp } = useAuth();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  async function verify() { try { setBusy(true); await verifyOtp(email, code); } catch (error) { Alert.alert('Could not verify code', error.response?.data?.error || error.message); } finally { setBusy(false); } }
  async function resend() { try { setResending(true); await resendOtp(email); Alert.alert('New code sent', `Check ${email} for the new 6-digit code.`); } catch (error) { Alert.alert('Could not resend code', error.response?.data?.error || error.message); } finally { setResending(false); } }
  return <AuthScreen><Brand /><View style={styles.heading}><AppText variant="title">Verify your email</AppText><Muted>We sent a 6-digit code to {email}.</Muted></View><Card style={styles.card}><Input label="Verification code" icon="keypad-outline" placeholder="123456" keyboardType="number-pad" maxLength={6} value={code} onChangeText={value => setCode(value.replace(/[^0-9]/g, ''))} onSubmitEditing={verify} returnKeyType="go"/><Button title="Verify and continue" icon="shield-checkmark-outline" loading={busy} disabled={code.length !== 6} onPress={verify}/><Button title="Resend code" variant="ghost" loading={resending} onPress={resend}/></Card></AuthScreen>;
}
const styles = StyleSheet.create({ heading: { gap: spacing.xs }, card: { gap: spacing.md, boxShadow: shadows.raised } });
