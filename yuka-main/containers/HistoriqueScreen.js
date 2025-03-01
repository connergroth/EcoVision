import React, { useEffect, useState } from "react";
import { useNavigation } from "@react-navigation/core";
import {
	StatusBar,
	ScrollView,
	Text,
	StyleSheet,
	TouchableOpacity,
	ActivityIndicator,
	Image,
	SafeAreaView,
	View,
} from "react-native";
import * as HistoriqueManager from "../components/HistoriqueManager";
import axios from "axios";
import { AntDesign } from "@expo/vector-icons";
import Product from "../components/Product";
import Constants from "expo-constants";

export default function HistoriqueScreen() {
	const navigation = useNavigation();
	const [isLoading, setIsLoading] = useState(true);
	const [products, setProducts] = useState([]);

	// Delete Item
	const deleteItem = async (code) => {
		return await HistoriqueManager.DeleteData(code);
	};

	useEffect(() => {
		const fetchData = async () => {
			try {
				const datas = await HistoriqueManager.Load();
				setProducts(
					await Promise.all(
						datas.map(async (data) => {
							const response = await axios.get(
								`https://world.openfoodfacts.org/api/v0/product/${data}.json`
							);

							return response.data.product;
						})
					)
				);
				setIsLoading(false);
			} catch (error) {
				console.log(error);
			}
		};

		fetchData();
	});

	return isLoading ? (
		<SafeAreaView style={styles.loadingPage}>
			<Image style={styles.loading} source={require("../assets/loading.png")} />
			<ActivityIndicator size="large" color="grey" />
		</SafeAreaView>
	) : (
		<SafeAreaView style={styles.bgc}>
			<ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
				<StatusBar barStyle="dark-content" />
				<Text style={styles.title}>Historique</Text>
				{products.map((product, index) => {
					return (
						<View key={index}>
							<TouchableOpacity
								data={product}
								onPress={() => {
									deleteItem(product.code);
								}}
							>
								<AntDesign style={styles.close} name="close" size={18} color="black" />
							</TouchableOpacity>

							<TouchableOpacity
								onPress={() => {
									navigation.navigate("ProductScreen", product);
								}}
							>
								<Product product={product} />
							</TouchableOpacity>
							<View style={styles.line}></View>
						</View>
					);
				})}
			</ScrollView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	loading: {
		height: 200,
		width: 200,
		resizeMode: "contain",
	},
	loadingPage: {
		justifyContent: "center",
		alignItems: "center",
		height: "100%",
		backgroundColor: "#209952",
		height: "100%",
	},
	scrollView: {
		marginTop: Platform.OS === "android" ? Constants.statusBarHeight : 0,
	},
	bgc: {
		backgroundColor: "white",
	},
	line: {
		height: 10,
		width: "90%",
		marginLeft: "10%",
		borderColor: "#F1F1F2",
		borderBottomWidth: 1,
	},
	close: {
		marginLeft: 10,
	},
	title: {
		fontWeight: "bold",
		fontSize: 40,
		marginBottom: 20,
		marginTop: 20,
		marginLeft: 10,
	},
});
