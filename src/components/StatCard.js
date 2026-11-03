import {StyleSheet,Text,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
export function StatCard({label,value,icon}){return <View style={s.card}><Ionicons name={icon} size={20} color="#5B5CE2"/><Text style={s.value}>{value}</Text><Text style={s.label}>{label}</Text></View>;}
const s=StyleSheet.create({card:{flex:1,padding:14,backgroundColor:'#FFFFFF',borderRadius:16,borderWidth:1,borderColor:'#EEEEF4',gap:7},value:{fontSize:18,fontWeight:'800',color:'#222238'},label:{fontSize:11,color:'#85869A'}});