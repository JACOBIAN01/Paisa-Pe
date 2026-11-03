import { useEffect } from 'react';
import { StyleSheet,Text,View } from 'react-native';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { Screen,BackHeader,Card } from '../src/components/UI';
export default function ScanScreen(){
 useEffect(()=>{
  Linking.addEventListener('url',event=>{
   const parsed=Linking.parse(event.url);
   if(parsed.path) router.push('/'+parsed.path);
  });
 },[]);
 return <Screen><BackHeader title="Scan and pay"/><View style={styles.content}><Card style={styles.box}>
  <Text style={styles.icon}>▦</Text><Text style={styles.title}>QR scanner demo</Text>
  <Text style={styles.text}>Camera scanning is not connected in this learning build. Explore Expo Camera as an extension activity.</Text>
 </Card></View></Screen>;
}
const styles=StyleSheet.create({content:{padding:20},box:{alignItems:'center',padding:30,gap:15},icon:{fontSize:80,color:'#5B5CE2'},title:{fontWeight:'800',fontSize:19,color:'#222238'},text:{textAlign:'center',color:'#85869A',lineHeight:21}});
