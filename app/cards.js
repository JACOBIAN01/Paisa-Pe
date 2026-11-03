import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Screen, Card } from '../src/components/UI';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { useFeatures } from '../src/context/FeatureContext';

export default function CardsScreen() {
  const { cards, toggleCard } = useFeatures();

  return (
    <Screen>
      <ScreenHeader title="My cards" subtitle="Manage your virtual cards" />
      <ScrollView contentContainerStyle={styles.content}>
        {cards.map(card => (
          <Card key={card.id} style={styles.card}>
            <View style={styles.top}>
              <Text style={styles.name}>{card.name}</Text>
              <Text style={[styles.status, { color: card.frozen ? '#A86412' : '#16834B' }]}>
                {card.frozen ? 'Frozen' : 'Active'}
              </Text>
            </View>

            <View style={styles.visual}>
              <Text style={styles.brand}>PAISA-PE</Text>
              <Text style={styles.number}>{card.number}</Text>
              <View style={styles.cardBottom}>
                <Text style={styles.holder}>{card.holder}</Text>
                <Text style={styles.holder}>{card.expiry}</Text>
              </View>
            </View>

            <Text style={styles.detail}>Card type: {card.type}</Text>
            <Text style={styles.detail}>Monthly limit: ₹{card.limit.toLocaleString('en-IN')}</Text>
            <Text style={styles.detail}>Spent: ₹{card.spent.toLocaleString('en-IN')}</Text>

            <View style={styles.switchRow}>
              <View style={styles.switchCopy}>
                <Text style={styles.switchTitle}>Freeze card</Text>
                <Text style={styles.detail}>Temporarily pause card payments</Text>
              </View>
              <Switch value={!card.frozen} onValueChange={() => toggleCard(card.id)} />
            </View>
          </Card>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingTop: 4, gap: 16 },
  card: { padding: 16, gap: 10 },
  top: { flexDirection: 'row', justifyContent: 'space-between' },
  name: { fontSize: 15, fontWeight: '800', color: '#303047' },
  status: { fontSize: 11, fontWeight: '800' },
  visual: {
    backgroundColor: '#5556D9',
    borderRadius: 17,
    padding: 18,
    minHeight: 140,
    justifyContent: 'space-between'
  },
  brand: { color: '#DADAFB', fontSize: 10, letterSpacing: 2, fontWeight: '800' },
  number: { color: '#FFFFFF', fontSize: 21, letterSpacing: 2, fontWeight: '700' },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between' },
  holder: { color: '#E4E4FF', fontSize: 10 },
  detail: { color: '#77778C', fontSize: 12 },
  switchRow: { flexDirection: 'row', alignItems: 'center', paddingTop: 7 },
  switchCopy: { flex: 1 },
  switchTitle: { color: '#303047', fontWeight: '800', fontSize: 13 }
});