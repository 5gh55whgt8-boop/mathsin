import React,{useState} from 'react';
import {Alert,Image,Platform,ScrollView,Text} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { api } from '../api/client';
import {Button,Card,Muted,Screen,Title} from '../components/UI';

export default function ScanScreen({navigation}){
  const [asset,setAsset]=useState(null);
  const [busy,setBusy]=useState(false);

  async function image(camera=false){
    let r;
    if(camera){
      await ImagePicker.requestCameraPermissionsAsync();
      r=await ImagePicker.launchCameraAsync({quality:.9});
    }else{
      r=await ImagePicker.launchImageLibraryAsync({quality:1});
    }
    if(!r.canceled)setAsset({...r.assets[0],kind:'image'});
  }

  async function doc(){
    const r=await DocumentPicker.getDocumentAsync({
      type:[
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain'
      ],
      copyToCacheDirectory:true
    });
    if(!r.canceled)setAsset({...r.assets[0],kind:'document'});
  }

  async function appendWebFile(formData,selected){
    if(selected.file instanceof File){
      formData.append('file',selected.file,selected.file.name || selected.name || 'scan');
      return;
    }

    const response=await fetch(selected.uri);
    const blob=await response.blob();
    const fileName=selected.fileName||selected.name||(selected.kind==='image'?'scan.jpg':'scan');
    const mimeType=selected.mimeType||blob.type||(selected.kind==='image'?'image/jpeg':'application/octet-stream');
    const file=new File([blob],fileName,{type:mimeType});
    formData.append('file',file,fileName);
  }

  async function upload(){
    if(!asset)return;
    try{
      setBusy(true);
      const f=new FormData();

      if(Platform.OS==='web'){
        await appendWebFile(f,asset);
      }else{
        f.append('file',{
          uri:asset.uri,
          name:asset.fileName||asset.name||(asset.kind==='image'?'scan.jpg':'scan'),
          type:asset.mimeType||(asset.kind==='image'?'image/jpeg':'application/octet-stream')
        });
      }

      const {data}=await api.post(
        asset.kind==='image'?'/scans/image':'/scans/document',
        f
      );
      navigation.navigate('Result',{scan:data.scan});
    }catch(e){
      console.error('SCAN ERROR',e.response?.data||e.message);
      Alert.alert('Scan failed',e.response?.data?.error||e.message);
    }finally{
      setBusy(false);
    }
  }

  return <Screen><ScrollView><Title>New Scan</Title><Muted>Choose camera, gallery, PDF, DOCX or TXT.</Muted><Button title="Take photo" onPress={()=>image(true)}/><Button title="Choose image" kind="ghost" onPress={()=>image(false)}/><Button title="Choose document" kind="ghost" onPress={doc}/>{asset&&<Card style={{marginTop:18}}>{asset.kind==='image'&&<Image source={{uri:asset.uri}} style={{height:220,borderRadius:12}} resizeMode="contain"/>}<Text style={{marginTop:10,fontWeight:'700'}}>{asset.fileName||asset.name||'Selected image'}</Text><Button title="Recognize with AI" loading={busy} onPress={upload}/></Card>}</ScrollView></Screen>;
}
