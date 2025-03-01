import AsyncStorage from "@react-native-async-storage/async-storage";

const key = "favorite";

const LoadFavorite = async () => {
  const datas = await AsyncStorage.getItem(key);
  // Lecture de la valeur en JSON
  return datas === null ? [] : JSON.parse(datas);
};

const SaveFavorite = async (datas) => {
  // Stockage de la valeur transformée en string
  await AsyncStorage.setItem(key, JSON.stringify(datas));
};

const DeleteDataFavorite = async (data, datas) => {
  datas = await LoadFavorite();

  const index = datas.indexOf(data);
  if (index !== -1) {
    datas.splice(index, 1);
    await SaveFavorite(datas);
  }
};

const AddDataFavorite = async (data) => {
  const datas = await LoadFavorite();
  // data est ajouté au début du tableau datas seulement si elle n'existe pas
  const index = datas.indexOf(data);
  if (index === -1) {
    datas.unshift(data);
  } else {
    for (let i = 0; i < datas.length; i++) {
      if (datas[i] === data) {
        datas.splice(i, 1);
        datas.unshift(data);
      }
    }
  }
  await SaveFavorite(datas);
};

export { LoadFavorite, SaveFavorite, DeleteDataFavorite, AddDataFavorite };
