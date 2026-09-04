import React,{useState} from 'react';
import { Alert, Platform, ScrollView, Share, Text, TextInput, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { api } from '../api/client';
import { Button, Card, Screen, Title, Muted } from '../components/UI';
import { C } from '../theme';

function cleanName(s='scan'){return String(s).replace(/[^a-z0-9._-]+/gi,'_').slice(0,80)||'scan'}

export default function ResultScreen({route}){
  const [scan,setScan]=useState(route.params.scan),[tab,setTab]=useState('markdown'),[ai,setAi]=useState(''),[busy,setBusy]=useState(false),[exporting,setExporting]=useState('');
  const tabs=['markdown','latex','plainText'];
  async function act(action){try{setBusy(true);const {data}=await api.post('/ai/action',{action,content:scan.markdown||scan.plainText});setAi(data.text)}catch(e){Alert.alert('AI error',e.response?.data?.error||e.message)}finally{setBusy(false)}}
  async function save(v){setScan(x=>({...x,[tab]:v}));try{await api.patch(`/scans/${scan._id}`,{[tab]:v})}catch{}}
  async function exportFile(format){
    try{
      setExporting(format);
      const ext=format==='docx'?'docx':'pdf';
      const name=`${cleanName(scan.title)}.${ext}`;
      if(Platform.OS==='web'){
        const {data}=await api.get(`/exports/${scan._id}/${format}`,{responseType:'blob'});
        const url=URL.createObjectURL(data);
        const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
      }else{
        const token=await AsyncStorage.getItem('token');
        const base=(process.env.EXPO_PUBLIC_API_URL||'http://127.0.0.1:5000/api').replace(/\/$/,'');
        const dest=FileSystem.cacheDirectory+name;
        const out=await FileSystem.downloadAsync(`${base}/exports/${scan._id}/${format}`,dest,{headers:token?{Authorization:`Bearer ${token}`}:{}});
        if(await Sharing.isAvailableAsync()) await Sharing.shareAsync(out.uri,{mimeType:format==='docx'?'application/vnd.openxmlformats-officedocument.wordprocessingml.document':'application/pdf',dialogTitle:`Export ${name}`});
        else Alert.alert('Export ready',out.uri);
      }
    }catch(e){Alert.alert('Export failed',e.response?.data?.error||e.message)}finally{setExporting('')}
  }
  return <Screen><ScrollView><Title>{scan.title}</Title>{scan.warnings?.length>0&&<Muted>{scan.warnings.join(' · ')}</Muted>}
    <View style={{flexDirection:'row',gap:8,marginVertical:14}}>{tabs.map(t=><Text key={t} onPress={()=>setTab(t)} style={{padding:10,borderRadius:10,backgroundColor:tab===t?C.soft:'#fff'}}>{t}</Text>)}</View>
    <View style={{flexDirection:'row',gap:8}}><Button title="Copy" kind="ghost" onPress={()=>Clipboard.setStringAsync(scan[tab]||'')}/><Button title="Share" kind="ghost" onPress={()=>Share.share({message:scan[tab]||''})}/></View>
    <Card><TextInput multiline value={scan[tab]||''} onChangeText={save} style={{minHeight:220,textAlignVertical:'top',color:C.ink}}/></Card>
    <Text style={{fontWeight:'800',fontSize:18,marginTop:20}}>Export AI scan</Text>
    <Muted>Only AI-extracted text and equations will be exported. The original photo is not included.</Muted>
    <View style={{flexDirection:'row',flexWrap:'wrap',gap:8,marginTop:8}}><Button title="Export PDF" kind="ghost" loading={exporting==='pdf'} onPress={()=>exportFile('pdf')}/><Button title="Export Word" kind="ghost" loading={exporting==='docx'} onPress={()=>exportFile('docx')}/></View>
    <Text style={{fontWeight:'800',fontSize:18,marginTop:20}}>AI tools</Text><View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{['solve','explain','simplify','similar'].map(a=><Button key={a} title={a} kind="ghost" loading={busy} onPress={()=>act(a)}/>)}</View>{ai?<Card style={{marginTop:14}}><Text style={{lineHeight:22}}>{ai}</Text></Card>:null}
  </ScrollView></Screen>
}
