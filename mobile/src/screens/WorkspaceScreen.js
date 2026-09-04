import React,{useCallback,useState} from 'react';
import { Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../api/client';
import { Card, Screen, Title, Muted } from '../components/UI';
export default function WorkspaceScreen(){const [s,setS]=useState(null);useFocusEffect(useCallback(()=>{api.get('/workspace/stats').then(r=>setS(r.data)).catch(()=>{})},[]));return <Screen><Title>Workspace</Title><Muted>Cloud-synced learning library.</Muted><View style={{height:16}}/><Card><Text style={{fontSize:18,fontWeight:'800'}}>Plan: {s?.plan||'—'}</Text><Text style={{marginTop:12}}>Scans: {s?.scans||0}</Text><Text>Favorites: {s?.favorites||0}</Text><Text>Detected questions: {s?.questions||0}</Text><Text>AI actions: {s?.usage?.aiActions||0}</Text></Card></Screen>}
