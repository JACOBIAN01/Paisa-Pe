import { StyleSheet,View } from 'react-native';
export function ProgressBar({value,total,color='#5B5CE2',height=8}) {
 const percent=total>0?Math.min(100,Math.max(0,value/total*100)):0;
 return <View style={[s.track,{height}]}><View style={[s.fill,{width:percent+'%',backgroundColor:color}]}/></View>;
}
const s=StyleSheet.create({track:{width:'100%',backgroundColor:'#EEEEF4',borderRadius:20,overflow:'hidden'},fill:{height:'100%',borderRadius:20}});