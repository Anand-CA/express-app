function changeQuantity(proID, Quantity, count) {
  var count = parseInt(count);
  var Quantity = parseInt(Quantity);
  console.log("🔹", Quantity);
  $.ajax({
    url: "/change-cart-quantity",
    data: {
      proId: proID,
      count: count,
      quantity: Quantity,
    },
    method: "post",
    success: (response) => {
      if (response.removeProduct) {
        alert("product removed");
        location.reload();
      } else {
        location.reload();
      }
    },
  });
}
