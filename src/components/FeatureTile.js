import { Pressable,StyleSheet,Text,View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
export function FeatureTile({title,description,icon,color='#5B5CE2',onPress}) {
 return <Pressable onPress={onPress} style={({pressed})=>[s.tile,pressed&&s.pressed]}><View style={[s.icon,{backgroundColor:color+'18'}]}><Ionicons name={icon} size={23} color={color}/></View><Text style={s.title}>{title}</Text><Text style={s.description}>{description}</Text></Pressable>;
}
const s=StyleSheet.create({tile:{flex:1,minHeight:132,backgroundColor:'#FFFFFF',borderRadius:18,borderWidth:1,borderColor:'#EEEEF4',padding:14,gap:7},icon:{width:42,height:42,borderRadius:14,alignItems:'center',justifyContent:'center'},title:{fontSize:14,fontWeight:'800',color:'#303047'},description:{fontSize:11,color:'#85869A',lineHeight:16},pressed:{opacity:0.78}});