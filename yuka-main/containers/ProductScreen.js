import React from "react";
import { useNavigation } from "@react-navigation/core";
import {
  SafeAreaView,
  TouchableOpacity,
  StyleSheet,
  Text,
  ScrollView,
} from "react-native";
import { AntDesign } from "@expo/vector-icons";
import ProductHeader from "../components/ProductHeader";
import ProductComplete from "../components/ProductComplete";

export default function ProductScreen(data) {
  const navigation = useNavigation();

  const product = data.route.params;

  return (
    <SafeAreaView style={styles.scroll}>
      <TouchableOpacity
        style={styles.goBack}
        onPress={() => {
          navigation.goBack();
        }}
      >
        <AntDesign name="left" size={20} color="#007AFE" />
        <Text style={styles.goBackPage}>Historique</Text>
      </TouchableOpacity>
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
      >
        <ProductHeader product={product} />
        <ProductComplete product={product} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    marginTop: Platform.OS === "android" ? Constants.statusBarHeight : 0,
  },
  goBack: {
    flexDirection: "row",
    alignItems: "center",
  },
  scroll: {
    flex: 1,
  },
  goBackPage: {
    color: "#007AFE",
    fontSize: 20,
  },
});
