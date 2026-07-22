(function () {
  function fmt(rating) {
    return Number(rating || 0).toFixed(1);
  }

  function stars(rating) {
    var filled = Math.round(Number(rating) || 0);
    var html = "";
    for (var i = 1; i <= 5; i += 1) {
      var isFilled = i <= filled;
      html +=
        '<span class="vouch-star vouch-star--' +
        (isFilled ? "filled" : "empty") +
        '" aria-hidden="true">' +
        (isFilled ? "★" : "☆") +
        "</span>";
    }
    return html;
  }

  function ratingHtml(rating) {
    return (
      '<span class="vouch-reviews__stars" aria-label="' +
      fmt(rating) +
      ' out of 5 stars">' +
      stars(rating) +
      '</span><span class="vouch-reviews__rating-value">' +
      fmt(rating) +
      "</span>"
    );
  }

  function avg(items) {
    if (!items.length) return 0;
    return (
      items.reduce(function (s, item) {
        return s + Number(item.rating || 0);
      }, 0) / items.length
    );
  }

  function loadReviews(proxyUrl, productId) {
    return fetch(
      proxyUrl + "?productId=" + encodeURIComponent(productId) + "&limit=20",
      { headers: { Accept: "application/json" }, credentials: "same-origin" },
    ).then(function (res) {
      if (!res.ok) throw new Error("load failed");
      return res.json();
    });
  }

  function setStars(picker, value, display) {
    var rating = Number(value) || 0;
    picker.querySelectorAll("[data-rating]").forEach(function (btn) {
      var n = Number(btn.getAttribute("data-rating"));
      btn.classList.toggle("is-active", n <= rating);
      btn.setAttribute("aria-checked", n === rating ? "true" : "false");
    });
    if (display) display.textContent = rating > 0 ? fmt(rating) : "";
  }

  function initStars(form) {
    var picker = form.querySelector("[data-vouch-star-picker]");
    var input = form.querySelector("[data-vouch-rating-input]");
    var display = form.querySelector("[data-vouch-rating-display]");
    if (!picker || !input) return;
    setStars(picker, input.value || 0, display);
    picker.querySelectorAll("[data-rating]").forEach(function (btn) {
      btn.setAttribute("role", "radio");
      btn.addEventListener("mouseenter", function () {
        var hover = Number(btn.getAttribute("data-rating"));
        picker.querySelectorAll("[data-rating]").forEach(function (star) {
          star.classList.toggle(
            "is-hover",
            Number(star.getAttribute("data-rating")) <= hover,
          );
        });
      });
      btn.addEventListener("mouseleave", function () {
        picker.querySelectorAll("[data-rating]").forEach(function (star) {
          star.classList.remove("is-hover");
        });
      });
      btn.addEventListener("click", function () {
        var n = Number(btn.getAttribute("data-rating"));
        input.value = String(n);
        setStars(picker, n, display);
      });
    });
  }

  function msg(el, ok, text) {
    if (!el) return;
    el.hidden = false;
    el.classList.toggle("is-success", ok);
    el.classList.toggle("is-error", !ok);
    el.textContent = text;
  }

  function renderBadges() {
    document.querySelectorAll("[data-vouch-star-rating]").forEach(function (root) {
      var productId = root.getAttribute("data-product-id");
      var proxyUrl = root.getAttribute("data-proxy-url") || "/apps/reviews";
      var ph = root.querySelector(".vouch-star-rating__placeholder");
      if (!productId) return;
      loadReviews(proxyUrl, productId)
        .then(function (data) {
          var items = data.items || [];
          if (!ph) return;
          if (!items.length) {
            ph.textContent = "No reviews yet";
            return;
          }
          var a = avg(items);
          ph.innerHTML =
            '<span class="vouch-star-rating__stars">' +
            stars(a) +
            '</span><span class="vouch-reviews__rating-value">' +
            fmt(a) +
            "</span> (" +
            items.length +
            ")";
        })
        .catch(function () {
          if (ph) ph.textContent = "Reviews unavailable";
        });
    });
  }

  function renderLists() {
    document.querySelectorAll("[data-vouch-reviews]").forEach(function (root) {
      var productId = root.getAttribute("data-product-id");
      var proxyUrl = root.getAttribute("data-proxy-url") || "/apps/reviews";
      var list = root.querySelector("[data-vouch-reviews-list]");
      var formWrap = root.querySelector("[data-vouch-reviews-form]");
      var guestWrap = root.querySelector("[data-vouch-reviews-guest]");
      var form = root.querySelector("[data-vouch-review-form]");
      var message = root.querySelector("[data-vouch-review-message]");
      var wall = root.querySelector("[data-vouch-auth-wall]");
      var showForm = root.getAttribute("data-show-form") !== "false";
      var loggedIn = root.getAttribute("data-customer-logged-in") === "true";
      if (!productId || !list) return;
      if (form) initStars(form);

      function openWall() {
        if (!wall) return;
        wall.hidden = false;
        document.documentElement.style.overflow = "hidden";
      }
      function closeWall() {
        if (!wall) return;
        wall.hidden = true;
        document.documentElement.style.overflow = "";
      }

      if (wall) {
        wall.querySelectorAll("[data-vouch-close-auth]").forEach(function (el) {
          el.addEventListener("click", closeWall);
        });
      }
      if (guestWrap) {
        var openBtn = guestWrap.querySelector("[data-vouch-open-auth]");
        if (openBtn) openBtn.addEventListener("click", openWall);
      }

      loadReviews(proxyUrl, productId)
        .then(function (data) {
          var items = data.items || [];
          var settings = data.settings || {};
          var enabled = showForm && settings.showReviewForm !== false;
          if (!items.length) {
            list.textContent = "No reviews yet.";
          } else {
            list.innerHTML = items
              .map(function (item) {
                return (
                  '<article class="vouch-reviews__item"><div class="vouch-reviews__meta">' +
                  ratingHtml(item.rating) +
                  "<strong>" +
                  (item.authorName || "Customer") +
                  "</strong>" +
                  (item.verifiedPurchase ? "<span>Verified</span>" : "") +
                  "</div>" +
                  (item.title ? "<h4>" + item.title + "</h4>" : "") +
                  "<p>" +
                  item.body +
                  "</p></article>"
                );
              })
              .join("");
          }
          if (!enabled) return;
          if (formWrap) formWrap.hidden = !loggedIn;
          if (guestWrap) guestWrap.hidden = loggedIn;
        })
        .catch(function () {
          list.textContent = "Reviews unavailable.";
        });

      if (!form) return;
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        if (!loggedIn) {
          openWall();
          return;
        }
        var fd = new FormData(form);
        fd.set("shopifyProductId", productId);
        fd.set(
          "authorName",
          root.getAttribute("data-customer-name") ||
            String(fd.get("authorName") || ""),
        );
        fd.set(
          "authorEmail",
          root.getAttribute("data-customer-email") ||
            String(fd.get("authorEmail") || ""),
        );
        var picker = form.querySelector("[data-vouch-star-picker]");
        var ratingInput = form.querySelector("[data-vouch-rating-input]");
        var display = form.querySelector("[data-vouch-rating-display]");
        if (!ratingInput || !Number(ratingInput.value)) {
          msg(message, false, "Please choose a star rating.");
          return;
        }
        fetch(proxyUrl, { method: "POST", body: fd, credentials: "same-origin" })
          .then(function (res) {
            return res.json().then(function (body) {
              return { ok: res.ok, status: res.status, body: body };
            });
          })
          .then(function (result) {
            if (
              result.status === 401 &&
              result.body &&
              result.body.error &&
              result.body.error.code === "AUTH_REQUIRED"
            ) {
              openWall();
              return;
            }
            if (result.ok) {
              msg(
                message,
                true,
                "Thanks! Your review was submitted and awaits store approval.",
              );
              form.reset();
              if (ratingInput) ratingInput.value = "";
              if (picker) setStars(picker, 0, display);
              var nameEl = form.querySelector("[data-vouch-author-name]");
              var emailEl = form.querySelector("[data-vouch-author-email]");
              if (nameEl) {
                nameEl.value = root.getAttribute("data-customer-name") || "";
              }
              if (emailEl) {
                emailEl.value = root.getAttribute("data-customer-email") || "";
              }
              return;
            }
            msg(
              message,
              false,
              (result.body && result.body.error && result.body.error.message) ||
                "Unable to submit review.",
            );
          })
          .catch(function () {
            msg(message, false, "Unable to submit review.");
          });
      });
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    renderBadges();
    renderLists();
  });
})();
