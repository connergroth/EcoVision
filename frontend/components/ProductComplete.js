import React from "react";
import { Text, View, TouchableOpacity, StyleSheet } from "react-native";
import * as FavoriteManager from "../components/FavoriteManager";
import { FontAwesome5 } from "@expo/vector-icons";
import { Ionicons } from "@expo/vector-icons";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { AntDesign } from "@expo/vector-icons";

const ProductComplete = ({ product }) => {
	const AddFavorite = async () => {
		const code = product.code;
		await FavoriteManager.AddDataFavorite(code);
	};

	const cal = product.nutriments["energy-kcal_100g"];
	const prot = product.nutriments["proteins"].toFixed(1);
	const graisse = product.nutriments["saturated-fat"].toFixed(1);
	const sucre = product.nutriments["sugars"].toFixed(1);
	const sel = product.nutriments["salt_100g"].toFixed(1);
	const additifs = product.additives_n;

	return (
		<View style={styles.container}>
			{cal === undefined ? (
				<Text>Aucune information sur ce produit</Text>
			) : (
				<View>
					<View style={styles.titreAlign}>
						<Text style={styles.titre}>Qualités</Text>
						<Text>Pour 100g</Text>
					</View>
					{cal <= 360 && (
						<View style={styles.nutriments}>
							<FontAwesome5 name="seedling" size={24} color="#7C7C7C" />
							<View style={styles.separations}>
								<Text style={styles.sousTitre}>Calories</Text>
								{cal == 0 ? (
									<Text>Aucune calorie</Text>
								) : cal <= 160 ? (
									<Text>Peu calorique</Text>
								) : (
									<Text>Faible impact</Text>
								)}
							</View>

							<Text>{cal} kCal</Text>
							<View
								style={cal <= 160 ? styles.roundGreen : styles.roundLightGreen}
							></View>
						</View>
					)}

					{prot > 5 && (
						<View style={styles.nutriments}>
							<FontAwesome5 name="fish" size={24} color="#7C7C7C" />
							<View style={styles.separations}>
								<Text style={styles.sousTitre}>Protéines</Text>
								{prot > 5 && prot <= 8 ? (
									<Text>Quelques protéines</Text>
								) : (
									<Text>Excellente quantité de protéines</Text>
								)}
							</View>

							<Text>{prot}g</Text>
							<View
								style={
									prot > 5 && prot <= 8 ? styles.roundGreen : styles.roundLightGreen
								}
							></View>
						</View>
					)}

					{graisse <= 4 && (
						<View style={styles.nutriments}>
							<Ionicons name="water-outline" size={24} color="#7C7C7C" />
							<View style={styles.separations}>
								<Text style={styles.sousTitre}>Graisses Saturées</Text>
								{graisse == 0 ? (
									<Text>Pas de graisses sat.</Text>
								) : graisse <= 2 ? (
									<Text>Peu de graisses sat.</Text>
								) : (
									<Text>Faible impact</Text>
								)}
							</View>

							<Text>{graisse}g</Text>
							<View
								style={graisse <= 2 ? styles.roundGreen : styles.roundLightGreen}
							></View>
						</View>
					)}

					{sucre <= 5 && (
						<View style={styles.nutriments}>
							<Ionicons name="md-cube-outline" size={24} color="#7C7C7C" />
							<View style={styles.separations}>
								<Text style={styles.sousTitre}>Sucres</Text>
								{sucre == 0 ? (
									<Text>Pas de sucre</Text>
								) : sucre <= 3 ? (
									<Text>Peu de sucre</Text>
								) : (
									<Text>Faible impact</Text>
								)}
							</View>

							<Text>{sucre}g</Text>
							<View
								style={sucre <= 3 ? styles.roundGreen : styles.roundLightGreen}
							></View>
						</View>
					)}

					{sel <= 0.9 && (
						<View style={styles.nutriments}>
							<MaterialCommunityIcons name="food-variant" size={24} color="#7C7C7C" />
							<View style={styles.separations}>
								<Text style={styles.sousTitre}>Sel</Text>
								{sel == 0 ? (
									<Text>Pas de sel</Text>
								) : sel <= 0.5 ? (
									<Text>Peu de sel</Text>
								) : (
									<Text>Faible impact</Text>
								)}
							</View>

							<Text>{sel}g</Text>
							<View
								style={sel <= 0.5 ? styles.roundGreen : styles.roundLightGreen}
							></View>
						</View>
					)}

					<View style={styles.titreAlign}>
						<Text style={styles.titre}>Défauts</Text>
						<Text>Pour 100g</Text>
					</View>
					{cal > 360 && (
						<View style={styles.nutriments}>
							<FontAwesome5 name="seedling" size={24} color="#7C7C7C" />
							<View style={styles.separations}>
								<Text style={styles.sousTitre}>Calories</Text>
								{cal > 360 && cal <= 560 ? (
									<Text>Un peu trop calorique</Text>
								) : (
									<Text>Trop calorique</Text>
								)}
							</View>

							<Text>{cal} kCal</Text>
							<View
								style={cal > 360 && cal <= 560 ? styles.roundOrange : styles.roundRed}
							></View>
						</View>
					)}

					{graisse > 4 && (
						<View style={styles.nutriments}>
							<Ionicons name="water-outline" size={24} color="#7C7C7C" />

							<View style={styles.separations}>
								<Text style={styles.sousTitre}>Graisses Saturées</Text>
								{graisse <= 7 ? <Text>Un peu trop gras</Text> : <Text>Trop gras</Text>}
							</View>

							<Text>{graisse}g</Text>
							<View style={graisse <= 7 ? styles.roundOrange : styles.roundRed}></View>
						</View>
					)}

					{sucre > 5 && (
						<View style={styles.nutriments}>
							<Ionicons name="md-cube-outline" size={24} color="#7C7C7C" />

							<View style={styles.separations}>
								<Text style={styles.sousTitre}>Sucres</Text>
								{sucre <= 8 ? <Text>Un peu trop sucré</Text> : <Text>Trop sucré</Text>}
							</View>

							<Text>{sucre}g</Text>
							<View style={sucre <= 8 ? styles.roundOrange : styles.roundRed}></View>
						</View>
					)}

					{sel > 0.9 && (
						<View style={styles.nutriments}>
							<MaterialCommunityIcons name="food-variant" size={24} color="#7C7C7C" />
							<View style={styles.separations}>
								<Text style={styles.sousTitre}>Sel</Text>
								{sel <= 1.6 ? (
									<Text>Un peu trop de sel</Text>
								) : (
									<Text>Trop de sel</Text>
								)}
							</View>

							<Text>{sel}g</Text>
							<View style={sel <= 1.6 ? styles.roundOrange : styles.roundRed}></View>
						</View>
					)}

					{additifs !== 0 && (
						<View style={styles.nutrimentsSeparation}>
							<MaterialCommunityIcons name="molecule" size={24} color="#7C7C7C" />
							<Text style={styles.margin}>{additifs}</Text>
							<Text style={styles.sousTitre}>Additif(s)</Text>
						</View>
					)}
				</View>
			)}

			<TouchableOpacity style={styles.addFavorite} onPress={AddFavorite}>
				<View style={styles.addFavoriteFlex}>
					<Text style={styles.addFavoriteText}>Ajouter aux favoris</Text>
					<AntDesign
						style={styles.addFavoriteIcon}
						name="plus"
						size={20}
						color="black"
					/>
				</View>
			</TouchableOpacity>
		</View>
	);
};

