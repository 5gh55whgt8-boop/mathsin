import React,{useCallback,useState} from 'react';
import { FlatList, Pressable, Text } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../api/client';
import { Card, Screen, Title, Muted } from '../components/UI';
export default function HistoryScreen({navigation}){const [items,setItems]=useState([]);const load=()=>api.get('/scans').then(r=>setItems(r.data.items)).catch(()=>{});useFocusEffect(useCallback(()=>{load()},[]));return <Screen><Title>History</Title><FlatList style={{marginTop:16}} data={items} keyExtractor={x=>x._id} ListEmptyComponent={<Muted>No scans yet.</Muted>} renderItem={({item})=><Pressable onPress={()=>navigation.navigate('Result',{scan:item})}><Card style={{marginBottom:12}}><Text style={{fontWeight:'800'}}>{item.title}</Text><Muted>{new Date(item.createdAt).toLocaleString()}</Muted></Card></Pressable>}/></Screen>}
