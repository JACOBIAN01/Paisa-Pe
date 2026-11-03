import { useState } from 'react';
import { Switch,StyleSheet,Text,View } from 'react-native';
import { Screen,BackHeader,Card } from '../src/components/UI';
export default function SettingsScreen(){
 const [biometrics,setBiometrics]=useState(false),[notifications,setNotifications]=useState(true);
 return <Screen><BackHeader title="App settings"/><View style={styles.content}><Card style={styles.card}>
  <View style={styles.row}><Text style={styles.label}>Biometric login</Text><Switch value={biometrics} onValueChange={setBiometrics}/></View>
  <View style={styles.row}><Text style={styles.label}>Notifications</Text><Switch value={notifications} onValueChange={setNotifications}/></View>
 </Card></View></Screen>;
}
const styles=StyleSheet.create({content:{padding:20},card:{padding:20,gap:20},row:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},label:{fontSize:15,color:'#303047',fontWeight:'600'}});