const styles = StyleSheet.create({
	roundRed: {
		height: 12,
		width: 12,
		backgroundColor: "#D1011D",
		borderRadius: 50,
		marginRight: 5,
		marginLeft: 5,
	},
	roundGreen: {
		height: 12,
		width: 12,
		backgroundColor: "#209952",
		borderRadius: 50,
		marginRight: 5,
		marginLeft: 5,
	},
	roundOrange: {
		height: 12,
		width: 12,
		backgroundColor: "#E67F22",
		borderRadius: 50,
		marginRight: 5,
		marginLeft: 5,
	},
	roundLightGreen: {
		height: 12,
		width: 12,
		backgroundColor: "#2BD171",
		borderRadius: 50,
		marginRight: 5,
		marginLeft: 5,
	},
	note: {
		flexDirection: "row",
		alignItems: "center",
	},
	titre: {
		fontSize: 20,
		fontWeight: "bold",
	},
	titreAlign: {
		flexDirection: "row",
		alignItems: "flex-end",
		justifyContent: "space-between",
		marginTop: 15,
		marginBottom: 20,
	},
	container: {
		marginRight: 10,
		marginLeft: 10,
	},
	sousTitre: {
		fontSize: 15,
		fontWeight: "bold",
	},
	image: {
		height: 40,
		width: 40,
	},
	nutriments: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: 20,
	},
	separations: {
		flex: 1,
		marginLeft: 25,
	},
	nutrimentsSeparation: {
		flexDirection: "row",
		alignItems: "center",
		flex: 1,
	},
	margin: {
		marginLeft: 25,
		marginRight: 5,
	},
	addFavorite: {
		backgroundColor: "white",
		height: 50,
		justifyContent: "center",
		borderRadius: 10,
		marginTop: 40,
		marginBottom: 40,
	},
	addFavoriteText: {
		marginLeft: 10,
		fontSize: 15,
	},
	addFavoriteFlex: {
		flexDirection: "row",
		justifyContent: "space-between",
	},
	addFavoriteIcon: {
		marginRight: 10,
	},
});

export default ProductComplete;
