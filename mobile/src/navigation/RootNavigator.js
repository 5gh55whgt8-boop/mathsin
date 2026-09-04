import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../context/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import HomeScreen from '../screens/HomeScreen';
import ScanScreen from '../screens/ScanScreen';
import HistoryScreen from '../screens/HistoryScreen';
import WorkspaceScreen from '../screens/WorkspaceScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ResultScreen from '../screens/ResultScreen';

const Stack=createNativeStackNavigator(), Tabs=createBottomTabNavigator();
function MainTabs(){return <Tabs.Navigator screenOptions={{headerShown:false}}><Tabs.Screen name="Home" component={HomeScreen}/><Tabs.Screen name="Scan" component={ScanScreen}/><Tabs.Screen name="History" component={HistoryScreen}/><Tabs.Screen name="Workspace" component={WorkspaceScreen}/><Tabs.Screen name="Profile" component={ProfileScreen}/></Tabs.Navigator>}
export default function RootNavigator(){const {user,loading}=useAuth(); if(loading)return <View style={{flex:1,justifyContent:'center'}}><ActivityIndicator/></View>; return <Stack.Navigator>{!user?<><Stack.Screen name="Login" component={LoginScreen}/><Stack.Screen name="Register" component={RegisterScreen}/></>:<><Stack.Screen name="Main" component={MainTabs} options={{headerShown:false}}/><Stack.Screen name="Result" component={ResultScreen}/></>}</Stack.Navigator>}
