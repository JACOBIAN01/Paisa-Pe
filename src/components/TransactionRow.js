import { useState } from 'react';
import { Pressable,StyleSheet,Text,View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { money } from '../utils/money';
export function TransactionRow({item}){
 const [expanded,setExpanded]=useState(false);
 const credit=item.amount>0;
 return <Pressable onPress={()=>setExpanded(!expanded)}><View style={styles.row}>
  <View style={[styles.icon,credit?styles.credit:styles.debit]}><Ionicons name={credit?'arrow-down':'arrow-up'} size={19} color={credit?'#159B68':'#D65C61'}/></View>
  <View style={styles.details}><Text style={styles.title}>{item.title}</Text><Text style={styles.subtitle}>{item.subtitle}</Text></View>
  <Text style={[styles.amount,credit?styles.positive:styles.negative]}>{credit?'+':'-'}{money(item.amount)}</Text>
 </View>{expanded?<Text style={styles.extra}>Transaction ID: {item.id}</Text>:null}</Pressable>;
}
const styles=StyleSheet.create({row:{flexDirection:'row',alignItems:'center',paddingVertical:13,borderBottomWidth:1,borderBottomColor:'#F0F0F4',gap:12},icon:{width:42,height:42,borderRadius:14,alignItems:'center',justifyContent:'center'},credit:{backgroundColor:'#E7F8F0'},debit:{backgroundColor:'#FFF0F0'},details:{flex:1},title:{fontWeight:'700',fontSize:14,color:'#303047'},subtitle:{fontSize:11,color:'#9999A9',marginTop:4},amount:{fontWeight:'800',fontSize:13},positive:{color:'#159B68'},negative:{color:'#D65C61'},extra:{fontSize:11,color:'#85869A',paddingBottom:10,paddingLeft:54}});
