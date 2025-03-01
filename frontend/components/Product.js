import React from "react";
import { Text, View, StyleSheet, Image } from "react-native";
import { AntDesign } from "@expo/vector-icons";

const Product = ({ product }) => {
	return (
		<View>
			<View style={styles.productInformations}>
				{product.image_front_small_url === undefined ? (
					<Text>undefined</Text>
				) : (
					<Image
						style={styles.productPicture}
						source={{
							uri: product.image_front_small_url,
						}}
					/>
				)}

				<View style={styles.productDescription}>
					<Text style={styles.productTitle}>{product.product_name}</Text>
					<Text style={styles.margin}>{product.brands}</Text>
					{product.ecoscore_data.score === undefined ? (
						<Text></Text>
					) : (
						<Text style={styles.margin}>{product.ecoscore_data.score} / 100</Text>
					)}
					<View style={styles.note}>
						<View
							style={
								product.ecoscore_data.score >= 75
									? styles.roundGreen
									: product.ecoscore_data.score < 75 && product.ecoscore_data.score >= 30
									? styles.roundOrange
									: product.ecoscore_data.score < 30
									? styles.roundRed
									: styles.roundGrey
							}
						></View>
						{product.ecoscore_data.score >= 75 ? (
							<Text>Excellent</Text>
						) : product.ecoscore_data.score < 75 &&
						  product.ecoscore_data.score >= 30 ? (
							<Text>Médiocre</Text>
						) : product.ecoscore_data.score < 30 ? (
							<Text>Mauvais</Text>
						) : (
							<Text>Non noté</Text>
						)}
					</View>
				</View>
				<View style={styles.right}>
					<AntDesign name="right" size={24} color="black" />
				</View>
			</View>
		</View>
	);
};

const styles = StyleSheet.create({
	productPicture: {
		height: 120,
		width: 120,
		marginTop: 5,
		resizeMode: "contain",
	},

	productInformations: {
		flexDirection: "row",
		margin: 10,
	},
	productDescription: {
		paddingLeft: 20,
		flex: 1,
		justifyContent: "center",
	},
	productTitle: {
		fontSize: 18,
		fontWeight: "bold",
		marginBottom: 5,
	},
	roundRed: {
		height: 12,
		width: 12,
		backgroundColor: "red",
		borderRadius: 50,
		marginRight: 5,
	},
	roundGreen: {
		height: 12,
		width: 12,
		backgroundColor: "green",
		borderRadius: 50,
		marginRight: 5,
	},
	roundOrange: {
		height: 12,
		width: 12,
		backgroundColor: "orange",
		borderRadius: 50,
		marginRight: 5,
	},
	roundGrey: {
		height: 12,
		width: 12,
		backgroundColor: "grey",
		borderRadius: 50,
		marginRight: 5,
	},
	note: {
		flexDirection: "row",
		alignItems: "center",
	},

	right: {
		justifyContent: "center",
	},
	margin: {
		marginBottom: 5,
	},
});

export default Product;
