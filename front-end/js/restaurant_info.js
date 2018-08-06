let restaurant;
var map;

/**
 * Initialize Google map, called from HTML.
 */
window.initMap = () => {
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.map = new google.maps.Map(document.getElementById('map'), {
        zoom: 16,
        center: restaurant.latlng,
        scrollwheel: false
      });
      fillBreadcrumb();
      DBHelper.mapMarkerForRestaurant(self.restaurant, self.map);
    }
  });
}

/**
 * Get current restaurant from page URL.
 */
fetchRestaurantFromURL = (callback) => {
  if (self.restaurant) { // restaurant already fetched!
    callback(null, self.restaurant)
    return;
  }
  const id = getParameterByName('id');
  if (!id) { // no id found in URL
    error = 'No restaurant id in URL'
    callback(error, null);
  } else {
    DBHelper.fetchRestaurantById(id, (error, restaurant) => {
      self.restaurant = restaurant;
      if (!restaurant) {
        console.error(error);
        return;
      }
      fillRestaurantHTML();
      callback(null, restaurant)
    });
  }
}

/**
 * Create restaurant HTML and add it to the webpage
 */
fillRestaurantHTML = (restaurant = self.restaurant) => {
  const name = document.getElementById('restaurant-name');
  name.innerHTML = restaurant.name;

  const address = document.getElementById('restaurant-address');
  address.innerHTML = restaurant.address;

  const image = document.getElementById('restaurant-img');
  image.alt = restaurant.name + " in " + restaurant.neighborhood;
  image.title = restaurant.name;
  image.className = 'restaurant-img'
  image.src = `img/${restaurant.id}-small.jpg`;
  image.srcset = `img/${restaurant.id}-small.jpg 400w, img/${restaurant.id}-medium.jpg 600w, img/${restaurant.id}.jpg 800w`;

  const cuisine = document.getElementById('restaurant-cuisine');
  cuisine.innerHTML = restaurant.cuisine_type;

  // fill operating hours
  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML();
  }
  // fill reviews
  fillReviewsHTML();
}

/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
fillRestaurantHoursHTML = (operatingHours = self.restaurant.operating_hours) => {
  const hours = document.getElementById('restaurant-hours');
  for (let key in operatingHours) {
    const row = document.createElement('tr');
    row.tabIndex = "0";

    const day = document.createElement('td');
    day.innerHTML = key;
    row.appendChild(day);

    const time = document.createElement('td');
    time.innerHTML = operatingHours[key];
    row.appendChild(time);

    hours.appendChild(row);
  }
}

/**
 * Create review HTML and add it to the webpage.
 */
createReviewHTML = (review) => {
  const li = document.createElement('li');
  li.tabIndex = "0";

  const topDiv = document.createElement("div");
  topDiv.className = 'top-review-bar';

  const name = document.createElement('p');
  name.innerHTML = review.name;
  topDiv.appendChild(name);

  const date = document.createElement('p');
  date.innerHTML = new Date(review.createdAt);
  topDiv.appendChild(date);
  li.appendChild(topDiv);

  const clearFloat = document.createElement("div");
  clearFloat.className = 'clear-float';
  li.appendChild(clearFloat);

  const divRating = document.createElement("div");
  divRating.className = 'rating-restaurant';

  const rating = document.createElement('p');
  rating.innerHTML = `Rating: ${review.rating}`;

  divRating.appendChild(rating);
  li.appendChild(divRating);

  const comments = document.createElement('p');
  comments.innerHTML = review.comments;
  li.appendChild(comments);

  return li;
}

/**
 * Create all reviews HTML and add them to the webpage.
 */
