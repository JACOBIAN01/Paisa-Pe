import {StyleSheet,Text,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
export function InfoRow({label,value,icon}){return <View style={s.row}>{icon?<Ionicons name={icon} size={18} color="#7777A0"/>:null}<Text style={s.label}>{label}</Text><Text style={s.value}>{value}</Text></View>;}
const s=StyleSheet.create({row:{minHeight:46,flexDirection:'row',alignItems:'center',gap:10,borderBottomWidth:1,borderBottomColor:'#F0F0F4'},label:{flex:1,color:'#77778C',fontSize:13},value:{fontSize:13,fontWeight:'700',color:'#303047'}});