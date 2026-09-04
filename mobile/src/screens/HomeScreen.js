import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Card, Screen, Title, Muted } from '../components/UI';
import { C } from '../theme';
export default function HomeScreen({navigation}){const actions=[['Camera / Gallery','Scan equations, notes and handwriting'],['PDF / Document','Parse question papers and documents']];return <Screen><Title>MathLens AI</Title><Muted>Precision OCR for text + mathematics.</Muted><View style={{height:20}}/>{actions.map((x,i)=><Pressable key={x[0]} onPress={()=>navigation.navigate('Scan')}><Card style={{marginBottom:14}}><Text style={s.h}>{x[0]}</Text><Muted>{x[1]}</Muted></Card></Pressable>)}<Card style={{backgroundColor:C.soft}}><Text style={s.h}>AI Study Tools</Text><Muted>After a scan, solve, explain, simplify, check an answer, or generate similar practice.</Muted></Card></Screen>}; const s=StyleSheet.create({h:{fontWeight:'800',fontSize:18,color:C.ink,marginBottom:6}});