fillReviewsHTML = (reviews = self.restaurant.reviews) => {

  const container = document.getElementById('reviews-container');
  const title = document.createElement('h2');
  title.innerHTML = 'Reviews';
  container.appendChild(title);

  DBHelper.fetchRestaurantById(self.restaurant.id, ((error, restaurant) => {
    if (error) {
      console.error(error);
    }
    else {
      const favoriteNotify = document.createElement('p');
      favoriteNotify.setAttribute('id', 'is-favorite');
      let isFavorite = false;

      isFavorite = restaurant.is_favorite;
      isFavorite === 'true' ? favoriteNotify.innerHTML = `Marked as Favorite!` : favoriteNotify.innerHTML = `Not Favorite!`;

      container.prepend(favoriteNotify);
    }
  }));

  if (!window.navigator.onLine) {
    const notifyOfflineConnection = document.createElement('p');
    notifyOfflineConnection.innerHTML = "No network connection! You can still add reviews!";
    notifyOfflineConnection.setAttribute('id', 'offline-alert');
    container.appendChild(notifyOfflineConnection);
  }

  DBHelper.getAllReviewsForRestaurant(self.restaurant.id).then((reviews) => {
    if (!reviews) {
      const noReviews = document.createElement('p');
      noReviews.innerHTML = 'No reviews yet!';
      container.appendChild(noReviews);
      return;
    }

    DBHelper.saveReviewsInDatabase(reviews);

    const ul = document.getElementById('reviews-list');
    reviews.forEach((review) => {
      ul.appendChild(createReviewHTML(review));
    });
    container.appendChild(ul);

  }).catch((error) => {
    console.log(error);
    if (!window.navigator.onLine) {
      DBHelper.getStoredReviews().then((idbReviews) => {
        reviews = idbReviews;

        navigator.serviceWorker.ready.then(function (swRegistration) {
          swRegistration.sync.register('syncRequestReviewSubmission');
        });

        const ul = document.getElementById('reviews-list');
        reviews.forEach((review) => {
          ul.appendChild(createReviewHTML(review));
        });
        container.appendChild(ul);
      });
    }
  });
};

function submitReview() {
  const id = getParameterByName('id');
  const name = document.getElementById("review-form").elements.namedItem("name").value;
  const rating = document.getElementById("review-form").elements.namedItem("rating").value;
  const comment = document.getElementById("review-form").elements.namedItem("comment").value;
  const favorite = document.querySelector('input[name="toggleFav"]:checked').value;
  const favoriteNotify =document.getElementById("is-favorite");

  const review = {
    "restaurant_id": id,
    "name": name.trim(),
    "rating": rating,
    "comments": comment.trim()
  }

  DBHelper.addNewReview(review).then((response) => {
    if (!window.navigator.onLine) {
      navigator.serviceWorker.ready.then(function (swRegistration) {
        swRegistration.sync.register('syncRequestReviewSubmission');
      })

      DBHelper.getStoredReviews().then((reviews) => {
        let reviewId = reviews.length + 1;
        review.createdAt = Date.now();
        review.id = reviewId;
        reviews.push(review);
        cachedReviews = reviews;
        return DBHelper.saveReviewsInDatabase(reviews);
      }).then(() => {
        console.log("Saved!");
      });
    }
  });

  let favoriteData = {};

  if (favorite == 1) {
    favoriteData = {
      is_favorite: true
    }
  }else {
    favoriteData = {
      is_favorite: false
    }
  }

  DBHelper.favoriteRestaurant(self.restaurant.id, favoriteData).then((rest) => {
    rest.is_favorite === 'true' ? favoriteNotify.innerHTML = `Marked as Favorite!` : favoriteNotify.innerHTML = `Not Favorite!`;

    DBHelper.getStoredRestaurants().then((restaurants) => {
      restaurants.find((restaurant) => {
        return restaurant.id === self.restaurant.id
      }).is_favorite = rest.is_favorite;

      DBHelper.saveRestaurantsInDatabase(restaurants);

    });
  });

  location.reload();
}

/**
 * Add restaurant name to the breadcrumb navigation menu
 */
fillBreadcrumb = (restaurant=self.restaurant) => {
  const breadcrumb = document.getElementById('breadcrumb');
  const li = document.createElement('li');
  li.innerHTML = restaurant.name;
  li.tabIndex = "0";
  breadcrumb.appendChild(li);
}

/**
 * Get a parameter by name from page URL.
 */
getParameterByName = (name, url) => {
  if (!url)
    url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
    results = regex.exec(url);
  if (!results)
    return null;
  if (!results[2])
    return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}
