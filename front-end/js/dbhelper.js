const MAIN_STORE = "restaurants";
const PORT = 1337 // Change this to your server port

/**
 * Common database helper functions.
 */
class DBHelper {

 /**
 * Database URL.
 * Change this to restaurants.json file location on your server.
 */
  static get DATABASE_URL() {
    return `http://localhost:${PORT}/restaurants`;
  }

  /**
   * Reviews URL.
   */
  static get REVIEWS_URL() {
    return `http://localhost:${PORT}/reviews`;
  }

  /**
   * Online reviews DB reference.
   */
  static get ONLINE_REVIEWS() {
    return "reviews";
  }

  /**
   * Offline reviews DB reference.
   */
  static get OFFLINE_REVIEWS() {
    return "offlineReviews";
  }

  /**
   * Favorite restaurant DB reference.
   */
  static get FAV_REST() {
    return "favRestaurants";
  }

  /**
   * Add restaurant to favorites URL.
   */
  static getFavoritePutUrl(idRestaurant) {
    return `http://localhost:${PORT}/restaurants/${idRestaurant}/?is_favorite=true`;
  }

  /**
   * Open database for write.
   */
  static openDatabase() {
    let store;
    let offReviews;

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

          offReviews = upgradeDb.createObjectStore('offlineReviews', {
            keyPath: 'id'
          });

          upgradeDb.createObjectStore('favRestaurants', {
            keyPath: 'id'
          });

          offReviews.createIndex('restaurant_id', 'restaurant_id', { unique: false });
          store.createIndex('restaurant_id', 'restaurant_id', { unique: false });
        default:
          break;
      }
    })
  }

  static getObjectStore(osName, connType, mainDb) {
    var tx = mainDb.transaction(osName, connType);
    var store = tx.objectStore(osName);
    return store;
  }

  static getObjectReview(idRev, nameRev, commRev, dateRev, rateRev, restIdRev) {
    var objReview = {};

    objReview.id = parseInt(idRev);
    objReview.comments = commRev;
    objReview.date = dateRev;
    objReview.name = nameRev;
    objReview.rating = parseInt(rateRev);
    objReview.restaurant_id = parseInt(restIdRev);

    return objReview;
  }

  /**
   * Fetch all restaurants.
   */
  static fetchRestaurants(callback) {
    DBHelper.openDatabase().then(function (db) {
      var storeObj = DBHelper.getObjectStore(MAIN_STORE, 'readonly', db);

      storeObj.getAll().then(idbData => {
        if (idbData && idbData.length > 0) {
          // JSON data are already present in IDB
          callback(null, idbData);
        } else {
          // JSON data are not put in IDB, so I do it now
          let xhr = new XMLHttpRequest();
          xhr.open('GET', DBHelper.DATABASE_URL);
          xhr.onload = () => {
            if (xhr.status === 200) { // Got a success response from server!
              var storeRw = DBHelper.getObjectStore(MAIN_STORE, 'readwrite', db);

              const jsonData = JSON.parse(xhr.responseText);

              jsonData.forEach(jsonElement => {
                // Put every data of the JSON in the IDB
                storeRw.put(jsonElement);
              });

              storeRw.getAll().then(idbData => {
                // Get the data from the IDB now
                callback(null, idbData);
              })

            } else { // Oops!. Got an error from server.
              const error = (`Request failed. Returned status of ${xhr.status}`);
              callback(error, null);
            }
          };
          xhr.send();
        }
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
