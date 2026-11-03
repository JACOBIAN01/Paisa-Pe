import { StyleSheet, View } from 'react-native';
import { useTheme } from '../theme';

export function Divider() {
  const { colors } = useTheme();
  return <View style={[styles.line, { backgroundColor: colors.border }]} />;
}

const styles = StyleSheet.create({
  line: { height: StyleSheet.hairlineWidth, alignSelf: 'stretch' },
});
