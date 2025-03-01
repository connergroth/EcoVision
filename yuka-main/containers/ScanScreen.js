import React, { useState, useEffect } from "react";
import {
	AntDesign,
	MaterialCommunityIcons,
	FontAwesome5,
} from "@expo/vector-icons";

import {
	Text,
	StatusBar,
	View,
	TouchableOpacity,
	StyleSheet,
	ActivityIndicator,
	ScrollView,
} from "react-native";
import { BottomSheet } from "react-native-btr";
import axios from "axios";
import * as HistoriqueManager from "../components/HistoriqueManager";
import { Camera } from "expo-camera";
import ProductHeader from "../components/ProductHeader";
import { useIsFocused } from "@react-navigation/native";
import ProductComplete from "../components/ProductComplete";

export default function App() {
	const [hasPermission, setHasPermission] = useState(null);
	const [scanned, setScanned] = useState(false);
	const [visible, setVisible] = useState(false);
	const [product, setProduct] = useState();
	const [isLoading, setIsLoading] = useState(false);
	const [errorMessages, setErrorMessages] = useState(true);
	const [minus, setMinus] = useState(false);
	const [torch, setTorch] = useState(false);
	const [torchMode, setTorchMode] = useState();

	useEffect(() => {
		(async () => {
			const { status } = await Camera.requestPermissionsAsync();
			setHasPermission(status === "granted");
		})();
	}, []);

	const handleBarCodeScanned = ({ type, data }) => {
		setScanned(true);
		setVisible(!visible);
		setIsLoading(true);

		const fetchData = async () => {
			try {
				const response = await axios.get(
					`https://world.openfoodfacts.org/api/v0/product/${data}.json`
				);

				if (response.data.status === 0) {
					throw response.data.status_verbose;
				}

				setProduct(response.data.product);
				setIsLoading(false);
				setErrorMessages(false);
				await HistoriqueManager.AddData(data);
			} catch (error) {
				console.log(error);
				setIsLoading(false);
				setErrorMessages(true);
			}
		};

		fetchData();
	};

	const TorchMode = () => {
		setTorch(!torch);

		if (torch) {
			setTorchMode("off");
		} else {
			setTorchMode("torch");
		}
	};

	const closeBottomNavigationView = () => {
		setVisible(false);
		setScanned(false);
		setTorch(false);
	};

	function FocusAwareStatusBar(props) {
		const isFocused = useIsFocused();

		return isFocused ? <StatusBar {...props} /> : null;
	}

	if (hasPermission === null) {
		return <Text>Requesting for camera permission</Text>;
	}
	if (hasPermission === false) {
		return <Text>No access to camera</Text>;
	}

	return isLoading ? (
		<ActivityIndicator size="large" color="grey" />
	) : (
		<View>
			<FocusAwareStatusBar barStyle="light-content" backgroundColor="#6a51ae" />
			<View style={styles.container}>
				<Camera
					onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
					flashMode={torchMode}
					style={StyleSheet.absoluteFillObject}
				/>
				<TouchableOpacity
					style={torch ? styles.torchOff : styles.torchOn}
					onPress={TorchMode}
				>
					<MaterialCommunityIcons
						name="flashlight"
						size={24}
						color={torch ? "black" : "white"}
					/>
				</TouchableOpacity>
			</View>

			<View style={styles.containers}>
				<View style={styles.containers}>
					<BottomSheet visible={visible} enabledInnerScrolling={true}>
						<TouchableOpacity
							style={styles.minus}
							onPress={() => {
								setMinus(!minus);
							}}
						>
							<FontAwesome5 name="minus" size={30} color="#D9D9D9" />
						</TouchableOpacity>
						<View
							style={
								minus === true
									? styles.bottomNavigationViewTrue
									: styles.bottomNavigationViewFalse
							}
						>
							<TouchableOpacity
								style={styles.close}
								onPress={closeBottomNavigationView}
							>
								<AntDesign name="close" size={18} color="black" />
							</TouchableOpacity>

							<View
								style={{
									flex: 1,
									flexDirection: "column",
									justifyContent: "space-between",
								}}
							>
								{scanned && !errorMessages && (
									<ScrollView showsVerticalScrollIndicator={false}>
										<ProductHeader product={product} />
										<ProductComplete product={product} />
									</ScrollView>
								)}
								{errorMessages && <Text>Produit inconnu</Text>}

								<View style={{ flex: 1, flexDirection: "row" }}></View>
							</View>
						</View>
					</BottomSheet>
				</View>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		height: "100%",
		width: "100%",
	},

	bottomNavigationViewFalse: {
		backgroundColor: "white",
		width: "100%",
		height: 220,
		paddingRight: 20,
		paddingLeft: 20,
		borderTopLeftRadius: 10,
		borderTopRightRadius: 10,
	},
	bottomNavigationViewTrue: {
		backgroundColor: "white",
		width: "100%",
		height: "90%",
		paddingRight: 20,
		paddingLeft: 20,
		borderTopLeftRadius: 10,
		borderTopRightRadius: 10,
	},
	minus: {
		alignItems: "center",
	},
	close: {
		alignItems: "flex-end",
		paddingBottom: 15,
		paddingTop: 15,
	},
	torchOn: {
		marginTop: 60,
		marginLeft: 20,
		width: 34,
		padding: 5,
		backgroundColor: "rgba(60, 60, 60, 0.3)",
		borderRadius: 50,
	},
	torchOff: {
		marginTop: 60,
		marginLeft: 20,
		width: 34,
		padding: 5,
		backgroundColor: "white",
		borderRadius: 50,
	},
});
