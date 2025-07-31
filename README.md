#   Stock Dashboard – Dockerized Deployment



A simple **stock dashboard** built with **HTML, CSS, and JavaScript**, bundled using **Vite**, and containerized with **Docker**. The app is served via **Nginx**, with **HAProxy** managing **load balancing** across multiple instances.

API Credit : https://www.alphavantage.co/

API Documentation : https://www.alphavantage.co/documentation/

Video Link : https://www.awesomescreenshot.com/video/42610825?key=736ee1acb8762c360291daeb1e716d62

---

##  Tech Stack

* **Frontend**: HTML, CSS, JavaScript
* **Build Tool**: Vite
* **Containerization**: Docker
* **Web Server**: Nginx
* **Load Balancer**: HAProxy

---

##  Project Structure

```
.
├── dist/                   # Vite build output (auto-generated)
├── node_modules/           # Node dependencies
├── .gitignore              # Ignored files for git
├── Dockerfile              # Multi-stage Dockerfile for building and serving
├── README.md               # This documentation file
├── haproxy.cfg             # HAProxy config for load balancing
├── index.html              # Main HTML page
├── nginx.conf              # Nginx server config
├── package.json            # Project metadata and scripts
├── package-lock.json       # Locked versions of dependencies
├── script.js               # JavaScript logic for the dashboard
├── style.css               # Styling for the dashboard
├── vite.config.mjs         # Vite configuration
```

---

##  Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/SamuelNkpado/Stock_Summative.git
cd Stock_Summative
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Build with Vite

```bash
npm run build
```

This generates the `dist/` folder with production-ready files.

---

##  Docker Setup

### 4. Dockerfile (Multi-Stage)

```Dockerfile
# Stage 1: Build the Vite app
FROM node:18 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
```

### 5. Build Docker Image

```bash
docker build -t samuelchima/stock-dashbord:v1 .
```

### 6. Push to Docker Hub

```bash
docker login
docker push samuelchima/stock-dashbord:v1
```

---

##  Networking & Load Balancing

### 7. Create Docker Network

```bash
docker network create stockDash
```

### 8. Run Two Instances of the App

```bash
docker run -d --name web-01-app --network stockDash -p 8081:8080 samuelchima/stock-dashbord:v1
docker run -d --name web-02-app --network stockDash -p 8082:8080 samuelchima/stock-dashbord:v1
```

### 9. HAProxy Configuration (`haproxy.cfg`)

```haproxy
global
    daemon
    maxconn 256

defaults
    mode http
    timeout connect 5000ms
    timeout client 50000ms
    timeout server 50000ms

frontend http_front
    bind *:80
    default_backend http_back

backend http_back
    balance roundrobin
    server web1 web-01-app:8080 check
    server web2 web-02-app:8080 check
    http-response set-header X-Backend %s
```

### 10. Run HAProxy Load Balancer

```bash
docker run -d --name lb-01 --network stockDash -p 80:80 \
  -v "$(pwd)/haproxy.cfg:/usr/local/etc/haproxy/haproxy.cfg:ro" \
  haproxy:latest
```

---

##  Test the App

### Access the Load Balanced App

Open in your browser:

```
http://localhost
```

Or use `curl` to inspect the backend being served:

```bash
curl -v http://localhost | grep -o "X-Backend:.*"
```

---

##  Challenges Faced & Fixes

1. **Network Misconfiguration**

   * Issue: Containers weren’t properly connected.
   * Fix: Removed containers, deleted the old network, and rebuilt everything cleanly.

2. **HAProxy Load Balancing Debugging**

   * Issue: Load balancing wasn’t working properly.
   * Fix: Reviewed and corrected the `haproxy.cfg` file.

3. **Git Token Expiry**

   * Issue: Git push failed due to expired personal access token.
   * Fix: Generated a new token and updated credentials.

### Helpful Cleanup Commands

```bash
docker stop web-01-app web-02-app lb-01
docker rm web-01-app web-02-app lb-01
docker network rm stockDash
docker rmi samuelchima/stock-dashbord:v1
```

---

##  Pull from Docker Hub 

```bash
docker pull samuelchima/stock-dashbord:v1
docker run -p 8083:8080 samuelchima/stock-dashbord:v1
```

Here's the updated snippet you can add to your `README.md` to show that your load balancer switches between both backends (`web1` and `web2`):

---

###  Load Balancer Testing Evidence

To verify that the HAProxy load balancer distributes traffic correctly to the backend servers, I ran the following `curl` command multiple times and checked the `X-Backend` response header:

```bash
curl -v http://localhost | grep -o "X-Backend:.*"
```

####  Response from `web1`:

```bash
< HTTP/1.1 200 OK
< server: nginx/1.29.0
< x-backend: web1
X-Backend: web1
```

#### Response from `web2`:

```bash
< HTTP/1.1 200 OK
< server: nginx/1.29.0
< x-backend: web2
X-Backend: web2
```

These outputs confirm that the load balancer is functioning correctly and alternating requests between the backend servers (`web1` and `web2`) using round-robin load balancing.

---
Thanks.



