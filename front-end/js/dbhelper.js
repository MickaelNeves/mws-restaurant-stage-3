/**
 * Common database helper functions.
 */
class DBHelper {

 /**
 * Database URL.
 * Change this to restaurants.json file location on your server.
 */
  static get DATABASE_URL() {
    const port = 1337 // Change this to your server port
    return `http://localhost:${port}/restaurants`;
  }

  /**
   * Open database for write.
   */
  static openDatabase() {
    let store;

    if (!window.indexedDB) {
      window.alert("Your browser doesn't support a stable version of IndexedDB. Such and such feature will not be available.");
      return;
    }

    return idb.open('mws-restaurant', 1, function (upgradeDb) {
      switch (upgradeDb.oldVersion) {
        case 0:
          store = upgradeDb.createObjectStore('restaurants', {
            keyPath: 'id'
          });
          store.createIndex('by-date', 'createdAt');

        case 1:
          store = upgradeDb.createObjectStore('reviews', {
            keyPath: 'id'
          });
          store.createIndex('by-date', 'createdAt');
      }
    })
  }

  /**
   * Add a new review to database.
   */
  static addNewReview(reviewData) {
    const data = {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(reviewData)
    };

    return fetch(`http://localhost:1337/reviews/`, data).then((res) => {
      return res.json();
    }).catch((error) => {
      console.log('error:', error);
      return error;
    }).then((review) => {
      console.log(review);
      return review;
    });
  }

  /**
   * Add a favorite restaurant to database.
   */
  static favoriteRestaurant(id, favoriteData) {
    const data = {
      method: 'PUT',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    };

    return fetch(`http://localhost:1337/restaurants/${id}/?is_favorite=${favoriteData.is_favorite}`, data).then((res) => {
      return res.json();
    }).catch((error) => {
      console.log('error:', error);
      return error;
    }).then((favorite) => {
      console.log(favorite);
      return favorite;
    });
  };

  /**
   * Fetch all restaurant reviews from database.
   */
  static getAllReviewsForRestaurant(rest_id) {
    const data = {
      method: 'GET'
    };

    return fetch(`http://localhost:1337/reviews/?restaurant_id=${rest_id}`, data).then((res) => {
      return res.json();
    });
  }

  /**
   * Fetch all stored restaurants from database.
   */
  static getStoredRestaurants() {
    const idbPromise = DBHelper.openDatabase();

    return idbPromise.then((db) => {
      if (!db) {
        return;
      }
      let tx = db.transaction('restaurants');
      let store = tx.objectStore('restaurants').index('by-date');

      return store.getAll();
    });
  }

  /**
   * Fetch all stored reviews from database.
   */
  static getStoredReviews() {
    const idbPromise = DBHelper.openDatabase();

    return idbPromise.then((db) => {
      if (!db) {
        return;
      }
      let tx = db.transaction('reviews');
      let store = tx.objectStore('reviews').index('by-date');
      db.close();

      return store.getAll();
    })

  }

  /**
   * Save reviews in database.
   */
  static saveReviewsInDatabase(reviews) {
    const idbPromise = DBHelper.openDatabase();
    idbPromise.then(function (db) {
      if (!db) return;

      let tx = db.transaction('reviews', 'readwrite');
      let store = tx.objectStore('reviews');
      reviews.forEach(function (review) {
        store.put(review);
      });
      store.index('by-date').openCursor(null, "prev").then(function (cursor) {
        return cursor.advance(30);
      }).then(function deleteReview(cursor) {
        if (!cursor) return;
        cursor.delete();
        return cursor.continue().then(deleteReview);
      });
    });
  };

  /**
   * Save restaurants in database.
   */
  static saveRestaurantsInDatabase(restaurants) {
    const idbPromise = DBHelper.openDatabase();
    idbPromise.then(function (db) {
      if (!db) return;

      let tx = db.transaction('restaurants', 'readwrite');
      let store = tx.objectStore('restaurants');
      restaurants.forEach(function (restaurant) {
        store.put(restaurant);
      });
      store.index('by-date').openCursor(null, "prev").then(function (cursor) {
        return cursor.advance(30);
      }).then(function deleteRest(cursor) {
        if (!cursor) return;
        cursor.delete();
        return cursor.continue().then(deleteRest);
      });
    });
  };

  /**
   * Fetch all restaurants.
   */
  static fetchRestaurants(callback) {
    DBHelper.getStoredRestaurants().then((restaurants) => {
      if (restaurants.length) {
        return callback(null, restaurants);
      }

      fetch(this.DATABASE_URL, { method: 'GET' }).then((res) => {
        return res.json();
      }).catch((error) => {
        console.error('error:', error);
      }).then((restaurants) => {
        DBHelper.saveRestaurantsInDatabase(restaurants);

        return callback(null, restaurants);
      });
    });
  }

  /**
   * Fetch a restaurant by its ID.
   */
  static fetchRestaurantById(id, callback) {
    // fetch all restaurants with proper error handling.
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        const restaurant = restaurants.find(r => r.id == id);
        if (restaurant) { // Got the restaurant
          callback(null, restaurant);
        } else { // Restaurant does not exist in the database
          callback('Restaurant does not exist', null);
        }
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine type with proper error handling.
   */
  static fetchRestaurantByCuisine(cuisine, callback) {
    // Fetch all restaurants  with proper error handling
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given cuisine type
        const results = restaurants.filter(r => r.cuisine_type == cuisine);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a neighborhood with proper error handling.
   */
  static fetchRestaurantByNeighborhood(neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given neighborhood
        const results = restaurants.filter(r => r.neighborhood == neighborhood);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   */
  static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        let results = restaurants
        if (cuisine != 'all') { // filter by cuisine
          results = results.filter(r => r.cuisine_type == cuisine);
        }
        if (neighborhood != 'all') { // filter by neighborhood
          results = results.filter(r => r.neighborhood == neighborhood);
        }
        callback(null, results);
      }
    });
  }

  /**
   * Fetch all neighborhoods with proper error handling.
   */
  static fetchNeighborhoods(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all neighborhoods from all restaurants
        const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood)
        // Remove duplicates from neighborhoods
        const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i)
        callback(null, uniqueNeighborhoods);
      }
    });
  }

  /**
   * Fetch all cuisines with proper error handling.
   */
  static fetchCuisines(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all cuisines from all restaurants
        const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type)
        // Remove duplicates from cuisines
        const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i)
        callback(null, uniqueCuisines);
      }
    });
  }

  /**
   * Restaurant page URL.
   */
  static urlForRestaurant(restaurant) {
    return (`./restaurant.html?id=${restaurant.id}`);
  }

  /**
   * Restaurant image URL.
   */
  static imageUrlForRestaurant(restaurant) {
    return (`/img/${restaurant.photograph}-small.jpg`);
  }

  /**
   * Map marker for a restaurant.
   */
  static mapMarkerForRestaurant(restaurant, map) {
    const marker = new google.maps.Marker({
      position: restaurant.latlng,
      title: restaurant.name,
      url: DBHelper.urlForRestaurant(restaurant),
      map: map,
      animation: google.maps.Animation.DROP}
    );
    return marker;
  }

}
