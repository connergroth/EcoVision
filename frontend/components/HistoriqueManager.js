import AsyncStorage from "@react-native-async-storage/async-storage";

const key = "historique";

const Load = async () => {
  const datas = await AsyncStorage.getItem(key);

  // Lecture de la valeur en json
  return datas === null ? [] : JSON.parse(datas);
};

const Save = async (datas) => {
  // Stockage de la valeur transformée en string
  await AsyncStorage.setItem(key, JSON.stringify(datas));
};

const DeleteData = async (data, datas) => {
  datas = await Load();

  const index = datas.indexOf(data);
  if (index !== -1) {
    datas.splice(index, 1);
    await Save(datas);
  }
};

const AddData = async (data) => {
  const datas = await Load();
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

  await Save(datas);
};

export { Load, Save, DeleteData, AddData };
