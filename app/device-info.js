import { useEffect,useState } from 'react';
import { StyleSheet,Text,View } from 'react-native';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Screen,BackHeader,Card } from '../src/components/UI';
export default function DeviceInfoScreen(){
 const [deviceType,setDeviceType]=useState('Loading...');
 const info={brand:Device.brand||'Unknown',model:Device.modelName||'Unknown',os:Device.osName||'Unknown',version:Device.osVersion||'Unknown',app:Constants.expoConfig?.version||'Unknown'};
 useEffect(()=>{Device.getDeviceTypeAsync().then(type=>setDeviceType(String(type)));},[]);
 return <Screen><BackHeader title="Device information"/><View style={styles.content}><Card style={styles.card}>
  {Object.entries({...info,type:deviceType}).map(([key,value])=><View style={styles.row} key={key}><Text style={styles.label}>{key.toUpperCase()}</Text><Text style={styles.value}>{value}</Text></View>)}
 </Card></View></Screen>;
}
const styles=StyleSheet.create({content:{padding:20},card:{padding:18,gap:18},row:{flexDirection:'row',justifyContent:'space-between'},label:{color:'#85869A',fontSize:11,fontWeight:'700'},value:{color:'#303047',fontWeight:'600'}});
