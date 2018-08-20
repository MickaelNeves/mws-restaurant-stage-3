let restaurant;
let map;

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

  const favorites = document.getElementById('favorite-div');

  const image = document.getElementById('restaurant-img');
  image.alt = restaurant.name + " in " + restaurant.neighborhood;
  image.title = restaurant.name;
  image.className = 'restaurant-img'
  image.src = `img/${restaurant.id}-small.jpg`;
  image.srcset = `img/${restaurant.id}-small.jpg 400w, img/${restaurant.id}-medium.jpg 600w, img/${restaurant.id}.jpg 800w`;

  const cuisine = document.getElementById('restaurant-cuisine');
  cuisine.innerHTML = restaurant.cuisine_type;

  DBHelper.openDatabase().then(function (db) {
    let storeReadOnly = DBHelper.getObjectStore(DBHelper.FAV_REST, 'readonly', db);
    storeReadOnly.get(restaurant.id)
      .then(idbData => {
        if (idbData) {
          const divFav = document.createElement('div');
          divFav.innerHTML = `<strong>${restaurant.name}</strong> added to favorites ❤`;
          favorites.append(divFav)
        }
        else {
          const aFav = document.createElement('a');
          aFav.innerHTML = '❤ Add to favorites!';
          aFav.setAttribute("onclick", `addToFavorites(${restaurant.id})`);
          aFav.setAttribute("id", "addto-favorites");
          aFav.setAttribute("href", "#restaurant-container");
          aFav.setAttribute("title", "Add " + restaurant.name + " restaurant to favorites!");
          favorites.append(aFav)
        }
      });
  });

  // fill operating hours
  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML();
  }
  // fill reviews
  getAllReviews();
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
 * Get the reviews from DB.
 */
getAllReviews = () => {
  DBHelper.openDatabase().then(function (db) {
    let storeReadOnly = DBHelper.getObjectStore(DBHelper.ONLINE_REVIEWS, 'readonly', db);
    let indexStoreReadOnly = storeReadOnly.index("restaurant_id").getAll(self.restaurant.id);

    indexStoreReadOnly.then(idbData => {
      if (idbData && idbData.length > 0) {
        let offlineStoreReadOnly = DBHelper.getObjectStore(DBHelper.OFFLINE_REVIEWS, 'readonly', db);
        offlineStoreReadOnly.index("restaurant_id").getAll(self.restaurant.id).then(offlineIdbData => {
          for (let data in offlineIdbData) {
            idbData.push(offlineIdbData[data]);
          }

          fillReviewsHTML(idbData);
        });
      } else {
        getSingleRestReviews(self.restaurant.id).then(reviewsData => {
          let storeReadWrite = DBHelper.getObjectStore(DBHelper.ONLINE_REVIEWS, 'readwrite', db);

          reviewsData.forEach(jsonElement => {
            storeReadWrite.put(jsonElement);
          });

          let indexStoreReadWrite = storeReadWrite.index("restaurant_id").getAll(self.restaurant.id);

          indexStoreReadWrite.then(idbData => {
            fillReviewsHTML(idbData);
          })
        }).catch(e => console.log(e))
      }
    });
  });
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
  date.innerHTML = review.date;
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

  const ul = document.getElementById('reviews-list');
  reviews.forEach((review) => {
    ul.appendChild(createReviewHTML(review));
  });
  container.appendChild(ul);

  if (!reviews) {
    const noReviews = document.createElement('p');
    noReviews.innerHTML = 'No reviews yet!';
    container.appendChild(noReviews);
    return;
  }
};

/**
 * Get reviews data of single restaurant.
 */
const getSingleRestReviews = (idRest) => {
  return new Promise((resolve, reject) => {
    fetch(DBHelper.REVIEWS_URL + "?restaurant_id=" + idRest)
      .then(res => res.json())
      .then(jsonRes => {
        reviewsData = [];
        jsonRes.forEach(elem => {
          let revObj = DBHelper.getObjectReview(elem.id, elem.name, elem.comments, new Date(elem.createdAt), elem.rating, elem.restaurant_id);
          reviewsData.push(revObj);
        })
        resolve(reviewsData);
      })
      .catch(e => {
        reject(Error("Error on fetch review function. " + e));
      })
  })
}

function addToFavorites(idRes) {
  if (navigator.onLine) {
    let fetchReviewsOption = {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      }
    }

    fetch(DBHelper.getFavoritePutUrl(idRes), fetchReviewsOption)
      .then(response => response.json())
      .then(jsonData => {
        DBHelper.openDatabase().then(function (db) {
          let storeReadWrite = DBHelper.getObjectStore(DBHelper.FAV_REST, 'readwrite', db);
          storeReadWrite.put({
            id: idRes
          });
        });
      }).then(location.reload())
      .catch(e => {
        console.log("Error on the review POST function. " + e)
      })
  }
}

function submitReview() {
  let reviewForm = document.getElementById("review-form");
  let reviewFormErr = document.getElementById("reviews-form-error");

  let idRestaurant = getParameterByName('id');
  const revName = reviewForm.elements.namedItem("name").value;
  const revRating = reviewForm.elements.namedItem("rating").value;
  const revComments = reviewForm.elements.namedItem("comment").value;

  if (!revName || !revRating || !revComments) {
    reviewFormErr.textContent = "Error! Check Fields!";
  } else {
    reviewFormErr.textContent = "";
    reviewForm.reset();

    if (navigator.onLine) {
      let fetchReviewsOption = {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          "restaurant_id": idRestaurant,
          "name": revName,
          "rating": revRating,
          "comments": revComments
        })
      }

      fetch(DBHelper.REVIEWS_URL, fetchReviewsOption)
        .then(response => response.json())
        .then(jsonData => {
          DBHelper.openDatabase().then(function (db) {
            let storeReadWrite = DBHelper.getObjectStore(DBHelper.ONLINE_REVIEWS, 'readwrite', db);
            let objectRev = DBHelper.getObjectReview(jsonData.id, revName, revComments, new Date(jsonData.createdAt), revRating, idRestaurant);

            storeReadWrite.put(objectRev);
          }).then(location.reload());
        })
        .catch(e => {
          console.log("Error on the review POST function. " + e)
        })
    } else {
      DBHelper.openDatabase().then(function (db) {
        let storeReadWrite = DBHelper.getObjectStore(DBHelper.OFFLINE_REVIEWS, 'readwrite', db);

        storeReadWrite.count().then(numRows => {
          let objectRev = DBHelper.getObjectReview(numRows, revName, revComments, new Date(), revRating, idRestaurant);
          storeReadWrite.put(objectRev);
        });
      }).then(location.reload());
    }
  }
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
