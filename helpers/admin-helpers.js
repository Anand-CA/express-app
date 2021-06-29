const { ObjectId } = require("mongodb");
const bcrypt = require("bcrypt");
const db = require("../config/connection");
module.exports = {
  addProduct: (productDetails) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection("products")
        .insertOne(productDetails)
        .then((response) => {
          resolve(response);
        });
    });
  },

  removeProduct: (proId) => {
    console.log("proId >>", proId);
    return new Promise((resolve, reject) => {
      db.get()
        .collection("products")
        .removeOne({ _id: ObjectId(proId) })
        .then(() => {
          resolve({ status: true });
        });
    });
  },
  getUsers: () => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection("users")
        .find()
        .toArray()
        .then((res) => {
          resolve(res);
        });
    });
  },
  removeUser: (userId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection("users")
        .removeOne({ _id: ObjectId(userId) })
        .then(() => {
          resolve();
        });
    });
  },
  blockUser:(userId)=>{
    return new Promise((resolve, reject) => {
      db.get().collection('users').updateOne({_id:ObjectId(userId)},
      {
        $set:{blocked:true}
      }).then(()=>{
        resolve()
      })
    })
  },
  unBlockUser:(userId)=>{
    return new Promise((resolve, reject) => {
      db.get().collection('users').updateOne({_id:ObjectId(userId)},
      {
        $set:{blocked:false}
      }).then(()=>{
        resolve()
      })
    })
  },
  getUserCount: () => {
    return new Promise(async (resolve, reject) => {
      var user = await db.get().collection("users").find().toArray();
      if (user) {
        resolve(user.length);
      } else {
        resolve(0);
      }
    });
  },
  doSignUp: () => {
    return new Promise(async (resolve, reject) => {
      var loginInfo = {
        username: "densec",
        email: "densec@gmail.com",
        password: "densec123",
      };
      loginInfo.password = await bcrypt.hash(loginInfo.password, 10);
      db.get()
        .collection("adminUsers")
        .insertOne(loginInfo)
        .then(() => {
          resolve();
        });
    });
  },
  doLogin: (loginDetails) => {
    var resObj = {};
    return new Promise(async (resolve, reject) => {
      const user = await db
        .get()
        .collection("adminUsers")
        .findOne({ email: loginDetails.email });
      if (user) {
        bcrypt.compare(loginDetails.password, user.password).then((status) => {
          if (status) {
            resObj.user = user;
            resObj.status = true;
            resolve(resObj);
          } else {
            console.log("incorrect password");
            resolve({ status: false });
          }
        });
      } else {
        console.log("no user exists");
        resolve({ status: false });
      }
    });
  },
};
