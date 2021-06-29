
const addToCart = (proId) => {
  $.ajax({
    url: "/add-to-cart",
    data: {
      proID: proId,
    },
    method: "post",
    success: (response) => {
      if (response.status) {
        location.reload();
      } else {
        alert("login first");
        console.log('login')
      }
    },
  });
};
