# Mobile Web Specialist Certification Course
---
#### _Three Stage Course Material Project - Restaurant Reviews_

## Project Overview: Stage 1

For the **Restaurant Reviews** projects, you will incrementally convert a static webpage to a mobile-ready web application. In **Stage One**, you will take a static design that lacks accessibility and convert the design to be responsive on different sized displays and accessible for screen reader use. You will also add a service worker to begin the process of creating a seamless offline experience for your users.

### Specification

You have been provided the code for a restaurant reviews website. The code has a lot of issues. It’s barely usable on a desktop browser, much less a mobile device. It also doesn’t include any standard accessibility features, and it doesn’t work offline at all. Your job is to update the code to resolve these issues while still maintaining the included functionality.

### Getting Started

****Get a Google-Maps key and paste it on index.html and restaurant.html****
```
 <script async defer src="https://maps.googleapis.com/maps/api/YOUR_GOOGLE_MAP_API_KEY&libraries=places&callback=initMap"></script>
```

****Testing Mode****
Go to your project folder and open a cmd (make sure you have python installed). To run a server paste:
```
py -m http.server 8000
```
them simple open a browser and type http://localhost:8000/.