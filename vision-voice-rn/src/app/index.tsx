import { StatusBar } from "expo-status-bar";
import { Platform, Text, View } from 'react-native';

export default function Home() {
  return (
    <>
      <StatusBar style={Platform.OS === 'ios' ? 'light' : 'inverted'} backgroundColor='transparent' translucent animated />
      <View>
        <Text>Home</Text>
      </View>
    </>
  );
}