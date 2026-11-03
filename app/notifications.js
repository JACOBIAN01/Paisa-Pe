import { useEffect } from 'react';
import { StyleSheet,Text,View } from 'react-native';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { Screen,BackHeader,Card } from '../src/components/UI';
const items=[{id:'1',title:'Welcome to PaisaPe',body:'Your demo wallet is ready.'},{id:'2',title:'Payment reminder',body:'Check your recent activity.'}];
export default function NotificationsScreen(){
 useEffect(()=>{
  Notifications.addNotificationResponseReceivedListener(response=>{
   const path=response.notification.request.content.data.path;
   if(path) router.push(path);
  });
 },[]);
 return <Screen><BackHeader title="Notifications"/><View style={styles.list}>{items.map(item=><Card key={item.id} style={styles.card}>
  <Text style={styles.title}>{item.title}</Text><Text style={styles.body}>{item.body}</Text>
 </Card>)}</View></Screen>;
}
const styles=StyleSheet.create({list:{padding:20,gap:12},card:{padding:18},title:{fontWeight:'700',color:'#222238'},body:{color:'#85869A',marginTop:5}});
