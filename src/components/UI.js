import { Pressable,SafeAreaView,StyleSheet,Text,View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
export function Screen({children}){return <SafeAreaView style={styles.screen}>{children}</SafeAreaView>;}
export function Card({children,style}){return <View style={[styles.card,style]}>{children}</View>;}
export function SectionTitle({title,action,href}){return <View style={styles.sectionRow}><Text style={styles.sectionTitle}>{title}</Text>{href?<Text onPress={()=>router.push(href)} style={styles.action}>{action}</Text>:null}</View>;}
export function FieldLabel({children}){return <Text style={styles.label}>{children}</Text>;}
export function PrimaryButton({label,onPress,disabled=false}){
 return <Pressable onPress={onPress} disabled={disabled} style={({pressed})=>[styles.button,pressed&&styles.pressed,disabled&&styles.disabled]}><Text style={styles.buttonText}>{label}</Text></Pressable>;
}
export function BackHeader({title}){
 return <View style={styles.backHeader}><Pressable onPress={()=>router.back()} style={styles.back}><Ionicons name="arrow-back" size={22} color="#303047"/></Pressable><Text style={styles.backTitle}>{title}</Text></View>;
}
const styles=StyleSheet.create({screen:{flex:1,backgroundColor:'#F8F8FC'},card:{backgroundColor:'#FFFFFF',borderRadius:18,borderWidth:1,borderColor:'#EEEEF4',padding:14},sectionRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},sectionTitle:{fontSize:18,fontWeight:'800',color:'#222238'},action:{fontSize:13,color:'#5B5CE2',fontWeight:'700'},label:{fontSize:13,fontWeight:'700',color:'#55556B'},button:{backgroundColor:'#5B5CE2',height:54,borderRadius:16,alignItems:'center',justifyContent:'center'},buttonText:{color:'#FFFFFF',fontSize:15,fontWeight:'800'},pressed:{opacity:0.8},disabled:{opacity:0.45},backHeader:{height:64,flexDirection:'row',alignItems:'center',paddingHorizontal:20,gap:16},back:{width:40,height:40,borderRadius:14,backgroundColor:'#EEEEF7',alignItems:'center',justifyContent:'center'},backTitle:{fontSize:19,fontWeight:'800',color:'#222238'}});
