(function () {
  function stars(rating) {
    var filled = Math.round(Number(rating) || 0);
    var output = "";
    for (var i = 1; i <= 5; i += 1) {
      output += i <= filled ? "★" : "☆";
    }
    return output;
  }

  function average(items) {
    if (!items.length) {
      return 0;
    }
    var total = items.reduce(function (sum, item) {
      return sum + Number(item.rating || 0);
    }, 0);
    return total / items.length;
  }

  function fetchReviews(proxyUrl, productId) {
    var url =
      proxyUrl +
      "?productId=" +
      encodeURIComponent(productId) +
      "&limit=20";
    return fetch(url, {
      headers: { Accept: "application/json" },
      credentials: "same-origin",
    }).then(function (response) {
      if (!response.ok) {
        throw new Error("Unable to load reviews");
      }
      return response.json();
    });
  }

  function setStarPickerValue(picker, value) {
    var rating = Number(value) || 0;
    var buttons = picker.querySelectorAll("[data-rating]");
    buttons.forEach(function (button) {
      var buttonRating = Number(button.getAttribute("data-rating"));
      button.classList.toggle("is-active", buttonRating <= rating);
      button.setAttribute(
        "aria-checked",
        buttonRating === rating ? "true" : "false",
      );
    });
  }

  function initStarPicker(form) {
    var picker = form.querySelector("[data-vouch-star-picker]");
    var input = form.querySelector("[data-vouch-rating-input]");
    if (!picker || !input) {
      return;
    }

    setStarPickerValue(picker, input.value || 5);

    picker.querySelectorAll("[data-rating]").forEach(function (button) {
      button.setAttribute("role", "radio");

      button.addEventListener("mouseenter", function () {
        var hoverRating = Number(button.getAttribute("data-rating"));
        picker.querySelectorAll("[data-rating]").forEach(function (star) {
          var starRating = Number(star.getAttribute("data-rating"));
          star.classList.toggle("is-hover", starRating <= hoverRating);
        });
      });

      button.addEventListener("mouseleave", function () {
        picker.querySelectorAll("[data-rating]").forEach(function (star) {
          star.classList.remove("is-hover");
        });
      });

      button.addEventListener("click", function () {
        var rating = Number(button.getAttribute("data-rating"));
        input.value = String(rating);
        setStarPickerValue(picker, rating);
      });
    });
  }

  function renderStarBadges() {
    document.querySelectorAll("[data-vouch-star-rating]").forEach(function (root) {
      var productId = root.getAttribute("data-product-id");
      var proxyUrl = root.getAttribute("data-proxy-url") || "/apps/reviews";
      var placeholder = root.querySelector(".vouch-star-rating__placeholder");

      if (!productId) {
        return;
      }

      fetchReviews(proxyUrl, productId)
        .then(function (payload) {
          var items = payload.items || [];
          var avg = average(items);
          if (placeholder) {
            placeholder.textContent =
              items.length === 0
                ? "No reviews yet"
                : stars(avg) + " (" + items.length + ")";
          }
        })
        .catch(function () {
          if (placeholder) {
            placeholder.textContent = "Reviews unavailable";
          }
        });
    });
  }

  function renderReviewLists() {
    document.querySelectorAll("[data-vouch-reviews]").forEach(function (root) {
      var productId = root.getAttribute("data-product-id");
      var proxyUrl = root.getAttribute("data-proxy-url") || "/apps/reviews";
      var list = root.querySelector("[data-vouch-reviews-list]");
      var formWrap = root.querySelector("[data-vouch-reviews-form]");
      var form = root.querySelector("[data-vouch-review-form]");
      var message = root.querySelector("[data-vouch-review-message]");
      var showForm = root.getAttribute("data-show-form") !== "false";

      if (!productId || !list) {
        return;
      }

      if (form) {
        initStarPicker(form);
      }

      fetchReviews(proxyUrl, productId)
        .then(function (payload) {
          var items = payload.items || [];
          var settings = payload.settings || {};

          if (items.length === 0) {
            list.textContent = "No reviews yet.";
          } else {
            list.innerHTML = items
              .map(function (item) {
                return (
                  '<article class="vouch-reviews__item">' +
                  '<div class="vouch-reviews__meta">' +
                  '<span class="vouch-reviews__stars" aria-label="' +
                  item.rating +
                  ' out of 5 stars">' +
                  stars(item.rating) +
                  "</span>" +
                  "<strong>" +
                  (item.authorName || "Customer") +
                  "</strong>" +
                  (item.verifiedPurchase ? "<span>Verified</span>" : "") +
                  "</div>" +
                  (item.title ? "<h4>" + item.title + "</h4>" : "") +
                  "<p>" +
                  item.body +
                  "</p>" +
                  "</article>"
                );
              })
              .join("");
          }

          if (formWrap && showForm && settings.showReviewForm !== false) {
            formWrap.hidden = false;
          }
        })
        .catch(function () {
          list.textContent = "Reviews unavailable.";
        });

      if (form) {
        form.addEventListener("submit", function (event) {
          event.preventDefault();
          var formData = new FormData(form);
          formData.set("shopifyProductId", productId);
          var picker = form.querySelector("[data-vouch-star-picker]");
          var ratingInput = form.querySelector("[data-vouch-rating-input]");

          fetch(proxyUrl, {
            method: "POST",
            body: formData,
            credentials: "same-origin",
          })
            .then(function (response) {
              return response.json().then(function (body) {
                return { ok: response.ok, body: body };
              });
            })
            .then(function (result) {
              if (!message) {
                return;
              }
              message.hidden = false;
              message.classList.remove("is-success", "is-error");
              if (result.ok) {
                message.classList.add("is-success");
                message.textContent =
                  "Thanks! Your review was submitted and is waiting for store approval. It will appear here once approved.";
                form.reset();
                if (ratingInput) {
                  ratingInput.value = "5";
                }
                if (picker) {
                  setStarPickerValue(picker, 5);
                }
              } else {
                message.classList.add("is-error");
                message.textContent =
                  (result.body &&
                    result.body.error &&
                    result.body.error.message) ||
                  "Unable to submit review.";
              }
            })
            .catch(function () {
              if (message) {
                message.hidden = false;
                message.classList.remove("is-success");
                message.classList.add("is-error");
                message.textContent = "Unable to submit review.";
              }
            });
        });
      }
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    renderStarBadges();
    renderReviewLists();
  });
})();
