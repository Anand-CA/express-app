var express = require("express");
const { ReplSet } = require("mongodb");
const adminHelpers = require("../helpers/admin-helpers");
const productHelpers = require("../helpers/product-helpers");
const userHelpers = require("../helpers/user-helpers");
var router = express.Router();

const verifyLogin = (req, res, next) => {
  if (req.session.adminLoggedIn) {
    next();
  } else {
    res.redirect("/admin/login");
  }
};
/* GET users listing. */
router.get("/", verifyLogin, function (req, res, next) {
  if (req.session.admin) {
    var user = req.session.admin;
  }

  productHelpers.getAllProducts().then((response) => {
    adminHelpers.getUsers().then((users) => {
      adminHelpers.getUserCount().then((userCount) => {
        res.render("admin/index", {
          response,
          userCount,
          user,
          users,
          admin: true,
        });
      });
    });
  });
});

router.get("/add-product", (req, res) => {
  if (req.session.admin) {
    var user = req.session.admin;
  }
  res.render("admin/add-product", { user });
});

router.post("/add-product", (req, res) => {
  console.log(req.body);
  adminHelpers.addProduct(req.body);
  res.redirect("/admin");
});

router.get("/delete-product/:id", (req, res) => {
  console.log(req.params.id);
  adminHelpers.removeProduct(req.params.id).then(() => {
    res.redirect("/admin");
  });
});

router.get("/remove-user/:id", (req, res) => {
  adminHelpers.removeUser(req.params.id).then(() => {
    req.session.user = null;
    req.session.userLoggedIn = null;
    res.redirect("/admin");
  });
});

router.get("/block-user/:id", (req, res) => {
  adminHelpers.blockUser(req.params.id).then(() => {
    console.log("blocked");
    res.redirect("/admin");
  });
});

router.get("/unBlock-user/:id", (req, res) => {
  adminHelpers.unBlockUser(req.params.id).then(() => {
    console.log("unblocked");
    res.redirect("/admin");
  });
});
router.get("/login", (req, res) => {
  res.render("admin/login", {});
});
router.post("/login", (req, res) => {
  adminHelpers.doLogin(req.body).then((response) => {
    console.log("response >>>>", response);
    if (response.status) {
      req.session.admin = response.user;
      req.session.adminLoggedIn = true;
      res.redirect("/admin");
    } else {
      res.redirect("/admin/login");
    }
  });
});

router.get("/logout", (req, res) => {
  req.session.admin = null;
  req.session.adminLoggedIn = false;
  res.redirect("/admin");
});
module.exports = router;
