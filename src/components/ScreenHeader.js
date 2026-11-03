import { Pressable,StyleSheet,Text,View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
export function ScreenHeader({title,subtitle,showBack=true,right}) {
 return <View style={s.container}>{showBack?<Pressable onPress={()=>router.back()} style={s.back}><Ionicons name="arrow-back" size={21} color="#303047"/></Pressable>:null}<View style={s.copy}><Text style={s.title}>{title}</Text>{subtitle?<Text style={s.subtitle}>{subtitle}</Text>:null}</View>{right||null}</View>;
}
const s=StyleSheet.create({container:{flexDirection:'row',alignItems:'center',paddingHorizontal:20,paddingTop:18,paddingBottom:16,gap:12},back:{width:40,height:40,borderRadius:14,backgroundColor:'#EEEEF7',alignItems:'center',justifyContent:'center'},copy:{flex:1},title:{fontSize:23,fontWeight:'800',color:'#222238'},subtitle:{fontSize:12,color:'#85869A',marginTop:4}});