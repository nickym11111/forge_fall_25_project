import { StyleSheet } from 'react-native';
import CreateFridge from '../createFridge/create-fridge';
import { View } from '@/components/Themed';

/*export default function TabTwoScreen() {
  return (
    <View style={styles.container}>
      <CreateFridge />
    </View>
  );
}
  */

const styles = StyleSheet.create({
  box: {
    width: 50,
    height: 50,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  filter_button: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 4,
    backgroundColor: '#4caf50',
    alignSelf: 'flex-start',
    marginHorizontal: '1%',
    marginBottom: 6,
    minWidth: '48%',
    textAlign: 'center',
  },
  selected_filter_button: {
    backgroundColor: 'grey',
    borderWidth: 0,
  },
  buttonLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: 'white',
  },
  selectedLabel: {
    color: 'white',
  },
  label: {
    textAlign: 'center',
    marginBottom: 10,
    fontSize: 24,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white', // optional, ensures white background
  },
});
