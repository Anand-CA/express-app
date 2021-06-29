const { ObjectId } = require("mongodb");
const db = require("../config/connection");
module.exports = {
  getAllProducts: () => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection("products")
        .find()
        .toArray()
        .then((res) => {
          resolve(res);
        });
    });
  },
};
