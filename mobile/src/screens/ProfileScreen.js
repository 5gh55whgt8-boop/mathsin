import React from 'react';
import { Text } from 'react-native';
import { Button, Card, Screen, Title, Muted } from '../components/UI';
import { useAuth } from '../context/AuthContext';
export default function ProfileScreen(){const {user,logout}=useAuth();return <Screen><Title>Profile</Title><Card style={{marginTop:18}}><Text style={{fontWeight:'800',fontSize:18}}>{user?.name}</Text><Muted>{user?.email}</Muted><Muted>{user?.role} · {user?.plan}</Muted></Card><Button title="Sign out" kind="ghost" onPress={logout}/></Screen>}
