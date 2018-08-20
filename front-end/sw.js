self.importScripts("js/dbhelper.js");
self.importScripts("js/idb.js");

let staticCacheName = 'mws-restaurant-cache-v6';
let urlsToCache = [
    '/',
    '/index.html',
    '/css/styles.css',
    '/js/dbhelper.js',
    '/js/idb.js',
    '/js/main.js',
    '/js/restaurant_info.js',
    '/img/1.jpg',
    '/img/2.jpg',
    '/img/3.jpg',
    '/img/4.jpg',
    '/img/5.jpg',
    '/img/6.jpg',
    '/img/7.jpg',
    '/img/8.jpg',
    '/img/9.jpg',
    '/img/10.jpg',
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(staticCacheName).then(cache => {
            console.log('Caching...');
            return cache.addAll(urlsToCache);
        }).catch(error => console.error("Install Error:", error))
    );
});

self.addEventListener("activate", event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.filter(cacheName => cacheName.startsWith("mws-restaurant") &&
                    !staticCacheName.includes(cacheName))
                    .map(cacheName => caches.delete(cacheName))
            );
        }).catch(error => console.error("Activate Error:", error))
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.open(staticCacheName).then(cache => {
            return cache.match(event.request).then(response => {
                return response || fetch(event.request).then(response => {
                    cache.put(event.request, response.clone());
                    return response;
                });
            });
        })
    );
});

self.addEventListener('sync', function (event) {
    if (event.tag == 'offlineSync') {
        event.waitUntil(offlineReviewsDispatch());
    }
});

function offlineReviewsDispatch() {
    if (navigator.onLine) {
        DBHelper.openDatabase().then(function (db) {
            let storeReadOnly = DBHelper.getObjectStore(DBHelper.OFFLINE_REVIEWS, 'readonly', db);

            storeReadOnly.count().then(numRows => {
                if (numRows > 0) {
                    storeReadOnly.getAll().then(idbData => {
                        for (let idx in idbData) {
                            let fetchReviewsOption = {
                                method: "POST",
                                headers: {
                                    "Content-Type": "application/json"
                                },
                                body: JSON.stringify({
                                    "restaurant_id": idbData[idx].restaurant_id,
                                    "name": idbData[idx].name,
                                    "rating": idbData[idx].rating,
                                    "comments": idbData[idx].comments
                                })
                            }

                            fetch(DBHelper.REVIEWS_URL, fetchReviewsOption)
                                .then(response => response.json())
                                .then(jsonData => {
                                    DBHelper.openDatabase().then(function (db) {
                                        let mainStoreReadWrite = DBHelper.getObjectStore(DBHelper.ONLINE_REVIEWS, 'readwrite', db);
                                        let objectRev = DBHelper.getObjectReview(jsonData.id, jsonData.name, jsonData.comments, new Date(jsonData.createdAt), jsonData.rating, jsonData.restaurant_id);

                                        mainStoreReadWrite.put(objectRev);
                                    });
                                })
                                .catch(e => {
                                    console.log("Error on the review POST function. " + e)
                                })
                        }
                    })
                }
            });
        })
            .then(() => {
                DBHelper.openDatabase().then(function (db) {
                    // Delete data from offline os when I'm online and I've done the POST request
                    let deleteStoreReadWrite = DBHelper.getObjectStore(DBHelper.OFFLINE_REVIEWS, 'readwrite', db);
                    deleteStoreReadWrite.clear();
                });
            });
    }
}

