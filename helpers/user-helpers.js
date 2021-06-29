const bcrypt = require("bcrypt");
const db = require("../config/connection");
var ObjectId = require("mongodb").ObjectID;
var moment = require("moment");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const alert = require("alert");

module.exports = {
  signup: (userDetails) => {
    return new Promise(async (resolve, reject) => {
      userDetails.password = await bcrypt.hash(userDetails.password, 10);
      userDetails.blocked = false;
      await db
        .get()
        .collection("users")
        .insertOne(userDetails)
        .then((response) => {
          resolve(response.ops[0]);
        });
    });
  },
  login: (userDetails) => {
    let response = {};
    return new Promise(async (resolve, reject) => {
      const user = await db
        .get()
        .collection("users")
        .findOne({ email: userDetails.email });
      if (user) {
        if (user.blocked) {
          alert("your account is blocked");
          resolve({ blockStatus: true });
        } else {
          bcrypt.compare(userDetails.password, user.password).then((status) => {
            if (status) {
              response.status = true;
              console.log("login sucess");
              response.user = user;
              resolve(response);
            } else {
              console.log("user exist but incorrect password");
            }
          });
        }
      } else {
        resolve({ response: false });
      }
    });
  },
  addToCart: (userId, proId) => {
    const proObj = {
      item: ObjectId(proId),
      quantity: 1,
    };
    const cartObj = {
      user: ObjectId(userId),
      products: [proObj],
    };

    return new Promise(async (resolve, reject) => {
      const userCart = await db
        .get()
        .collection("carts")
        .findOne({ user: ObjectId(userId) });
      if (userCart) {
        var proExist = userCart.products.findIndex(
          (product) => product.item == proId
        );
        console.log("Index>>>", proExist);
        if (proExist != -1) {
          db.get()
            .collection("carts")
            .updateOne(
              { user: ObjectId(userId), "products.item": ObjectId(proId) },
              {
                $inc: { "products.$.quantity": 1 },
              }
            )
            .then(() => {
              resolve({ status: true });
            });
        } else {
          db.get()
            .collection("carts")
            .updateOne(
              { user: ObjectId(userId) },
              {
                $push: { products: proObj },
              }
            )
            .then(() => {
              resolve({ status: true });
            });
        }
      } else {
        db.get()
          .collection("carts")
          .insertOne(cartObj)
          .then(() => {
            resolve({ status: true });
          });
      }
    });
  },
  getCartQuantity: (userId) => {
    return new Promise(async (resolve, reject) => {
      let count = 0;
      const cart = await db
        .get()
        .collection("carts")
        .findOne({ user: ObjectId(userId) });
      if (cart) {
        count = cart.products.length;
      }
      resolve(count);
    });
  },
  getCartItems: (userID) => {
    return new Promise(async (resolve, reject) => {
      let cartItems = await db
        .get()
        .collection("carts")
        .aggregate([
          {
            $match: { user: ObjectId(userID) },
          },
          {
            $unwind: "$products",
          },
          {
            $project: {
              item: "$products.item",
              quantity: "$products.quantity",
            },
          },
          {
            $lookup: {
              from: "products",
              localField: "item",
              foreignField: "_id",
              as: "product",
            },
          },
          {
            $project: {
              item: 1,
              quantity: 1,
              product: { $arrayElemAt: ["$product", 0] },
            },
          },
        ])
        .toArray();

      resolve(cartItems);
    });
  },
  removeCartProduct: (proId, userId) => {
    return new Promise(async (resolve, reject) => {
      db.get()
        .collection("carts")
        .update(
          { user: ObjectId(userId) },
          {
            $pull: { products: { item: ObjectId(proId) } },
          }
        )
        .then(() => {
          resolve();
        });
    });
  },
  changeProductQuantity: (proId, userId, Quantity, count) => {
    const Count = parseInt(count);
    const quantity = parseInt(Quantity);
    return new Promise((resolve, reject) => {
      if (Count === -1 && quantity === 1) {
        db.get()
          .collection("carts")
          .updateOne(
            { user: ObjectId(userId) },
            {
              $pull: { products: { item: ObjectId(proId) } },
            }
          )
          .then(() => {
            resolve({ status: true });
          });
      }
      db.get()
        .collection("carts")
        .updateOne(
          { user: ObjectId(userId), "products.item": ObjectId(proId) },
          {
            $inc: { "products.$.quantity": Count },
          }
        )
        .then((res) => {
          resolve({ status: true });
        });
    });
  },
  getTotalAmount: (userID) => {
    return new Promise(async (resolve, reject) => {
      let total = await db
        .get()
        .collection("carts")
        .aggregate([
          {
            $match: { user: ObjectId(userID) },
          },
          {
            $unwind: "$products",
          },
          {
            $project: {
              item: "$products.item",
              quantity: "$products.quantity",
            },
          },
          {
            $lookup: {
              from: "products",
              localField: "item",
              foreignField: "_id",
              as: "product",
            },
          },
          {
            $project: {
              item: 1,
              quantity: 1,
              product: { $arrayElemAt: ["$product", 0] },
            },
          },
          {
            $addFields: {
              convertedQty: { $toInt: "$product.price" },
            },
          },
          {
            $group: {
              _id: null,
              total: { $sum: { $multiply: ["$quantity", "$convertedQty"] } },
            },
          },
        ])
        .toArray();
      if (total.length != 0) {
        resolve(total[0].total);
      } else {
        resolve(0);
      }
    });
  },
  getCartItemTotal: (userId) => {
    return new Promise(async (resolve, reject) => {
      const itemTotal = await db
        .get()
        .collection("carts")
        .update({ user: ObjectId(userId) });

      console.log("Item total 😄 >>>>>>", itemTotal);
    });
  },
  placeOrder: (products, userId, orderDetails, total) => {
    return new Promise(async (resolve, reject) => {
      var status =
        orderDetails["payment-method"] === "cod" ? "placed" : "pending";
      orderObj = {
        deliveryDetails: {
          address: orderDetails.address,
          phone_number: orderDetails.phone_number,
          pincode: orderDetails.pincode,
        },
        userId: ObjectId(userId),
        products: products,
        totalAmount: total,
        status: status,
        paymentMethod: orderDetails["payment-method"],
        date: moment(new Date()).format("LLL"),
      };
      db.get()
        .collection("orders")
        .insertOne(orderObj)
        .then((response) => {
          db.get()
            .collection("carts")
            .removeOne({ user: ObjectId(userId) })
            .then(() => {
              resolve(response.ops[0]._id);
            });
        });
    });
  },
  getCartItemProducts: (userId) => {
    return new Promise(async (resolve, reject) => {
      const cart = await db
        .get()
        .collection("carts")
        .findOne({ user: ObjectId(userId) });
      resolve(cart.products);
    });
  },
  getOrders: (userId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection("orders")
        .find({ userId: ObjectId(userId) })
        .sort({ date: -1 })
        .toArray()
        .then((res) => {
          console.log("res >>>", res);
          resolve(res);
        });
    });
  },
  getOrderCount: (userId) => {
    return new Promise(async (resolve, reject) => {
      let count = 0;
      const order = await db
        .get()
        .collection("orders")
        .find({ userId: ObjectId(userId) })
        .toArray();
      if (order) {
        count = order.length;
      }
      resolve(count);
    });
  },
  getOrderProducts: (orderId) => {
    return new Promise(async (resolve, reject) => {
      let orderProducts = await db
        .get()
        .collection("orders")
        .aggregate([
          {
            $match: { _id: ObjectId(orderId) },
          },
          {
            $unwind: "$products",
          },
          {
            $project: {
              item: "$products.item",
              quantity: "$products.quantity",
            },
          },
          {
            $lookup: {
              from: "products",
              localField: "item",
              foreignField: "_id",
              as: "product",
            },
          },
          {
            $project: {
              item: 1,
              quantity: 1,
              product: { $arrayElemAt: ["$product", 0] },
            },
          },
        ])
        .toArray();

      resolve(orderProducts);
    });
  },
  generateRazorpay: (orderId, total) => {
    console.log("orderId>>>", orderId);
    return new Promise((resolve, reject) => {
      var instance = new Razorpay({
        key_id: "rzp_test_KxkZcOPblhMJnB",
        key_secret: "H2iOn0nIbtcVue0wZoUoRjfk",
      });

      var options = {
        amount: total * 100, // amount in the smallest currency unit
        currency: "INR",
        receipt: orderId.toString(),
      };
      instance.orders.create(options, function (err, order) {
        console.log("errr >>", err);
        resolve(order);
      });
    });
  },
  verifyPayment: (details) => {
    return new Promise(async (resolve, reject) => {
      var hmac = crypto.createHmac("sha256", "H2iOn0nIbtcVue0wZoUoRjfk");
      hmac.update(
        details["order[id]"] + "|" + details["payment[razorpay_payment_id]"]
      );
      hmac = hmac.digest("hex");
      if (hmac === details["payment[razorpay_signature]"]) {
        resolve({ status: true });
      }
    });
  },
  changePaymentStatus: (orderId) => {
    return new Promise(async (resolve, reject) => {
      db.get()
        .collection("orders")
        .updateOne(
          { _id: ObjectId(orderId) },
          {
            $set: { status: "placed" },
          }
        )
        .then(() => {
          resolve();
        });
    });
  },
};
