var express = require("express");
const productHelpers = require("../helpers/product-helpers");
const userHelpers = require("../helpers/user-helpers");
var router = express.Router();

// verifyLogin
const verifyLogin = (req, res, next) => {
  if (req.session.userLoggedIn) {
    next();
  } else {
    res.redirect("/login");
  }
};

// routes
router.get("/", async function (req, res) {
  let user = req.session.user;
  const products = await productHelpers.getAllProducts();
  if (user) {
    var orderCount = await userHelpers.getOrderCount(req.session.user._id);
    var count = await userHelpers.getCartQuantity(req.session.user._id);
  }
  res.render("user/index", { products, user, count, orderCount });
});

router.get("/signup", (req, res) => {
  res.render("user/signup", {});
});

router.post("/signup", (req, res) => {
  userHelpers.signup(req.body).then((response) => {
    req.session.userLoggedIn = true;
    req.session.user = response;
    res.redirect("/");
  });
});

router.get("/login", (req, res) => {
  res.render("user/signin", {});
});

router.post("/login", (req, res) => {
  userHelpers.login(req.body).then((response) => {
    if (response.blockStatus) {
      res.redirect("/login");
    }
    req.session.user = response.user;
    req.session.userLoggedIn = true;
    res.redirect("/");
  });
});

router.get("/logout", (req, res) => {
  req.session.user = null;
  req.session.userLoggedIn = false;
  res.redirect("/");
});

router.post("/add-to-cart", (req, res) => {
  userHelpers
    .addToCart(req.session.user._id, req.body.proID)
    .then((response) => {
      res.json(response);
    });
});

router.get("/cart", verifyLogin, async (req, res, next) => {
  let user = req.session.user;
  if (user) {
    userHelpers.getCartItemTotal(req.session.user._id);
    var orderCount = await userHelpers.getOrderCount(req.session.user._id);
    var count = await userHelpers.getCartQuantity(req.session.user._id);
    var total = await userHelpers.getTotalAmount(req.session.user._id);
  }

  userHelpers.getCartItems(req.session.user._id).then(async (response) => {
    res.render("user/cart", { response, user, count, orderCount,total });
  });
});

router.get("/remove-product/:id", (req, res) => {
  userHelpers
    .removeCartProduct(req.params.id, req.session.user._id)
    .then(() => {
      res.redirect("/cart");
    });
});

router.post("/change-cart-quantity", async (req, res) => {
  userHelpers
    .changeProductQuantity(
      req.body.proId,
      req.session.user._id,
      req.body.quantity,
      req.body.count
    )
    .then((response) => {
      res.json(response);
    });
});

router.get("/checkout", verifyLogin, async (req, res) => {
  const user = req.session.user;
  const total = await userHelpers.getTotalAmount(req.session.user._id);
  res.render("user/checkout", { user, total });
});

router.post("/checkout", verifyLogin, async (req, res) => {
  console.log("order details >>>", req.body);
  const products = await userHelpers.getCartItemProducts(req.session.user._id);
  const total = await userHelpers.getTotalAmount(req.session.user._id);
  userHelpers
    .placeOrder(products, req.session.user._id, req.body, total)
    .then((orderId) => {
      if (req.body["payment-method"] === "cod") {
        console.log("working 🚀 ");
        res.json({ codStatus: true });
      } else {
        // razorpay
        console.log("🔥😄");
        userHelpers.generateRazorpay(orderId, total).then((response) => {
          console.log("order >>>", response);
          res.json(response);
        });
      }
    });
});

router.get("/orders", verifyLogin, async (req, res) => {
  const user = req.session.user;
  var orderCount = await userHelpers.getOrderCount(req.session.user._id);
  console.log(orderCount);
  userHelpers.getOrders(req.session.user._id).then((products) => {
    res.render("user/orders", { products, user, orderCount });
  });
});

router.get("/orderDetails/:id", async (req, res) => {
  const products = await userHelpers.getOrderProducts(req.params.id);
  console.log(products);
  res.render("user/orderDetails", { products });
});

router.post("/verify-payment", (req, res) => {
  console.log("payment", req.body);
  userHelpers.verifyPayment(req.body).then((response) => {
    if (response.status) {
      userHelpers.changePaymentStatus(req.body["order[receipt]"]).then(() => {
        res.json({ status: true });
      });
    }
  });
});
router.get("/success", (req, res) => {
  res.render("user/success", {});
});
module.exports = router;
